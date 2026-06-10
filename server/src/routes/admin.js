const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db/connection');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(
    `SELECT id, username, is_admin as isAdmin, created_at,
            (SELECT COUNT(*) FROM accounts WHERE user_id = u.id) as account_count,
            (SELECT COUNT(*) FROM time_deposits WHERE user_id = u.id) as deposit_count,
            (SELECT COUNT(*) FROM income_expenses WHERE user_id = u.id) as transaction_count
     FROM users u ORDER BY u.created_at DESC`
  ).all();
  res.json(users);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.userId) {
    return res.status(400).json({ error: '不能删除当前登录的账户，请使用「账号管理」中的删除功能' });
  }
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const t = db.transaction(() => {
    db.prepare('DELETE FROM income_expenses WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM time_deposits WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM balance_snapshots WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(targetId);
    db.prepare('DELETE FROM adjustment_records WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(targetId);
    db.prepare('DELETE FROM accounts WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  });
  t();
  res.json({ message: `用户「${user.username}」已删除` });
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password',
  [body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')],
  validate,
  (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const hash = bcrypt.hashSync(req.body.newPassword, config.BCRYPT_ROUNDS);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, targetId);
    res.json({ message: `用户「${user.username}」密码已重置` });
  }
);

// POST /api/admin/users/:id/toggle-admin
router.post('/users/:id/toggle-admin', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.userId) {
    return res.status(400).json({ error: '不能取消自己的管理员权限' });
  }
  const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const newStatus = user.is_admin ? 0 : 1;
  db.prepare("UPDATE users SET is_admin = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, targetId);
  const label = newStatus ? '设为管理员' : '取消管理员';
  res.json({ message: `用户「${user.username}」已${label}` });
});

module.exports = router;
