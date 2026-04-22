const db = require("../db/mysql");

async function createOrder({ orderId, userId, productId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 创建订单
    await conn.query(
      "INSERT INTO orders(orderId, user_id, product_id, status) VALUES (?,?,?,0)",
      [orderId, userId, productId],
    );
    // 扣库存
    await conn.query(
      "UPDATE products SET stock = stock - 1 WHERE id=? AND stock > 0",
      [productId],
    );

    await conn.commit();
    return { code: 200, message: "下单成功" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
module.exports = { createOrder };
