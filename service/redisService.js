const redis = require("../db/redis");
const config = require("../config");
const db = require("../db/mysql"); // 统一连接池
const fs = require("fs");
const path = require("path");
const { send } = require("./mqService");
const { v4: uuidv4 } = require("uuid");

// 加载 Lua 原子脚本（秒杀核心：不超卖 + 防重复购买）
const luaScript = fs.readFileSync(
  path.join(__dirname, "../lua/seckill.lua"),
  "utf8",
);

// 重试等待
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 发失败会自动重试 3 次，保证消息必达
async function sendWithRetry(queue, data, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const ok = await send(queue, data, options);
      if (ok) return true;
    } catch (err) {}
    await sleep(500 * (i + 1));
  }
  return false;
}

// 秒杀主逻辑
async function doSeckill(userId, productId) {
  const stockKey = config.redisKey.stock(productId);
  const userKey = config.redisKey.user(productId);

  const orderId = uuidv4();
  // 缓存击穿保护 + MySQL 懒加载库存
  let stock = await redis.get(stockKey);

  if (stock === null) {
    console.log("Redis 无库存，从 MySQL 加载");
    if (stock === null) {
      console.log("Redis 无库存，从 MySQL 加载");
      // 不加锁，直接加载（高并发也安全）
      const [rows] = await db.query("SELECT stock FROM products WHERE id = ?", [
        productId,
      ]);
      if (!rows || rows.length === 0) return "商品不存在";
      stock = rows[0].stock;
      await redis.set(stockKey, stock);
      console.log(`库存加载完成 productId=${productId} stock=${stock}`);
    }
  }

  //  Lua 原子扣减（高并发安全）
  const result = await redis.eval(luaScript, 2, stockKey, userKey, userId);

  if (result === -1) return "商品已抢完";
  if (result === -2) return "您已抢购过，不能重复购买";

  // 3. 发送订单消息 + 延迟取消消息（带重试补偿）
  try {
    const orderData = { orderId, userId, productId };
    // 订单队列（自动重试 3 次）
    const sendOk = await sendWithRetry(config.mq.queue, orderData);
    if (!sendOk) throw new Error("订单消息发送失败");

    // 延迟队列：30分钟未支付自动取消（自动重试）
    const delayOk = await sendWithRetry(
      config.mq.delay,
      orderData,
      { expiration: 30 * 60 * 1000 }, // 30分钟
    );
    if (!delayOk) throw new Error("延迟队列消息发送失败");
  } catch (err) {
    console.error("MQ发送失败 → 执行库存回滚补偿", err);

    // 最关键：回滚 Redis 库存 + 清除购买记录
    await redis.incr(stockKey);
    await redis.srem(userKey, userId);

    return "系统繁忙，请稍后重试";
  }

  return "抢购成功，订单处理中";
}

module.exports = { doSeckill };
