const express = require('express');
const { body } = require('express-validator');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authMiddleware);

// GET /api/transactions
router.get('/', (req, res) => {
  const { type, category, startDate, endDate, limit = 200 } = req.query;
  let sql = 'SELECT * FROM income_expenses WHERE user_id = ?';
  const params = [req.userId];

  if (type && type !== 'all') {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY date DESC, created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const transactions = db.prepare(sql).all(...params);
  res.json(transactions);
});

// GET /api/transactions/summary
router.get('/summary', (req, res) => {
  // Monthly summary grouped by type
  const rows = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
     FROM income_expenses WHERE user_id = ?
     GROUP BY month, type
     ORDER BY month ASC`
  ).all(req.userId);

  // Pivot into { month, income, expense }
  const summaryMap = {};
  for (const row of rows) {
    if (!summaryMap[row.month]) summaryMap[row.month] = { month: row.month, income: 0, expense: 0 };
    summaryMap[row.month][row.type] = row.total;
  }
  res.json(Object.values(summaryMap));
});

// GET /api/transactions/categories
router.get('/categories', (req, res) => {
  const type = req.query.type || 'expense';
  const rows = db.prepare(
    'SELECT DISTINCT category FROM income_expenses WHERE user_id = ? AND type = ?'
  ).all(req.userId, type);

  // Also return defaults
  const defaultIncome = ['工资', '奖金', '兼职', '投资', '其他'];
  const defaultExpense = ['餐饮', '房租', '交通', '购物', '娱乐', '医疗', '教育', '其他'];

  const existing = rows.map(r => r.category);
  const defaults = type === 'income' ? defaultIncome : defaultExpense;
  const all = [...new Set([...defaults, ...existing])];
  res.json(all);
});

// POST /api/transactions
router.post(
  '/',
  [
    body('type').isIn(['income', 'expense']).withMessage('类型无效'),
    body('amount').isFloat({ gt: 0 }).withMessage('金额必须大于0'),
    body('category').notEmpty().withMessage('请选择分类'),
    body('date').isDate().withMessage('请输入有效日期'),
  ],
  validate,
  (req, res) => {
    const { type, amount, category, description = '', date } = req.body;
    const result = db.prepare(
      'INSERT INTO income_expenses (user_id, type, amount, category, description, date) VALUES (?,?,?,?,?,?)'
    ).run(req.userId, type, amount, category, description, date);

    const record = db.prepare('SELECT * FROM income_expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
  }
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  [
    body('type').optional().isIn(['income', 'expense']),
    body('amount').optional().isFloat({ gt: 0 }),
    body('category').optional().notEmpty(),
    body('date').optional().isDate(),
  ],
  validate,
  (req, res) => {
    const record = db.prepare(
      'SELECT * FROM income_expenses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!record) return res.status(404).json({ error: '记录不存在' });

    const type = req.body.type || record.type;
    const amount = req.body.amount !== undefined ? req.body.amount : record.amount;
    const category = req.body.category || record.category;
    const description = req.body.description !== undefined ? req.body.description : record.description;
    const date = req.body.date || record.date;

    db.prepare(
      'UPDATE income_expenses SET type=?, amount=?, category=?, description=?, date=? WHERE id=?'
    ).run(type, amount, category, description, date, record.id);

    const updated = db.prepare('SELECT * FROM income_expenses WHERE id = ?').get(record.id);
    res.json(updated);
  }
);

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const record = db.prepare(
    'SELECT * FROM income_expenses WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  db.prepare('DELETE FROM income_expenses WHERE id = ?').run(record.id);
  res.json({ message: '记录已删除' });
});

module.exports = router;
