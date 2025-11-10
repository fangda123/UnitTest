const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * WebSocket Service สำหรับการแจ้งเตือนแบบ real-time
 * ใช้สำหรับแจ้งเตือนเมื่อมีการสร้างหรือแก้ไขข้อมูลผู้ใช้
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // เก็บ client พร้อม userId
  }

  /**
   * เริ่มต้น WebSocket Server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      logger.info('🔌 มีการเชื่อมต่อ WebSocket ใหม่');

      // รอรับ token เพื่อ authenticate
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);

          // ตรวจสอบ authentication
          if (data.type === 'auth' && data.token) {
            this.authenticateClient(ws, data.token);
          }
        } catch (error) {
          logger.error('❌ เกิดข้อผิดพลาดในการประมวลผล WebSocket message:', error.message);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'ข้อมูลไม่ถูกต้อง',
            })
          );
        }
      });

      ws.on('close', () => {
        // ลบ client ออกจาก Map เมื่อตัดการเชื่อมต่อ
        for (const [userId, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(userId);
            logger.info(`🔌 ผู้ใช้ ${userId} ตัดการเชื่อมต่อ WebSocket`);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        logger.error('❌ WebSocket Error:', error.message);
      });

      // ส่งข้อความต้อนรับ
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'เชื่อมต่อ WebSocket สำเร็จ กรุณาส่ง token เพื่อ authenticate',
        })
      );
    });

    logger.info('✅ WebSocket Server เริ่มทำงานแล้ว');
  }

  /**
   * Authenticate client ด้วย JWT token
   */
  authenticateClient(ws, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // เก็บ client ใน Map
      this.clients.set(userId, ws);

      logger.info(`✅ ผู้ใช้ ${userId} authenticate WebSocket สำเร็จ`);

      ws.send(
        JSON.stringify({
          type: 'authenticated',
          message: 'ยืนยันตัวตนสำเร็จ',
        })
      );
    } catch (error) {
      logger.error('❌ WebSocket Authentication Error:', error.message);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Token ไม่ถูกต้องหรือหมดอายุ',
        })
      );
      ws.close();
    }
  }

  /**
   * ส่งข้อความถึง client เฉพาะคน
   */
  sendToUser(userId, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      logger.info(`📤 ส่งข้อความถึงผู้ใช้ ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * ส่งข้อความถึง client ทุกคน (broadcast)
   */
  broadcast(data) {
    let sentCount = 0;
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
        sentCount++;
        logger.info(`📤 ส่งข้อความถึง client ${userId}: ${data.type}`);
      }
    });
    if (sentCount > 0) {
      logger.info(`📢 Broadcast ข้อความ ${data.type} ถึง ${sentCount} clients`);
    } else {
      logger.warn(`⚠️ ไม่มี clients ที่เชื่อมต่ออยู่ - ไม่สามารถ broadcast ${data.type}`);
    }
    return sentCount;
  }

  /**
   * แจ้งเตือนเมื่อมีการสร้างผู้ใช้ใหม่
   */
  notifyUserCreated(user) {
    this.broadcast({
      type: 'user.created',
      message: `มีผู้ใช้ใหม่: ${user.username}`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  }

  /**
   * แจ้งเตือนเมื่อมีการอัพเดทข้อมูลผู้ใช้
   */
  notifyUserUpdated(user) {
    // ส่งให้ผู้ใช้คนนั้นเอง
    this.sendToUser(user._id.toString(), {
      type: 'user.updated',
      message: 'ข้อมูลของคุณได้รับการอัพเดท',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        updatedAt: user.updatedAt,
      },
    });

    // broadcast ให้ admin
    this.broadcast({
      type: 'user.updated',
      message: `ผู้ใช้ ${user.username} อัพเดทข้อมูล`,
      data: {
        id: user._id,
        username: user.username,
        updatedAt: user.updatedAt,
      },
    });
  }

  /**
   * แจ้งเตือนเมื่อมีการลบผู้ใช้
   */
  notifyUserDeleted(userId, username) {
    this.broadcast({
      type: 'user.deleted',
      message: `ผู้ใช้ ${username} ถูกลบออกจากระบบ`,
      data: {
        id: userId,
        username: username,
      },
    });
  }

  /**
   * แจ้งเตือนอัพเดทราคา crypto
   */
  notifyCryptoPriceUpdate(priceData) {
    this.broadcast({
      type: 'crypto.price.update',
      message: `อัพเดทราคา ${priceData.symbol}`,
      data: priceData,
    });
  }

  /**
   * ปิด WebSocket Server
   */
  close() {
    if (this.wss) {
      this.wss.close();
      logger.info('🔌 ปิด WebSocket Server');
    }
  }
}

// สร้าง instance เดียว (Singleton pattern)
const websocketService = new WebSocketService();

module.exports = websocketService;

