const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db/connection');

beforeEach(() => {
  db.prepare('DELETE FROM income_expenses').run();
  db.prepare('DELETE FROM time_deposits').run();
  db.prepare('DELETE FROM balance_snapshots').run();
  db.prepare('DELETE FROM adjustment_records').run();
  db.prepare('DELETE FROM accounts').run();
  db.prepare('DELETE FROM users').run();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.username).toBe('testuser');
    });

    it('should reject duplicate username', async () => {
      await request(app).post('/api/auth/register').send({ username: 'testuser', password: 'password123' });
      const res = await request(app).post('/api/auth/register').send({ username: 'testuser', password: 'password456' });
      expect(res.status).toBe(409);
    });

    it('should reject short username', async () => {
      const res = await request(app).post('/api/auth/register').send({ username: 'ab', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/auth/register').send({ username: 'testuser', password: '12345' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({ username: 'testuser', password: 'password123' });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'testuser', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'testuser', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const reg = await request(app).post('/api/auth/register').send({ username: 'testuser', password: 'password123' });
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

afterAll(() => { db.close(); });
