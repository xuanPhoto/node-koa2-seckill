const amqp = require("amqplib");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
// 全局唯一信道
let channel = null;

// 初始化 RabbitMQ（自动重连 + 心跳 + 持久化 + 延迟队列）
async function initMQ() {
  try {
    console.log("正在连接 RabbitMQ...");

    // 创建连接 + 心跳防止空闲断开
    const conn = await amqp.connect({
      hostname: config.mq.hostname,
      port: config.mq.port,
      username: config.mq.username,
      password: config.mq.password,
      heartbeat: config.mq.heartbeat, // 客户端和 RabbitMQ 每 60 秒互相“打个招呼”，
      connectTimeout: config.mq.connectTimeout, // 连接 RabbitMQ 最多等 10 秒，超时就直接失败
    });

    // 连接错误监听
    conn.on("error", (err) => {
      if (err.message !== "Connection closing") {
        console.error("RabbitMQ 连接错误：", err);
      }
    });

    // 连接关闭 → 自动重连
    conn.on("close", () => {
      console.log("RabbitMQ 断开，5秒后自动重连...");
      channel = null;
      setTimeout(initMQ, 5000);
    });

    // 创建【confirm确认信道】
    channel = await conn.createConfirmChannel();

    // 声明队列
    await channel.assertQueue(config.mq.queue, { durable: true });

    // 延迟队列（死信队列 → 30分钟超时取消订单）
    await channel.assertQueue(config.mq.delay, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": config.mq.cancel,
      },
    });

    // 超时取消队列
    await channel.assertQueue(config.mq.cancel, { durable: true });

    console.log(" RabbitMQ 生产者初始化完成（可靠confirm模式）");
  } catch (err) {
    console.error(" RabbitMQ 初始化失败，5秒后重试...", err);
    setTimeout(initMQ, 5000);
  }
}

// 发送消息（带confirm确认 + UUID消息ID + 持久化 + 可靠Promise）
async function send(queue, data, options = {}) {
  // 信道未就绪
  if (!channel) {
    console.error(" MQ信道未准备好，消息发送失败");
    return false;
  }

  try {
    const msgId = uuidv4(); // 唯一消息ID（用于幂等去重）

    // 【可靠发送】带确认机制的发送
    return new Promise((resolve) => {
      channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(data)),
        {
          persistent: true, // 消息持久化
          messageId: msgId, // 唯一ID，防重复消费
          ...options,
        },
        (err) => {
          if (err) {
            console.error(" MQ消息发送失败：", err);
            return resolve(false);
          }
          resolve(true); // 消息发送并确认成功
        },
      );
    });
  } catch (err) {
    console.error(" 发送消息异常：", err);
    return false;
  }
}

module.exports = { initMQ, send };
