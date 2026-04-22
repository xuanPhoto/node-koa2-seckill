const Koa = require("koa");

const bodyParser = require("koa-bodyparser");
const pinoLogger = require("koa-pino-logger");

const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const traceId = require("./middleware/traceId");
const requestLogger = require("./middleware/requestLogger");

const router = require("./router");
const { initMQ } = require("./service/mqService");
const initAllStock = require("./initStock");
const config = require("./config");
const app = new Koa();

app.use(bodyParser());

// 全局错误捕获
app.use(errorHandler);

// traceId
app.use(traceId);

// Koa-pino-logger 打印请求信息
app.use(
  pinoLogger({
    logger,
  }),
);

// 每请求独立 logger
app.use(requestLogger);

app.use(router.routes());

async function start() {
  await initMQ();
  // 初始化库存
  await initAllStock();
  app.listen(config.port, () => {
    logger.info(`服务启动：http://localhost:${config.port}`);
  });
}

start();
