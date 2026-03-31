const amqp = require("amqplib");
const { createOrder } = require("../service/orderService");
const redis = require("../db/redis"); // 引入Redis
const db = require("../db/mysql"); // 引入MySQL连接池
const config = require("../config");
// 全局保存连接，方便重连
let connection = null;
let channel = null;

// 自动重连消费者
async function start() {
  try {
    // 1. 创建MQ连接 + 心跳防止断开
    connection = await amqp.connect({
      hostname: config.mq.hostname,
      port: config.mq.port,
      username: config.mq.username,
      password: config.mq.password,
      heartbeat: config.mq.heartbeat, // 客户端和 RabbitMQ 每 60 秒互相“打个招呼”，
      connectTimeout: config.mq.connectTimeout, // 连接 RabbitMQ 最多等 10 秒，超时就直接失败
    });

    // 连接错误监听
    connection.on("error", (err) => {
      if (err.message !== "Connection closing") {
        console.error("RabbitMQ 连接错误:", err);
      }
    });

    // 连接关闭 → 5秒后自动重连
    connection.on("close", () => {
      console.log("RabbitMQ 断开，5秒后自动重连...");
      setTimeout(start, 5000);
    });

    channel = await connection.createChannel();
    // 每次只拿1条消息，防止内存爆炸
    await channel.prefetch(1);
    // 【队列1】正常创建订单
    channel.consume(config.mq.queue, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const msgId = msg.properties.messageId;

        // 消息幂等去重（防重复）
        const exists = await redis.get(`msg:${msgId}`);
        if (exists) {
          console.log("重复订单消息，已忽略");
          channel.ack(msg);
          return;
        }

        // 执行创建订单
        await createOrder(data);

        // 标记消息已消费
        await redis.set(`msg:${msgId}`, "1", "EX", 86400);

        // 确认消息 → MQ删除
        channel.ack(msg);
      } catch (err) {
        console.error("创建订单失败：", err);
        channel.nack(msg, false, false); // 失败不重试
      }
    });

    // 【队列2】30分钟超时未支付 → 取消订单 + 回滚库存
    channel.consume(config.mq.cancel, async (msg) => {
      const { orderId, productId, userId } = JSON.parse(msg.content.toString());
      console.log("订单取消消息：", orderId, productId, userId);
      const conn = await db.getConnection();

      try {
        await conn.beginTransaction();

        // 查询订单状态，确保只处理未支付订单
        const [rows] = await conn.query(
          "SELECT status FROM orders WHERE orderId=?",
          [orderId],
        );

        if (!rows.length || rows[0].status !== 0) {
          channel.ack(msg);
          return;
        }

        // 更新订单状态为已取消
        await conn.query("UPDATE orders SET status=2 WHERE orderId=?", [
          orderId,
        ]);

        // 回滚 MySQL 库存
        await conn.query("UPDATE products SET stock = stock + 1 WHERE id=?", [
          productId,
        ]);

        await conn.commit();

        // Redis 补偿
        await redis.incr(`stock:${productId}`);
        await redis.srem(`seckill:users:${productId}`, userId);

        channel.ack(msg);
      } catch (err) {
        await conn.rollback();
        channel.nack(msg, false, false);
      } finally {
        conn.release();
      }
    });
  } catch (err) {
    console.error("启动消费者失败，5秒后重试...", err);
    setTimeout(start, 5000);
  }
}

start();
