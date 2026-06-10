/**
 * XIRR (Extended Internal Rate of Return) using Newton's method.
 *
 * Given a series of cash flows with dates, computes the annualized
 * internal rate of return that makes the net present value zero.
 *
 * In FinTrack context:
 * - Negative cash flow = money invested (buying assets, adding to investment accounts)
 * - Positive cash flow = money received (selling/redeeming, current value as final)
 *
 * Newton's method: rate_{n+1} = rate_n - f(rate_n)/f'(rate_n)
 * where f(r) = Σ CF_i × (1+r)^{(t_n - t_i)/365}
 *
 * @param {Array<{date: string, amount: number}>} cashFlows - sorted by date ascending
 * @param {number} [guess=0.1] - Initial guess for the rate
 * @param {number} [maxIterations=1000]
 * @param {number} [tolerance=1e-7]
 * @returns {number} Annualized XIRR as decimal (e.g., 0.15 = 15%)
 */
function xirr(cashFlows, guess = 0.1, maxIterations = 1000, tolerance = 1e-7) {
  if (!cashFlows || cashFlows.length < 2) {
    return 0;
  }

  // Sort by date ascending
  const sorted = [...cashFlows].sort((a, b) => new Date(a.date) - new Date(b.date));

  const baseDate = new Date(sorted[0].date);

  // Convert to (yearFraction, amount) pairs
  const flows = sorted.map(cf => {
    const days = (new Date(cf.date) - baseDate) / (1000 * 60 * 60 * 24);
    return {
      years: days / 365.0,
      amount: cf.amount,
    };
  });

  let rate = guess;
  for (let iter = 0; iter < maxIterations; iter++) {
    let npv = 0;
    let dnpv = 0; // derivative of NPV with respect to rate

    for (const flow of flows) {
      if (flow.years === 0) {
        npv += flow.amount;
        // derivative for t=0 is 0 (constant)
      } else {
        const discount = Math.pow(1 + rate, flow.years);
        npv += flow.amount / discount;
        dnpv -= flow.years * flow.amount / Math.pow(1 + rate, flow.years + 1);
      }
    }

    if (Math.abs(dnpv) < 1e-12) {
      // Avoid division by zero
      break;
    }

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;

    // Prevent runaway
    if (rate < -0.99 || rate > 100) {
      return guess; // Non-convergence, return original guess
    }
  }

  return rate;
}

module.exports = { xirr };
