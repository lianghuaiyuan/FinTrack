const { xirr } = require('../src/utils/xirr');

describe('XIRR', () => {
  it('should return 0 for empty input', () => {
    expect(xirr([])).toBe(0);
    expect(xirr([{date:'2020-01-01',amount:100}])).toBe(0);
  });

  it('should compute known rate: 10% pa over 1 year', () => {
    const flows = [
      {date:'2020-01-01',amount:-1000},
      {date:'2021-01-01',amount:1100},
    ];
    const rate = xirr(flows, 0.1);
    expect(Math.abs(rate - 0.10)).toBeLessThan(0.01);
  });

  it('should compute zero return', () => {
    const flows = [
      {date:'2020-01-01',amount:-1000},
      {date:'2021-01-01',amount:1000},
    ];
    const rate = xirr(flows, 0.1);
    expect(Math.abs(rate)).toBeLessThan(0.01);
  });

  it('should handle multiple cashflows', () => {
    const flows = [
      {date:'2020-01-01',amount:-5000},
      {date:'2020-06-01',amount:-3000},
      {date:'2021-01-01',amount:8800},
    ];
    const rate = xirr(flows, 0.1);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.15);
  });
});
