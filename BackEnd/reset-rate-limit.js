/**
 * Script สำหรับ reset rate limiter
 * ใช้เมื่อต้องการ reset rate limit counter
 */

const { getRedisClient } = require('./src/config/redis');

async function resetRateLimit() {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      console.log('❌ Redis ไม่ได้เชื่อมต่อ');
      return;
    }

    // ค้นหา keys ที่เกี่ยวข้องกับ rate limit
    const keys = await redisClient.keys('*rate-limit*');
    
    if (keys.length === 0) {
      console.log('✅ ไม่พบ rate limit keys');
      return;
    }

    // ลบ keys ทั้งหมด
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`🗑️  ลบ key: ${key}`);
    }

    console.log(`✅ Reset rate limit สำเร็จ (ลบ ${keys.length} keys)`);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    process.exit(0);
  }
}

// รัน function
resetRateLimit();

