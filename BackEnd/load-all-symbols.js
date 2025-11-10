require('dotenv').config();
const symbolLoader = require('./src/microservices/binance/symbolLoader');
const binanceDataCollector = require('./src/microservices/binance/dataCollector');
const logger = require('./src/utils/logger');

/**
 * Script สำหรับโหลด symbols ทั้งหมดจาก Binance
 * และเพิ่มเข้าไปใน Data Collector
 */

async function loadAllSymbols() {
  try {
    console.log('🚀 เริ่มโหลด symbols ทั้งหมดจาก Binance...\n');

    // ตรวจสอบว่าต้องการโหลดทั้งหมดหรือเฉพาะ top symbols
    const useTopOnly = process.argv.includes('--top-only');
    const limit = process.argv.includes('--limit') 
      ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) 
      : 50;

    let symbols;

    if (useTopOnly) {
      console.log(`📊 โหลดเฉพาะ top ${limit} symbols...`);
      symbols = await symbolLoader.loadTopSymbols(limit);
    } else {
      console.log('📊 โหลด symbols ทั้งหมด...');
      symbols = await symbolLoader.loadAllSymbols();
    }

    console.log(`\n✅ โหลด symbols สำเร็จ: ${symbols.length} symbols`);
    console.log(`\n📋 รายการ symbols:`);
    symbols.slice(0, 20).forEach((symbol, index) => {
      console.log(`   ${index + 1}. ${symbol}`);
    });
    if (symbols.length > 20) {
      console.log(`   ... และอีก ${symbols.length - 20} symbols`);
    }

    console.log(`\n📊 สถานะ Data Collector:`);
    const status = binanceDataCollector.getStatus();
    console.log(`   - Symbols: ${status.symbols.length}`);
    console.log(`   - Active Connections: ${status.activeConnections}`);
    console.log(`   - Is Running: ${status.isRunning}`);

    console.log('\n✅ เสร็จสิ้น!');
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

// รัน function
loadAllSymbols();

