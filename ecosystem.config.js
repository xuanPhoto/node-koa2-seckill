module.exports = {
  apps: [
    {
      name: "node-koa2-seckill",
      script: "./app.js",
      instances: "max", // 多核
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2_error.log",
      out_file: "./logs/pm2_out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
