const pino = require("pino");
const path = require("path");
const fs = require("fs");
const rfs = require("rotating-file-stream");

const isDev = process.env.NODE_ENV !== "production";

// 日志目录
const logDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 按天切割流
const createStream = (filename) => {
  return rfs.createStream(filename, {
    interval: "1d", // 每天切割
    path: logDir,
    maxFiles: 7, // 保留7天
    compress: "gzip", // 自动压缩旧日志
  });
};

// 多流配置
const streams = [
  { stream: createStream("app.log") },
  {
    level: "error",
    stream: createStream("error.log"),
  },
];

// 开发环境彩色输出
isDev
  ? {
      target: "pino-pretty",
      options: { colorize: true },
    }
  : undefined;

const logger = pino(
  {
    level: isDev ? "debug" : "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    ...streams,
    ...(isDev ? [{ stream: process.stdout }] : []),
  ]),
);

module.exports = logger;
