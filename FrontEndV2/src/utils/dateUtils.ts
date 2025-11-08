/**
 * ฟังก์ชันสำหรับคำนวณช่วงเวลา (Date Range)
 * รองรับการคำนวณย้อนหลังในรูปแบบต่างๆ
 * 
 * @param date - วันที่อ้างอิง (ISO string หรือ Date object)
 * @param type - ประเภทของช่วงเวลา
 * @returns Object ที่มี start และ end เป็น ISO string
 */

export type DateRangeType = 
  | 'lastday'
  | 'last7day'
  | 'lastweek'
  | 'lastmonth'
  | 'last3month'
  | 'last6month'
  | 'last12month';

export interface DateRange {
  start: string;
  end: string;
}

/**
 * ฟังก์ชันหลักสำหรับคำนวณช่วงเวลา
 * รองรับทุก type ที่กำหนดไว้
 */
export function getDateRange(date: string | Date, type: DateRangeType): DateRange {
  const referenceDate = new Date(date);
  
  // ตรวจสอบว่า date ที่ส่งมาถูกต้องหรือไม่
  if (isNaN(referenceDate.getTime())) {
    throw new Error('Invalid date format');
  }

  switch (type) {
    case 'lastday':
      return getLastDay(referenceDate);
    case 'last7day':
      return getLast7Days(referenceDate);
    case 'lastweek':
      return getLastWeek(referenceDate);
    case 'lastmonth':
      return getLastMonth(referenceDate);
    case 'last3month':
      return getLast3Months(referenceDate);
    case 'last6month':
      return getLast6Months(referenceDate);
    case 'last12month':
      return getLast12Months(referenceDate);
    default:
      throw new Error(`Unknown date range type: ${type}`);
  }
}

/**
 * วันที่ผ่านมา (เมื่อวาน)
 * เริ่มต้น 00:00:00.000 ถึง 23:59:59.999
 */
function getLastDay(date: Date): DateRange {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const start = new Date(yesterday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * ย้อนหลัง 7 วัน
 * นับจากวันปัจจุบัน ย้อนกลับไป 7 วัน
 */
function getLast7Days(date: Date): DateRange {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(date);
  start.setDate(start.getDate() - 6); // 6 วันก่อน + วันปัจจุบัน = 7 วัน
  start.setHours(0, 0, 0, 0);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * สัปดาห์ก่อนหน้า
 * จันทร์ถึงอาทิตย์ของสัปดาห์ที่แล้ว
 */
function getLastWeek(date: Date): DateRange {
  const current = new Date(date);
  const currentDay = current.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // คำนวณวันจันทร์ของสัปดาห์ปัจจุบัน
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = new Date(current);
  currentMonday.setDate(current.getDate() + mondayOffset);
  
  // วันจันทร์ของสัปดาห์ก่อนหน้า
  const lastMonday = new Date(currentMonday);
  lastMonday.setDate(currentMonday.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);
  
  // วันอาทิตย์ของสัปดาห์ก่อนหน้า
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  
  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
  };
}

/**
 * เดือนก่อนหน้า
 * วันที่ 1 ถึงวันสุดท้ายของเดือนก่อนหน้า
 */
function getLastMonth(date: Date): DateRange {
  const current = new Date(date);
  
  // วันแรกของเดือนก่อนหน้า
  const start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  
  // วันสุดท้ายของเดือนก่อนหน้า (วันก่อนวันที่ 1 ของเดือนปัจจุบัน)
  const end = new Date(current.getFullYear(), current.getMonth(), 0);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * 3 เดือนล่าสุด
 * นับจากเดือนปัจจุบัน ย้อนกลับไป 3 เดือน
 */
function getLast3Months(date: Date): DateRange {
  const current = new Date(date);
  
  const start = new Date(current);
  start.setMonth(current.getMonth() - 2); // ย้อนกลับ 2 เดือน (3 เดือนรวมเดือนปัจจุบัน)
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(current);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * 6 เดือนล่าสุด
 * นับจากเดือนปัจจุบัน ย้อนกลับไป 6 เดือน
 */
function getLast6Months(date: Date): DateRange {
  const current = new Date(date);
  
  const start = new Date(current);
  start.setMonth(current.getMonth() - 5); // ย้อนกลับ 5 เดือน (6 เดือนรวมเดือนปัจจุบัน)
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(current);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * 12 เดือนล่าสุด (1 ปี)
 * นับจากเดือนปัจจุบัน ย้อนกลับไป 12 เดือน
 */
function getLast12Months(date: Date): DateRange {
  const current = new Date(date);
  
  const start = new Date(current);
  start.setMonth(current.getMonth() - 11); // ย้อนกลับ 11 เดือน (12 เดือนรวมเดือนปัจจุบัน)
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(current);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * ฟังก์ชันช่วยเหลือ: แปลง Date เป็น string ที่อ่านง่าย
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = new Date(date);
  
  if (format === 'time') {
    return d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // format === 'short'
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * ฟังก์ชันช่วยเหลือ: คำนวณจำนวนวันระหว่าง 2 วันที่
 */
export function getDaysDifference(start: string | Date, end: string | Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * ฟังก์ชันช่วยเหลือ: ตรวจสอบว่าวันที่อยู่ในช่วงหรือไม่
 */
export function isDateInRange(date: string | Date, range: DateRange): boolean {
  const checkDate = new Date(date).getTime();
  const startTime = new Date(range.start).getTime();
  const endTime = new Date(range.end).getTime();
  
  return checkDate >= startTime && checkDate <= endTime;
}

