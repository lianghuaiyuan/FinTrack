const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db/connection');
let token; let accountId;

async function getToken() {
  const res = await request(app).post('/api/auth/register').send({username:'u'+Date.now(),password:'test123'});
  return res.body.token;
}
async function createAccount(tok) {
  const res = await request(app).post('/api/accounts').set('Authorization',`Bearer ${tok}`).send({name:'定存账户',type:'银行',asset_category:'定期存款',current_balance:10000});
  return res.body.id;
}

describe('Deposits API', () => {
  beforeEach(async () => { token = await getToken(); accountId = await createAccount(token); });

  it('POST /api/deposits - create', async () => {
    const res = await request(app).post('/api/deposits').set('Authorization',`Bearer ${token}`).send({principal:10000,start_date:'2025-01-01',end_date:'2026-01-01',annual_rate:0.03,account_id:accountId});
    expect(res.status).toBe(201);
    expect(res.body.principal).toBe(10000);
  });

  it('GET /api/deposits - list with computed values', async () => {
    await request(app).post('/api/deposits').set('Authorization',`Bearer ${token}`).send({principal:10000,start_date:'2025-01-01',end_date:'2026-01-01',annual_rate:0.03,account_id:accountId});
    const res = await request(app).get('/api/deposits').set('Authorization',`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('current_value');
    expect(res.body[0]).toHaveProperty('days_remaining');
  });

  it('POST /api/deposits/:id/redeem', async () => {
    const dep = await request(app).post('/api/deposits').set('Authorization',`Bearer ${token}`).send({principal:1000,start_date:'2020-01-01',end_date:'2021-01-01',annual_rate:0.02,account_id:accountId});
    const res = await request(app).post(`/api/deposits/${dep.body.id}/redeem`).set('Authorization',`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deposit.status).toBe('redeemed');
  });
});

afterAll(() => { db.close(); });
