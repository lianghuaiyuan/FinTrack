/**
 * Simple interest calculation for time deposits.
 * Formula: principal + principal × annualRate × (daysHeld / 365)
 *
 * We use simple interest because:
 * 1. Most bank time deposits in China use simple interest (单利).
 * 2. Simple interest is transparent and easy for users to verify.
 * 3. Compound interest adds negligible complexity for typical 1-5 year deposits.
 *
 * @param {number} principal - Initial deposit amount
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @param {number} annualRate - Annual interest rate (e.g., 0.03 for 3%)
 * @param {string} [asOf] - Reference date (default: today). For computing current value.
 * @returns {{ currentValue: number, daysHeld: number, daysRemaining: number, interestEarned: number }}
 */
function computeCurrentValue(principal, startDate, endDate, annualRate, asOf) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = asOf ? new Date(asOf) : new Date();
  today.setHours(0, 0, 0, 0);

  // Clamp to end date for calculation (matured = value frozen at end_date)
  const calcDate = today > end ? end : today;

  const daysHeld = Math.max(0, Math.floor((calcDate - start) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.floor((end - today) / (1000 * 60 * 60 * 24)));

  const interestEarned = principal * annualRate * (daysHeld / 365);
  const currentValue = principal + interestEarned;

  return {
    currentValue: Math.round(currentValue * 100) / 100,
    daysHeld,
    daysRemaining: today > end ? 0 : daysRemaining,
    interestEarned: Math.round(interestEarned * 100) / 100,
    isMatured: today >= end,
  };
}

module.exports = { computeCurrentValue };
