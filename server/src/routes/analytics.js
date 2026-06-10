const express = require('express');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { xirr } = require('../utils/xirr');
const { computeCurrentValue } = require('../utils/depositCalc');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/overview
router.get('/overview', (req, res) => {
  const userId = req.userId;

  // Total from accounts
  const accountTotal = db.prepare(
    'SELECT COALESCE(SUM(current_balance), 0) as total FROM accounts WHERE user_id = ?'
  ).get(userId).total;

  // Total from active time deposits (computed current value)
  const deposits = db.prepare(
    'SELECT * FROM time_deposits WHERE user_id = ? AND status = ?'
  ).all(userId, 'active');

  let depositTotal = 0;
  let totalPrincipal = 0;
  for (const d of deposits) {
    const calc = computeCurrentValue(d.principal, d.start_date, d.end_date, d.annual_rate);
    depositTotal += calc.currentValue;
    totalPrincipal += d.principal;
  }

  // Also add redeemed deposit principals to total principal
  const redeemedPrincipal = db.prepare(
    'SELECT COALESCE(SUM(principal), 0) as total FROM time_deposits WHERE user_id = ? AND status = ?'
  ).get(userId, 'redeemed').total;
  totalPrincipal += redeemedPrincipal;

  // Total from adjustments into investment accounts (net inflow)
  const netInflow = db.prepare(
    `SELECT COALESCE(SUM(adjustment_amount), 0) as total
     FROM adjustment_records ar
     JOIN accounts a ON ar.account_id = a.id
     WHERE a.user_id = ? AND a.asset_category = '投资' AND ar.type = 'adjust'`
  ).get(userId).total;

  const totalAssets = accountTotal + depositTotal;
  // Total invested = deposits principal + net inflow to investment accounts
  const totalInvested = totalPrincipal + netInflow;
  const totalProfit = totalAssets - totalInvested - netInflow > 0
    ? totalAssets - totalInvested
    : totalAssets - totalInvested;

  // Build cash flows for XIRR
  const cashFlows = buildCashFlows(userId, totalAssets);

  const xirrRate = cashFlows.length >= 2 ? xirr(cashFlows) : 0;

  res.json({
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalPrincipal: Math.round(totalInvested * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    depositValue: Math.round(depositTotal * 100) / 100,
    xirrRate: Math.round(xirrRate * 10000) / 100, // as percentage
    accountCount: db.prepare('SELECT COUNT(*) as c FROM accounts WHERE user_id = ?').get(userId).c,
    depositCount: deposits.length,
  });
});

// GET /api/analytics/trend?days=30
router.get('/trend', (req, res) => {
  const userId = req.userId;
  const days = parseInt(req.query.days, 10) || 30;

  // Get all snapshots within the period, grouped by date
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  // Get the latest snapshot per account per day
  const snapshots = db.prepare(
    `SELECT bs.recorded_at, bs.balance, a.asset_category
     FROM balance_snapshots bs
     JOIN accounts a ON bs.account_id = a.id
     WHERE a.user_id = ? AND bs.recorded_at >= ?
     ORDER BY bs.recorded_at ASC`
  ).all(userId, sinceStr);

  // Group by date, sum by category
  const trendMap = {};
  for (const s of snapshots) {
    const date = s.recorded_at.split('T')[0];
    if (!trendMap[date]) trendMap[date] = { date, 零钱: 0, 投资: 0, 定期存款: 0, total: 0 };
    trendMap[date][s.asset_category] = Math.max(trendMap[date][s.asset_category], s.balance);
  }

  // Add deposit values to 定期存款 category
  const deposits = db.prepare(
    'SELECT * FROM time_deposits WHERE user_id = ?'
  ).all(userId);

  const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  for (const point of trendData) {
    point.total = point['零钱'] + point['投资'] + point['定期存款'];
  }

  // If no data, return empty with a message
  if (trendData.length === 0) {
    // Return current state as single data point
    const accounts = db.prepare(
      'SELECT asset_category, current_balance FROM accounts WHERE user_id = ?'
    ).all(userId);
    const point = { date: new Date().toISOString().split('T')[0], 零钱: 0, 投资: 0, 定期存款: 0, total: 0 };
    for (const a of accounts) {
      point[a.asset_category] = (point[a.asset_category] || 0) + a.current_balance;
    }
    // Add deposit values
    for (const d of deposits) {
      if (d.status === 'active') {
        const calc = computeCurrentValue(d.principal, d.start_date, d.end_date, d.annual_rate);
        point['定期存款'] += calc.currentValue;
      }
    }
    point.total = point['零钱'] + point['投资'] + point['定期存款'];
    return res.json([point]);
  }

  res.json(trendData);
});

// GET /api/analytics/distribution
router.get('/distribution', (req, res) => {
  const userId = req.userId;
  const groupBy = req.query.groupBy || 'asset_category'; // or 'type'

  const accounts = db.prepare(
    `SELECT ${groupBy} as grp, COALESCE(SUM(current_balance), 0) as total
     FROM accounts WHERE user_id = ?
     GROUP BY grp`
  ).all(userId);

  // Add deposit values to 定期存款 category if grouping by asset_category
  const deposits = db.prepare(
    'SELECT * FROM time_deposits WHERE user_id = ? AND status = ?'
  ).all(userId, 'active');

  if (groupBy === 'asset_category') {
    let depositTotal = 0;
    for (const d of deposits) {
      const calc = computeCurrentValue(d.principal, d.start_date, d.end_date, d.annual_rate);
      depositTotal += calc.currentValue;
    }
    const existing = accounts.find(a => a.grp === '定期存款');
    if (existing) {
      existing.total += depositTotal;
    } else if (depositTotal > 0) {
      accounts.push({ grp: '定期存款', total: depositTotal });
    }
  }

  res.json(accounts.filter(a => a.total > 0));
});

// GET /api/analytics/monthly
router.get('/monthly', (req, res) => {
  const userId = req.userId;
  const rows = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
     FROM income_expenses WHERE user_id = ?
     GROUP BY month, type
     ORDER BY month ASC`
  ).all(userId);

  const summaryMap = {};
  for (const row of rows) {
    if (!summaryMap[row.month]) summaryMap[row.month] = { month: row.month, income: 0, expense: 0 };
    summaryMap[row.month][row.type] = row.total;
  }

  res.json(Object.values(summaryMap));
});

// Build cash flows for XIRR from adjustment records + deposits + current state
function buildCashFlows(userId, currentTotalAssets) {
  const cashFlows = [];

  // 1. Adjustment records for investment accounts (inflows are negative, outflows positive)
  const adjustments = db.prepare(
    `SELECT ar.adjustment_amount, ar.created_at, a.asset_category
     FROM adjustment_records ar
     JOIN accounts a ON ar.account_id = a.id
     WHERE a.user_id = ? AND a.asset_category = '投资'
     ORDER BY ar.created_at ASC`
  ).all(userId);

  for (const adj of adjustments) {
    // Money put in (positive adjustment) = negative cash flow (investment)
    // Money taken out (negative adjustment) = positive cash flow (return)
    cashFlows.push({
      date: adj.created_at.split('T')[0],
      amount: -adj.adjustment_amount, // invert: inflow = negative
    });
  }

  // 2. Deposit purchases (negative = money invested) and redemptions (positive)
  const depositFlows = db.prepare(
    `SELECT principal, start_date, redeemed_amount, redeemed_at, status
     FROM time_deposits WHERE user_id = ?`
  ).all(userId);

  for (const d of depositFlows) {
    cashFlows.push({
      date: d.start_date,
      amount: -d.principal, // buying deposit = outflow
    });
    if (d.status === 'redeemed' && d.redeemed_amount) {
      cashFlows.push({
        date: d.redeemed_at.split('T')[0],
        amount: d.redeemed_amount, // redemption = inflow
      });
    }
  }

  // 3. Current total as final inflow
  cashFlows.push({
    date: new Date().toISOString().split('T')[0],
    amount: currentTotalAssets,
  });

  return cashFlows.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = router;
