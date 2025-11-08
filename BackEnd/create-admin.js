require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

/**
 * สคริปต์สร้าง Admin User โดยตรง
 * หรือเปลี่ยน User ที่มีอยู่เป็น Admin
 */

async function createOrUpdateAdmin() {
  try {
    console.log('🔌 กำลังเชื่อมต่อ MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ เชื่อมต่อสำเร็จ\n');

    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin123!';

    // ตรวจสอบว่ามี admin user อยู่แล้วหรือไม่
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log('📋 พบ User:', adminEmail);
      console.log('   Current Role:', adminUser.role);
      
      if (adminUser.role === 'admin') {
        console.log('✅ User นี้เป็น Admin อยู่แล้ว!\n');
      } else {
        console.log('🔄 กำลังเปลี่ยน role เป็น admin...');
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('✅ เปลี่ยน role เป็น admin สำเร็จ!\n');
      }
    } else {
      console.log('📝 ไม่พบ User, กำลังสร้าง Admin ใหม่...');
      
      adminUser = await User.create({
        username: 'admin',
        email: adminEmail,
        password: adminPassword,
        firstName: 'ผู้ดูแล',
        lastName: 'ระบบ',
        role: 'admin', // ตั้งเป็น admin ตั้งแต่แรก
      });
      
      console.log('✅ สร้าง Admin User สำเร็จ!\n');
    }

    // แสดงข้อมูล Admin
    console.log('═══════════════════════════════════════');
    console.log('👑 Admin User Information:');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Username:', adminUser.username);
    console.log('🎭 Role:', adminUser.role);
    console.log('🆔 ID:', adminUser._id);
    console.log('✅ Active:', adminUser.isActive);
    console.log('═══════════════════════════════════════\n');

    console.log('🎯 ข้อมูลสำหรับ Login:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('\n📮 ใช้ข้อมูลนี้ใน Postman:');
    console.log('   → Login as Admin 👑');
    console.log('   → จะได้ admin_token ที่สามารถเข้าถึง admin endpoints ได้\n');

    // ตรวจสอบ admin users ทั้งหมด
    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log(`📊 จำนวน Admin ในระบบ: ${adminCount} คน\n`);

    console.log('✅ เสร็จสิ้น!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();

