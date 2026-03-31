// 加载环境变量 .env 文件
require("dotenv").config();

// 统一导出所有配置
module.exports = {
  port: process.env.PORT || 3000, // 服务端口

  // MySQL 配置
  mysql: {
    host: process.env.MYSQL_HOST, // 地址
    user: process.env.MYSQL_USER, // 用户名
    password: process.env.MYSQL_PASSWORD, // 密码
    database: process.env.MYSQL_DB, // 数据库名
    waitForConnections: true, //当无连接池可用时，等待（true）还是抛错（false）
    connectionLimit: 200, //连接数限制
    queueLimit: 0, //最大连接等待数（0为不限制）
  },

  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },

  // RabbitMQ 配置
  mq: {
    hostname: process.env.RABBITMQ_HOST,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASSWORD,
    heartbeat: process.env.RABBITMQ_HEARTBEAT, // 客户端和 RabbitMQ 每 60 秒互相“打个招呼”，
    connectTimeout: process.env.RABBITMQ_CONNECTtIMEOUT, // 连接 RabbitMQ 最多等 10 秒，超时就直接失败
    queue: "order_queue", // 核心队列 作用：真正创建订单
    delay: "order_delay_queue", // 延迟队列队 作用：定时炸弹（延迟30分钟）
    cancel: "order_cancel_queue", // 取消队列 作用：真正执行“取消订单”
  },

  // Redis Key 统一管理
  redisKey: {
    stock: (productId) => `stock:${productId}`, // 商品库存 key
    user: (productId) => `seckill:users:${productId}`, // 已购买用户 set key
  },
};
