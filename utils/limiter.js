const redis = require("../db/redis");

async function limit(key, max, expire = 1) {
  try {
    // 自增计数
    const count = await redis.incr(key);

    // 第一次设置过期时间
    if (count === 1) {
      await redis.expire(key, expire);
    }

    // 返回是否超过限制
    return count <= max;
  } catch (err) {
    // Redis 挂了也不崩，默认放行（或根据业务选择拦截）
    console.error("限流模块异常:", err);
    return true;
  }
}

module.exports = limit;
