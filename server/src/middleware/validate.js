const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: '输入验证失败', details: errors.array() });
  }
  next();
}

module.exports = { validate };
