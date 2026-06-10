const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.isAdmin = decoded.isAdmin || false;
    next();
  } catch (err) {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.adminMiddleware = adminMiddleware;
