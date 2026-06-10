const express = require('express');
const { body } = require('express-validator');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { computeCurrentValue } = require('../utils/depositCalc');

const router = express.Router();
router.use(authMiddleware);

// GET /api/deposits
router.get('/', (req, res) => {
  const deposits = db.prepare(
    `SELECT d.*, a.name as account_name, a.type as account_type
     FROM time_deposits d
     JOIN accounts a ON d.account_id = a.id
     WHERE d.user_id = ?
     ORDER BY d.status ASC, d.end_date ASC`
  ).all(req.userId);

  // Compute current value for each deposit
  const enriched = deposits.map(d => {
    const calc = computeCurrentValue(d.principal, d.start_date, d.end_date, d.annual_rate);
    return {
      ...d,
      current_value: d.status === 'redeemed' ? d.redeemed_amount : calc.currentValue,
      days_held: calc.daysHeld,
      days_remaining: calc.daysRemaining,
      interest_earned: d.status === 'redeemed' ? d.redeemed_amount - d.principal : calc.interestEarned,
      is_matured: calc.isMatured,
    };
  });

  res.json(enriched);
});

// POST /api/deposits
router.post(
  '/',
  [
    body('principal').isFloat({ gt: 0 }).withMessage('本金必须大于0'),
    body('start_date').isDate().withMessage('请输入有效的起息日'),
    body('end_date').isDate().withMessage('请输入有效的到期日'),
    body('annual_rate').isFloat({ gt: 0, lt: 1 }).withMessage('年利率须在 0-1 之间'),
    body('account_id').isInt().withMessage('请选择关联账户'),
  ],
  validate,
  (req, res) => {
    const { principal, start_date, end_date, annual_rate, account_id } = req.body;

    // Verify account belongs to user
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(account_id, req.userId);
    if (!account) return res.status(404).json({ error: '关联账户不存在' });

    // Validate dates
    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: '到期日必须晚于起息日' });
    }

    const result = db.prepare(
      `INSERT INTO time_deposits (user_id, account_id, principal, start_date, end_date, annual_rate)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(req.userId, account_id, principal, start_date, end_date, annual_rate);

    const deposit = db.prepare('SELECT * FROM time_deposits WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(deposit);
  }
);

// PUT /api/deposits/:id
router.put(
  '/:id',
  [
    body('principal').optional().isFloat({ gt: 0 }),
    body('start_date').optional().isDate(),
    body('end_date').optional().isDate(),
    body('annual_rate').optional().isFloat({ gt: 0, lt: 1 }),
  ],
  validate,
  (req, res) => {
    const deposit = db.prepare(
      'SELECT * FROM time_deposits WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!deposit) return res.status(404).json({ error: '定存不存在' });
    if (deposit.status !== 'active') return res.status(400).json({ error: '只能修改活跃的定存' });

    const principal = req.body.principal !== undefined ? req.body.principal : deposit.principal;
    const startDate = req.body.start_date || deposit.start_date;
    const endDate = req.body.end_date || deposit.end_date;
    const annualRate = req.body.annual_rate !== undefined ? req.body.annual_rate : deposit.annual_rate;

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: '到期日必须晚于起息日' });
    }

    db.prepare(
      'UPDATE time_deposits SET principal=?, start_date=?, end_date=?, annual_rate=? WHERE id=?'
    ).run(principal, startDate, endDate, annualRate, deposit.id);

    const updated = db.prepare('SELECT * FROM time_deposits WHERE id = ?').get(deposit.id);
    res.json(updated);
  }
);

// POST /api/deposits/:id/redeem
router.post('/:id/redeem', (req, res) => {
  const deposit = db.prepare(
    'SELECT * FROM time_deposits WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!deposit) return res.status(404).json({ error: '定存不存在' });
  if (deposit.status !== 'active') return res.status(400).json({ error: '该定存已赎回' });

  const calc = computeCurrentValue(deposit.principal, deposit.start_date, deposit.end_date, deposit.annual_rate);
  const redeemAmount = calc.currentValue;

  const redeemTransaction = db.transaction(() => {
    // Mark deposit as redeemed
    db.prepare(
      'UPDATE time_deposits SET status=?, redeemed_at=datetime(\'now\'), redeemed_amount=? WHERE id=?'
    ).run('redeemed', redeemAmount, deposit.id);

    // Add redemption amount to linked account
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(deposit.account_id);
    const newBalance = account.current_balance + redeemAmount;
    db.prepare('UPDATE accounts SET current_balance=?, last_updated_at=datetime(\'now\') WHERE id=?').run(newBalance, account.id);

    // Record adjustment
    db.prepare(
      'INSERT INTO adjustment_records (account_id, old_balance, new_balance, adjustment_amount, type, note) VALUES (?,?,?,?,?,?)'
    ).run(account.id, account.current_balance, newBalance, redeemAmount, 'adjust', `定存赎回: ${deposit.principal}元本金 + ${calc.interestEarned}元利息`);

    // Snapshot
    db.prepare('INSERT INTO balance_snapshots (account_id, balance, note) VALUES (?,?,?)').run(account.id, newBalance, `定存赎回`);
  });
  redeemTransaction();

  res.json({ deposit: { ...deposit, status: 'redeemed', redeemed_amount: redeemAmount }, redeemAmount, interest: calc.interestEarned });
});

// DELETE /api/deposits/:id
router.delete('/:id', (req, res) => {
  const deposit = db.prepare(
    'SELECT * FROM time_deposits WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!deposit) return res.status(404).json({ error: '定存不存在' });
  if (deposit.status !== 'active') return res.status(400).json({ error: '只能删除活跃定存' });

  db.prepare('DELETE FROM time_deposits WHERE id = ?').run(deposit.id);
  res.json({ message: '定存已删除' });
});

module.exports = router;
