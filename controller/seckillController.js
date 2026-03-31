const { doSeckill } = require("../service/redisService");
const limit = require("../utils/limiter");

// 秒杀接口控制器
async function seckill(ctx) {
  // 获取前端传的 userId 和 productId
  const { userId, productId } = ctx.request.body;

  // 限流：1秒内最多允许 100 次请求 （因为这里整个项目共用一个限流，实际这里只有抢单模块，实际按用户限流 / 按商品限流）
  const ok = await limit("req:limit", 100);
  // const ok = await limit(`limit:${productId}`, 200); // 按商品限流
  // 限流触发
  if (!ok) {
    ctx.body = "请求过多";
    return;
  }

  // 执行秒杀逻辑
  ctx.body = await doSeckill(userId, productId);
}

module.exports = { seckill };
