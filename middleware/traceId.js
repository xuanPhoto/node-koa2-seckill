const { v4: uuidv4 } = require("uuid");

module.exports = async (ctx, next) => {
  // 前端传入 x-request-id 优先
  let traceId = ctx.request.headers["x-request-id"];

  if (!traceId) {
    traceId = uuidv4();
  }

  ctx.state.traceId = traceId;
  ctx.set("x-request-id", traceId);

  await next();
};
