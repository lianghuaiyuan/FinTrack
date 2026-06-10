const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const { initializeDatabase } = require('./db/schema');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const depositRoutes = require('./routes/deposits');
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const importRoutes = require('./routes/import');
const adminRoutes = require('./routes/admin');

// Initialize database
initializeDatabase();

const app = express();

// Middleware
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static files in production
const staticDir = path.resolve(__dirname, '../../client/dist');
if (require('fs').existsSync(staticDir)) {
  app.use(express.static(staticDir));
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticDir, 'index.html'));
    }
  });
  console.log('[FinTrack] Serving frontend from', staticDir);
}

// Error handler (must be last)
app.use(errorHandler);

// Start server only if run directly (not when required by tests)
if (require.main === module) {
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`[FinTrack] Server running on http://0.0.0.0:${config.PORT}`);
    console.log(`[FinTrack] Database: ${config.DB_PATH}`);
    console.log(`[FinTrack] Environment: ${config.NODE_ENV}`);
  });
}

module.exports = app; // for testing
