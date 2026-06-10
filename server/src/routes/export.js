const express = require('express');
const xlsx = require('node-xlsx');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { generateCSV } = require('../utils/csvWriter');
const { computeCurrentValue } = require('../utils/depositCalc');

const router = express.Router();
router.use(authMiddleware);

// GET /api/export/transactions?format=csv
router.get('/transactions', (req, res) => {
  const transactions = db.prepare(
    'SELECT type, amount, category, description, date FROM income_expenses WHERE user_id = ? ORDER BY date DESC'
  ).all(req.userId);

  const labels = { type: '类型', amount: '金额', category: '分类', description: '备注', date: '日期' };
  const csv = generateCSV(transactions, ['date', 'type', 'category', 'amount', 'description'], labels);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=fintrack_transactions_${formatDate()}.csv`);
  res.send(csv);
});

// GET /api/export/assets?format=xlsx
router.get('/assets', (req, res) => {
  const accounts = db.prepare(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY type, name'
  ).all(req.userId);

  const deposits = db.prepare(
    'SELECT * FROM time_deposits WHERE user_id = ? AND status = ?'
  ).all(req.userId, 'active');

  const data = [['账户名称', '类型', '资产类别', '当前余额/市值', '最后更新时间']];

  for (const acc of accounts) {
    data.push([acc.name, acc.type, acc.asset_category, acc.current_balance.toFixed(2), acc.last_updated_at]);
  }

  // Add deposits section
  data.push([]);
  data.push(['定期存款 (活跃)']);
  data.push(['本金', '起息日', '到期日', '年利率', '当前本息和', '关联账户']);

  for (const dep of deposits) {
    const calc = computeCurrentValue(dep.principal, dep.start_date, dep.end_date, dep.annual_rate);
    const acc = db.prepare('SELECT name FROM accounts WHERE id = ?').get(dep.account_id);
    data.push([dep.principal.toFixed(2), dep.start_date, dep.end_date, `${(dep.annual_rate * 100).toFixed(2)}%`, calc.currentValue.toFixed(2), acc?.name || '']);
  }

  const buffer = xlsx.build([{ name: '资产总览', data }]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=fintrack_assets_${formatDate()}.xlsx`);
  res.send(buffer);
});

// GET /api/export/all — export all user data as JSON
router.get('/all', (req, res) => {
  const userId = req.userId;

  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
  const snapshots = db.prepare(
    `SELECT s.* FROM balance_snapshots s JOIN accounts a ON s.account_id = a.id WHERE a.user_id = ?`
  ).all(userId);
  const adjustments = db.prepare(
    `SELECT r.* FROM adjustment_records r JOIN accounts a ON r.account_id = a.id WHERE a.user_id = ?`
  ).all(userId);
  const deposits = db.prepare('SELECT * FROM time_deposits WHERE user_id = ?').all(userId);
  const transactions = db.prepare('SELECT * FROM income_expenses WHERE user_id = ?').all(userId);
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);

  const exportData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    user: { username: user.username },
    accounts,
    balance_snapshots: snapshots,
    adjustment_records: adjustments,
    time_deposits: deposits,
    income_expenses: transactions,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=fintrack_backup_${formatDate()}.json`);
  res.json(exportData);
});

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

module.exports = router;
