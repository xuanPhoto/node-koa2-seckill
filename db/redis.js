// 引入 ioredis 客户端（性能比 redis 包更好）
const Redis = require("ioredis");
const config = require("../config");
// 创建 Redis 连接实例
const redis = new Redis({
  ...config.redis,
  // 重连策略
  retryStrategy(times) {
    // 重试时间 = 次数 * 50ms，但最大不超过 2000ms（2秒）
    // 不会疯狂重连，不会打崩 Redis
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3, // 最大请求重试
  enableReadyCheck: true, // 启动检查
  connectTimeout: 10000, // 连接超时
});

// 连接成功事件
redis.on("connect", () => {
  console.log("Redis 连接成功");
});

// 连接错误事件
redis.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = redis;
