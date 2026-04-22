module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.log.error({ err });

    ctx.status = err.status || 500;
    ctx.body = {
      message: "服务器错误",
      traceId: ctx.state.traceId,
    };
  }
};
