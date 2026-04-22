// router/index.js
const Router = require("koa-router"); // 引入路由
const router = new Router(); // 创建路由实例

const { seckill } = require("../controller/seckillController"); // 引入秒杀控制器

router.post("/seckill", seckill); // 定义 POST 接口 /seckill

module.exports = router; // 导出路由给 app.js 使用
