const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const db = require("../db/connection");
const config = require("../config");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

router.post("/register", [
  body("username").isLength({ min: 3, max: 20 }).withMessage("用户名需3-20个字符"),
  body("password").isLength({ min: 6 }).withMessage("密码至少6个字符"),
], validate, (req, res) => {
  const { username, password } = req.body;
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return res.status(409).json({ error: "用户名已存在" });
  const hash = bcrypt.hashSync(password, config.BCRYPT_ROUNDS);
  const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  const token = jwt.sign({ userId: result.lastInsertRowid, username, isAdmin: false }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  res.status(201).json({ token, userId: result.lastInsertRowid, username });
});

router.post("/login", [
  body("username").notEmpty().withMessage("请输入用户名"),
  body("password").notEmpty().withMessage("请输入密码"),
], validate, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "用户名或密码错误" });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "用户名或密码错误" });
  const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: !!user.is_admin }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  res.json({ token, userId: user.id, username: user.username, isAdmin: !!user.is_admin });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ userId: req.userId, username: req.username });
});

router.put("/password", authMiddleware, [
  body("oldPassword").notEmpty().withMessage("请输入当前密码"),
  body("newPassword").isLength({ min: 6 }).withMessage("新密码至少6个字符"),
], validate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) return res.status(400).json({ error: "当前密码错误" });
  const hash = bcrypt.hashSync(newPassword, config.BCRYPT_ROUNDS);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.userId);
  res.json({ message: "密码已修改" });
});

router.delete("/account", authMiddleware, (req, res) => {
  const uid = req.userId;
  const t = db.transaction(() => {
    db.prepare("DELETE FROM income_expenses WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM time_deposits WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM balance_snapshots WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)").run(uid);
    db.prepare("DELETE FROM adjustment_records WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)").run(uid);
    db.prepare("DELETE FROM accounts WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM users WHERE id = ?").run(uid);
  });
  t();
  res.json({ message: "账户已删除" });
});

module.exports = router;
