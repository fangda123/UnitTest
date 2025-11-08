const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

/**
 * User Management Tests
 * ทดสอบการทำงานของ User Management API (CRUD)
 */

describe('User Management API Tests', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let normalUser;

  // เชื่อมต่อ database ก่อนเริ่มทดสอบ
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://172.105.118.30:27017/backend_test_db';
    await mongoose.connect(mongoUri);
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  // สร้างผู้ใช้ทดสอบ
  beforeEach(async () => {
    await User.deleteMany({});

    // สร้าง admin user
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      });
    
    adminUser = adminResponse.body.data.user;
    await User.findByIdAndUpdate(adminUser._id, { role: 'admin' });
    
    // Login เป็น admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      });
    adminToken = adminLogin.body.data.token;

    // สร้าง normal user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'normaluser',
        email: 'user@example.com',
        password: 'password123',
        firstName: 'Normal',
        lastName: 'User',
      });
    
    normalUser = userResponse.body.data.user;
    userToken = userResponse.body.data.token;
  });

  // ปิดการเชื่อมต่อหลังทดสอบเสร็จ
  afterAll(async () => {
    await mongoose.connection.close();
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  describe('GET /api/users', () => {
    test('admin ควรดึงข้อมูลผู้ใช้ทั้งหมดได้', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });

    test('user ธรรมดาไม่ควรดึงข้อมูลผู้ใช้ทั้งหมดได้', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('ไม่ควรดึงข้อมูลได้โดยไม่มี token', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/:id', () => {
    test('ควรดึงข้อมูลผู้ใช้รายคนได้', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(normalUser._id);
      expect(response.body.data.email).toBe(normalUser.email);
    });

    test('ไม่ควรดึงข้อมูลได้ถ้า ID ไม่ถูกต้อง', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    test('ควรอัพเดทข้อมูลผู้ใช้ของตัวเองได้', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('อัพเดทข้อมูลสำเร็จ');
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.lastName).toBe('Name');
    });

    test('admin ควรอัพเดทข้อมูลผู้ใช้คนอื่นได้', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'AdminUpdated',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('AdminUpdated');
    });

    test('user ธรรมดาไม่ควรอัพเดทข้อมูลผู้ใช้คนอื่นได้', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Hacker',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('admin ควรลบผู้ใช้ได้', async () => {
      const response = await request(app)
        .delete(`/api/users/${normalUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ลบผู้ใช้สำเร็จ');

      // ตรวจสอบว่าถูกลบจริง
      const deletedUser = await User.findById(normalUser._id);
      expect(deletedUser).toBeNull();
    });

    test('user ธรรมดาไม่ควรลบผู้ใช้ได้', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('ไม่ควรลบตัวเองได้', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ไม่สามารถลบบัญชีของตัวเอง');
    });
  });
});

