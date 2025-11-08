/**
 * ฟังก์ชันคำนวณช่วงเวลาตามประเภทที่กำหนด
 * รองรับการคำนวณย้อนหลังหลายรูปแบบ
 * 
 * @param date - วันที่ที่ต้องการใช้เป็นจุดอ้างอิง (ISO string format)
 * @param type - ประเภทของช่วงเวลา
 * @returns Object ที่มี start และ end เป็น ISO string
 */
export function getDateRange(
  date: string,
  type: 'lastday' | 'last7day' | 'lastweek' | 'lastmonth' | 'last3month' | 'last6month' | 'last12month'
): { start: string; end: string } {
  // แปลง input date เป็น Date object
  const referenceDate = new Date(date);
  
  // ตรวจสอบว่า date ที่ส่งเข้ามาถูกต้องหรือไม่
  if (isNaN(referenceDate.getTime())) {
    throw new Error('Invalid date format');
  }

  let startDate: Date;
  let endDate: Date;

  switch (type) {
    case 'lastday':
      // วันที่ผ่านมา (เมื่อวาน)
      startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last7day':
      // ย้อนหลัง 7 วัน (รวมวันนี้)
      startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'lastweek':
      // สัปดาห์ก่อนหน้า (จันทร์ - อาทิตย์)
      const currentDay = referenceDate.getDay();
      const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1 + 7;
      
      startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - daysToLastMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'lastmonth':
      // เดือนก่อนหน้า
      startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last3month':
      // 3 เดือนล่าสุด (นับจากต้นเดือนที่ 3 เดือนก่อน ถึงปัจจุบัน)
      startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - 2);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last6month':
      // 6 เดือนล่าสุด
      startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last12month':
      // 12 เดือนล่าสุด
      startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(referenceDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    default:
      throw new Error(`Unsupported type: ${type}`);
  }

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

/**
 * ฟังก์ชันช่วยในการแปลงวันที่เป็นรูปแบบที่อ่านง่าย
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  return `${startDate.toLocaleDateString('th-TH', options)} - ${endDate.toLocaleDateString('th-TH', options)}`;
}

