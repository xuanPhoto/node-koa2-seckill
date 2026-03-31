const logger = require("../utils/logger");

module.exports = async (ctx, next) => {
  const traceId = ctx.state.traceId;

  // 创建每个请求独立 logger，自动带 traceId
  ctx.log = logger.child({ traceId });

  await next();
};
