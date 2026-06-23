export const PLATFORM_COMMISSION_RATE = 0.1;

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateCommissionBreakdown(amount) {
  const originalAmount = Number(amount);
  const safeAmount = Number.isFinite(originalAmount) ? originalAmount : 0;
  const commissionAmount = roundCurrency(safeAmount * PLATFORM_COMMISSION_RATE);

  return {
    originalAmount: safeAmount,
    supplierAmount: roundCurrency(safeAmount - commissionAmount),
    commissionAmount,
    totalAmount: safeAmount,
  };
}
