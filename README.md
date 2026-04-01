# node-koa2-seckill

##### 介绍

高并发秒杀系统 `Koa2` `Redis` `Lua` `RabbitMQ` `MySQL` `Pino`

解决：超卖、重复下单、并发崩溃、库存恶意占用、超时未支付自动取消。

> ###### 亮点

1.  Redis + Lua 原子秒杀，高并发不超卖
2.  RabbitMQ 死信队列实现订单超时自动取消
3.  异步削峰，保证秒杀接口高性能
4.  全链路自动重连，生产环境稳定
5.  防重复抢购 + 防重复下单 + 防超卖
6.  异常自动回滚，数据强一致
7.  PM2 多进程安全
8.  日志切割：每天一个文件，保留 7 天/错误日志单独文件/traceId 自动生成/前端透传

##### 启动

1.  npm i
2.  npm run dev 运行
3.  npm run worker 运行MQ消费者
4.  pm2 start ecosystem.config.js 生产启动

##### 使用

1.  需要开启redis、RabbitMQ
2.  可以观察products表中值和redis中stock:1的库存值
3.  env配置需要更改成你本地数据库
4.  数据库SQL创建两个表（库存、订单）

```
        CREATE TABLE products (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100),
          stock INT NOT NULL
        );

        INSERT INTO products (name, stock) VALUES ('iPhone 15', 10);
        INSERT INTO products (name, stock) VALUES ('夹克', 6);

        CREATE TABLE orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          orderId CHAR(36) NOT NULL UNIQUE,
          user_id INT,
          product_id INT,
          status TINYINT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
```

5.  POST: http://localhost:3000/seckill

```
            {
                "userId":56,
                "productId":1
            }
```

##### 流程

```
前端请求
  ↓
接口限流
  ↓
Redis + Lua 原子扣库存（原子、超高并发）
  ↓
发送订单消息 + 发送延迟取消消息
  ↓
【接口立即返回：抢购成功】
  ↓（异步后台执行）
MQ消费者异步创建订单（MySQL）
  ↓
30分钟未支付
  ↓
延迟队列触发 → 取消订单 + 回滚库存
```
