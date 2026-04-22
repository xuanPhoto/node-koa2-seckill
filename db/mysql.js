// 引入 mysql2/promise 库（支持 async/await，性能比 mysql 好很多）
const mysql = require("mysql2/promise");
const config = require("../config");
// 创建【连接池】
const con = mysql.createPool({
  ...config.mysql,
});
// 必须加：数据库断线自动重连
con.on("error", (err) => {
  console.error("MySQL 错误 =>", err.code, err.message);

  // 判断：MySQL 连接断开（官方标准判断）
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("MySQL 连接已断开，2秒后自动重连...");

    // 2秒后尝试重连
    setTimeout(() => {
      con.getConnection((err, connection) => {
        if (!err) {
          console.log("MySQL 重连成功 ✅");
          connection.release(); // 立刻释放，保持连接池可用
        } else {
          console.log("MySQL 重连失败 =>", err.message);
        }
      });
    }, 2000);
  }
});

// 导出连接池
module.exports = con;
