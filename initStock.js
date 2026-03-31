const db = require("./db/mysql"); // 必须加这一行
const redis = require("./db/redis");

async function initAllStock() {
  const [rows] = await db.query("SELECT id, stock FROM products");

  if (!rows || rows.length === 0) {
    throw new Error("没有商品数据");
  }

  for (const item of rows) {
    await redis.set(`stock:${item.id}`, item.stock);
    console.log(`商品 ${item.id} 库存初始化: ${item.stock}`);
  }
}

module.exports = initAllStock;
