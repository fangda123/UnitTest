const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

/**
 * Authentication Tests
 * ทดสอบการทำงานของ Authentication API
 */

describe('Authentication API Tests', () => {
  // ข้อมูลทดสอบ
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  let authToken;

  // เชื่อมต่อ database ก่อนเริ่มทดสอบ
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://172.105.118.30:27017/backend_test_db';
    await mongoose.connect(mongoUri);
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  // ล้างข้อมูลก่อนแต่ละ test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  // ปิดการเชื่อมต่อหลังทดสอบเสร็จ
  afterAll(async () => {
    await mongoose.connection.close();
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  describe('POST /api/auth/register', () => {
    test('ควรสมัครสมาชิกสำเร็จ', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('สมัครสมาชิกสำเร็จ');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('ไม่ควรสมัครสมาชิกด้วยอีเมลซ้ำ', async () => {
      // สมัครครั้งแรก
      await request(app).post('/api/auth/register').send(testUser);

      // พยายามสมัครอีกครั้งด้วยอีเมลเดิม
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ถูกใช้งานแล้ว');
    });

    test('ไม่ควรสมัครสมาชิกโดยไม่มีข้อมูลที่จำเป็น', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // สร้างผู้ใช้สำหรับทดสอบ
      await request(app).post('/api/auth/register').send(testUser);
    });

    test('ควรเข้าสู่ระบบสำเร็จ', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('เข้าสู่ระบบสำเร็จ');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    test('ไม่ควรเข้าสู่ระบบด้วยรหัสผ่านผิด', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ไม่ถูกต้อง');
    });

    test('ไม่ควรเข้าสู่ระบบด้วยอีเมลที่ไม่มีในระบบ', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notexist@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // สร้างผู้ใช้และเข้าสู่ระบบ
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      authToken = response.body.data.token;
    });

    test('ควรดึงข้อมูลผู้ใช้ปัจจุบันได้', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.username).toBe(testUser.username);
    });

    test('ไม่ควรดึงข้อมูลได้โดยไม่มี token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('ไม่ควรดึงข้อมูลได้ด้วย token ไม่ถูกต้อง', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      // สร้างผู้ใช้และเข้าสู่ระบบ
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      authToken = response.body.data.token;
    });

    test('ควรเปลี่ยนรหัสผ่านสำเร็จ', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('เปลี่ยนรหัสผ่านสำเร็จ');

      // ทดสอบเข้าสู่ระบบด้วยรหัสผ่านใหม่
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    test('ไม่ควรเปลี่ยนรหัสผ่านด้วยรหัสผ่านปัจจุบันผิด', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ไม่ถูกต้อง');
    });
  });
});

