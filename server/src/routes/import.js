const express = require('express');
const multer = require('multer');
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Configure multer for file upload (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  let importData;
  try {
    importData = JSON.parse(req.file.buffer.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: '文件格式错误，无法解析 JSON' });
  }

  // Validate structure
  if (!importData.version) {
    return res.status(400).json({ error: '无效的备份文件：缺少版本号' });
  }
  if (!importData.accounts || !importData.income_expenses) {
    return res.status(400).json({ error: '无效的备份文件：缺少必要数据字段' });
  }

  const requiredKeys = ['accounts', 'balance_snapshots', 'adjustment_records', 'time_deposits', 'income_expenses'];
  for (const key of requiredKeys) {
    if (!Array.isArray(importData[key])) {
      return res.status(400).json({ error: `无效的备份文件：${key} 格式错误` });
    }
  }

  // Perform import in a transaction — replace all current user data
  const userId = req.userId;

  try {
    const importTransaction = db.transaction(() => {
      // Clear existing user data (cascading: accounts → snapshots, adjustments, deposits)
      db.prepare('DELETE FROM income_expenses WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM time_deposits WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM balance_snapshots WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM adjustment_records WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM accounts WHERE user_id = ?').run(userId);

      // Import accounts — track old-to-new ID mapping
      const accountIdMap = {};
      const insertAccount = db.prepare(
        'INSERT INTO accounts (user_id, name, type, asset_category, current_balance, last_updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const acc of importData.accounts) {
        const result = insertAccount.run(userId, acc.name, acc.type, acc.asset_category, acc.current_balance, acc.last_updated_at || acc.created_at, acc.created_at);
        accountIdMap[acc.id] = result.lastInsertRowid;
      }

      // Import balance_snapshots
      const insertSnapshot = db.prepare(
        'INSERT INTO balance_snapshots (account_id, balance, recorded_at, note) VALUES (?, ?, ?, ?)'
      );
      for (const snap of importData.balance_snapshots) {
        const newAccountId = accountIdMap[snap.account_id];
        if (newAccountId) {
          insertSnapshot.run(newAccountId, snap.balance, snap.recorded_at, snap.note || '');
        }
      }

      // Import adjustment_records
      const insertAdjustment = db.prepare(
        'INSERT INTO adjustment_records (account_id, old_balance, new_balance, adjustment_amount, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const adj of importData.adjustment_records) {
        const newAccountId = accountIdMap[adj.account_id];
        if (newAccountId) {
          insertAdjustment.run(newAccountId, adj.old_balance, adj.new_balance, adj.adjustment_amount, adj.type, adj.note || '', adj.created_at);
        }
      }

      // Import time_deposits
      const insertDeposit = db.prepare(
        'INSERT INTO time_deposits (user_id, account_id, principal, start_date, end_date, annual_rate, status, redeemed_at, redeemed_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const dep of importData.time_deposits) {
        const newAccountId = accountIdMap[dep.account_id];
        if (newAccountId) {
          insertDeposit.run(userId, newAccountId, dep.principal, dep.start_date, dep.end_date, dep.annual_rate, dep.status || 'active', dep.redeemed_at || null, dep.redeemed_amount || null, dep.created_at);
        }
      }

      // Import income_expenses
      const insertTransaction = db.prepare(
        'INSERT INTO income_expenses (user_id, type, amount, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const tx of importData.income_expenses) {
        insertTransaction.run(userId, tx.type, tx.amount, tx.category, tx.description || '', tx.date, tx.created_at);
      }
    });

    importTransaction();

    // Return summary
    res.json({
      message: '数据导入成功',
      summary: {
        accounts: importData.accounts.length,
        snapshots: importData.balance_snapshots.length,
        adjustments: importData.adjustment_records.length,
        deposits: importData.time_deposits.length,
        transactions: importData.income_expenses.length,
      },
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: '数据导入失败，已回滚', detail: err.message });
  }
});

module.exports = router;
