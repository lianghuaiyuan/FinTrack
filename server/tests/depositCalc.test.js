const { computeCurrentValue } = require('../src/utils/depositCalc');

describe('DepositCalc', () => {
  it('should compute simple interest for 1 year at 3%', () => {
    const result = computeCurrentValue(10000, '2025-01-01', '2026-01-01', 0.03, '2026-01-01');
    expect(result.currentValue).toBeCloseTo(10300, 0);
    expect(result.daysHeld).toBe(365);
    expect(result.isMatured).toBe(true);
  });

  it('should compute half-year interest', () => {
    const result = computeCurrentValue(10000, '2025-01-01', '2026-01-01', 0.03, '2025-07-01');
    expect(result.daysHeld).toBeCloseTo(181, -1);
    expect(result.currentValue).toBeGreaterThan(10000);
    expect(result.currentValue).toBeLessThan(10300);
    expect(result.isMatured).toBe(false);
  });

  it('should cap at maturity value after end date', () => {
    const result = computeCurrentValue(10000, '2021-01-01', '2022-01-01', 0.03, '2025-01-01');
    expect(result.currentValue).toBe(10300);
    expect(result.daysRemaining).toBe(0);
    expect(result.isMatured).toBe(true);
  });

  it('should return zero interest for zero principal', () => {
    const result = computeCurrentValue(0, '2025-01-01', '2026-01-01', 0.03);
    expect(result.currentValue).toBe(0);
  });
});
