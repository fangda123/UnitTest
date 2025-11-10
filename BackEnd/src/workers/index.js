const aggregationWorker = require('./aggregationWorker');

/**
 * Workers Index
 * จัดการ workers ทั้งหมด
 */
class WorkersManager {
  constructor() {
    this.workers = {
      aggregation: aggregationWorker,
    };
    this.isRunning = false;
  }

  /**
   * เริ่มต้น workers ทั้งหมด
   */
  start(symbols = []) {
    if (this.isRunning) {
      console.warn('[Workers Manager] ⚠️  Workers กำลังทำงานอยู่แล้ว');
      return;
    }

    console.log('[Workers Manager] 🚀 เริ่มต้น Workers ทั้งหมด');
    this.isRunning = true;

    // เริ่มต้น aggregation worker
    this.workers.aggregation.start(symbols);
  }

  /**
   * หยุด workers ทั้งหมด
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Workers Manager] 🛑 หยุด Workers ทั้งหมด');
    this.isRunning = false;

    // หยุดทุก workers
    Object.values(this.workers).forEach((worker) => {
      if (worker.stop) {
        worker.stop();
      }
    });
  }

  /**
   * ดึงสถานะ workers ทั้งหมด
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      workers: {},
    };

    Object.entries(this.workers).forEach(([name, worker]) => {
      if (worker.getStatus) {
        status.workers[name] = worker.getStatus();
      }
    });

    return status;
  }
}

// สร้าง instance เดียว (Singleton pattern)
const workersManager = new WorkersManager();

module.exports = workersManager;

