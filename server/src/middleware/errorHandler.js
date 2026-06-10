function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
