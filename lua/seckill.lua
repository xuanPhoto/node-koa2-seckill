-- Redis Lua 原子脚本：秒杀核心（高并发不超卖、防重复购买）

-- 1. 获取商品库存，并转成数字
local stock = tonumber(redis.call('get', KEYS[1]))

-- 2. 如果库存不存在 或 库存 <= 0 → 返回 -1（卖完了）
if not stock or stock <= 0 then
    return -1
end

-- 3. 判断用户是否已经买过（存在 set 集合里）
-- 存在 → 返回 -2（不能重复购买）
if redis.call('sismember', KEYS[2], ARGV[1]) == 1 then
    return -2
end

-- 4. 扣减库存（原子操作，高并发绝对安全）
redis.call('decr', KEYS[1])

-- 5. 把用户加入已购买集合（记录谁买了）
redis.call('sadd', KEYS[2], ARGV[1])

-- 6. 全部成功 → 返回 1（秒杀成功）
return 1