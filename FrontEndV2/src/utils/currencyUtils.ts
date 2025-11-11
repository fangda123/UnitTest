/**
 * Currency Utilities
 * สำหรับแปลงและแสดงผลเงินเป็นบาทไทย
 */

// อัตราแลกเปลี่ยน USD ต่อ THB (สามารถปรับได้ตามต้องการ)
const USD_TO_THB = 36.0; // 1 USD = 36 THB (ประมาณ)

/**
 * แปลง USD เป็น THB
 */
export function usdToThb(usd: number): number {
  return usd * USD_TO_THB;
}

/**
 * แปลง THB เป็น USD
 */
export function thbToUsd(thb: number): number {
  return thb / USD_TO_THB;
}

/**
 * แสดงผลเงินเป็นบาทไทย
 * @param amount จำนวนเงิน (USD)
 * @param options ตัวเลือกการแสดงผล
 */
export function formatThaiBaht(
  amount: number,
  options: {
    showSymbol?: boolean;
    decimals?: number;
    showDecimals?: boolean;
  } = {}
): string {
  const {
    showSymbol = true,
    decimals = 2,
    showDecimals = true,
  } = options;

  const thbAmount = usdToThb(amount);
  
  let formatted = thbAmount.toLocaleString('th-TH', {
    minimumFractionDigits: showDecimals ? decimals : 0,
    maximumFractionDigits: showDecimals ? decimals : 0,
  });

  if (showSymbol) {
    formatted = `${formatted} ฿`;
  }

  return formatted;
}

/**
 * แสดงผลเงินเป็นบาทไทยแบบสั้น (เช่น 1.5K ฿, 2.3M ฿)
 */
export function formatThaiBahtShort(
  amount: number,
  options: {
    showSymbol?: boolean;
    decimals?: number;
  } = {}
): string {
  const { showSymbol = true, decimals = 1 } = options;
  const thbAmount = usdToThb(amount);

  let formatted: string;
  if (thbAmount >= 1000000) {
    formatted = `${(thbAmount / 1000000).toFixed(decimals)}M`;
  } else if (thbAmount >= 1000) {
    formatted = `${(thbAmount / 1000).toFixed(decimals)}K`;
  } else {
    formatted = thbAmount.toFixed(decimals);
  }

  if (showSymbol) {
    formatted = `${formatted} ฿`;
  }

  return formatted;
}

/**
 * แสดงผลเปอร์เซ็นต์
 */
export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

