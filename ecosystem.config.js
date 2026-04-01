module.exports = {
  apps: [
      {
        "name": "pm2-test-server",        // 进程名称（pm2 list 显示的名字）
        "script": "app.js",                // 启动入口文件
        "instances": "max",                // 自动使用 CPU 所有核心（多进程）
        "exec_mode": "cluster",            // 开启 Node.js 多进程集群模式
        "watch": false,                    // 生产环境关闭文件监听（避免自动重启）
        "ignore_watch": [                  // 忽略监听的文件夹（即使开了 watch 也不监控）
            "node_modules",
            "logs"
        ],
        "env": {                           // 设置环境变量
            "NODE_ENV": "production"       // 标记当前为【生产环境】
        },
        "error_file": "./logs/pm2_error.log",      // 错误日志存放路径
        "out_file": "./logs/pm2_out.log",        // 控制台打印日志存放路径
        "merge_logs": true,                // 多进程日志合并为一个文件（必开！）
        "log_date_format": "YYYY-MM-DD HH:mm:ss"  // 日志时间格式
      }
  ],
};
