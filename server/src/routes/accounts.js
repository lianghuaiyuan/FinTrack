const express = require('express');
const { body } = require('express-validator');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authMiddleware);

// GET /api/accounts
router.get('/', (req, res) => {
  const accounts = db.prepare(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json(accounts);
});

// GET /api/accounts/:id
router.get('/:id', (req, res) => {
  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!account) return res.status(404).json({ error: '账户不存在' });
  res.json(account);
});

// POST /api/accounts
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('账户名称不能为空'),
    body('type').isIn(['零钱','银行','证券投资','其他']).withMessage('账户类型无效'),
    body('asset_category').isIn(['零钱','定期存款','投资']).withMessage('资产类别无效'),
    body('current_balance').optional().isFloat({ min: 0 }).withMessage('余额不能为负'),
  ],
  validate,
  (req, res) => {
    const { name, type, asset_category, current_balance = 0 } = req.body;
    const result = db.prepare(
      'INSERT INTO accounts (user_id, name, type, asset_category, current_balance) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, name, type, asset_category, current_balance);

    // Create initial snapshot
    if (current_balance > 0) {
      db.prepare('INSERT INTO balance_snapshots (account_id, balance, note) VALUES (?, ?, ?)').run(
        result.lastInsertRowid, current_balance, '账户创建'
      );
    }

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(account);
  }
);

// PUT /api/accounts/:id
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('账户名称不能为空'),
    body('type').optional().isIn(['零钱','银行','证券投资','其他']),
  ],
  validate,
  (req, res) => {
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ error: '账户不存在' });

    const name = req.body.name !== undefined ? req.body.name : account.name;
    const type = req.body.type !== undefined ? req.body.type : account.type;

    db.prepare('UPDATE accounts SET name = ?, type = ? WHERE id = ?').run(name, type, req.params.id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    res.json(updated);
  }
);

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!account) return res.status(404).json({ error: '账户不存在' });

  // Check for active deposits
  const activeDeposit = db.prepare(
    'SELECT id FROM time_deposits WHERE account_id = ? AND status = ?'
  ).get(req.params.id, 'active');
  if (activeDeposit) {
    return res.status(400).json({ error: '该账户存在未赎回的定期存款，无法删除' });
  }

  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ message: '账户已删除' });
});

// POST /api/accounts/:id/set-balance — overwrite balance (覆盖式更新)
router.post(
  '/:id/set-balance',
  [body('balance').isFloat({ min: 0 }).withMessage('余额必须为非负数')],
  validate,
  (req, res) => {
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ error: '账户不存在' });

    const newBalance = parseFloat(req.body.balance);
    const note = req.body.note || '手动更新余额';
    const oldBalance = account.current_balance;
    const adjustmentAmount = newBalance - oldBalance;

    const updateTransaction = db.transaction(() => {
      db.prepare('UPDATE accounts SET current_balance = ?, last_updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, account.id);
      db.prepare(
        'INSERT INTO adjustment_records (account_id, old_balance, new_balance, adjustment_amount, type, note) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(account.id, oldBalance, newBalance, adjustmentAmount, 'set', note);
      db.prepare('INSERT INTO balance_snapshots (account_id, balance, note) VALUES (?, ?, ?)').run(account.id, newBalance, note);
    });
    updateTransaction();

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);
    res.json({ account: updated, oldBalance, newBalance, adjustmentAmount });
  }
);

// POST /api/accounts/:id/adjust — adjust by delta (+/-)
router.post(
  '/:id/adjust',
  [body('amount').isFloat().withMessage('调整金额必须为数字')],
  validate,
  (req, res) => {
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ error: '账户不存在' });

    const amount = parseFloat(req.body.amount);
    const note = req.body.note || '手动调整';
    const oldBalance = account.current_balance;
    const newBalance = oldBalance + amount;

    if (newBalance < 0) {
      return res.status(400).json({ error: '调整后余额不能为负' });
    }

    const updateTransaction = db.transaction(() => {
      db.prepare('UPDATE accounts SET current_balance = ?, last_updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, account.id);
      db.prepare(
        'INSERT INTO adjustment_records (account_id, old_balance, new_balance, adjustment_amount, type, note) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(account.id, oldBalance, newBalance, amount, 'adjust', note);
      db.prepare('INSERT INTO balance_snapshots (account_id, balance, note) VALUES (?, ?, ?)').run(account.id, newBalance, note);
    });
    updateTransaction();

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);
    res.json({ account: updated, oldBalance, newBalance, adjustmentAmount: amount });
  }
);

// GET /api/accounts/:id/history
router.get('/:id/history', (req, res) => {
  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!account) return res.status(404).json({ error: '账户不存在' });

  const limit = parseInt(req.query.limit, 10) || 50;
  let query = 'SELECT * FROM adjustment_records WHERE account_id = ? ORDER BY created_at DESC LIMIT ?';
  const records = db.prepare(query).all(account.id, limit);
  res.json(records);
});

module.exports = router;
