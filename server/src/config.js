const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DB_PATH: path.resolve(__dirname, '..', process.env.DB_PATH || './data/fintrack.db'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  BCRYPT_ROUNDS: 10,
  JWT_EXPIRES_IN: '7d',
};
