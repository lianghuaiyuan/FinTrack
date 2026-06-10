const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db/connection');
let token; let accountId;

beforeEach(() => {
  ['income_expenses','time_deposits','balance_snapshots','adjustment_records','accounts','users'].forEach(t => db.prepare(`DELETE FROM ${t}`).run());
  const reg = request(app).post('/api/auth/register').send({username:'tester',password:'test123'});
});

async function getToken() {
  const res = await request(app).post('/api/auth/register').send({username:'u'+Date.now(),password:'test123'});
  return res.body.token;
}

describe('Accounts API', () => {
  beforeEach(async () => { token = await getToken(); });

  it('POST /api/accounts - create account', async () => {
    const res = await request(app).post('/api/accounts').set('Authorization',`Bearer ${token}`).send({name:'微信零钱',type:'零钱',asset_category:'零钱',current_balance:1000});
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('微信零钱');
    accountId = res.body.id;
  });

  it('GET /api/accounts - list accounts', async () => {
    await request(app).post('/api/accounts').set('Authorization',`Bearer ${token}`).send({name:'账户A',type:'零钱',asset_category:'零钱',current_balance:500});
    const res = await request(app).get('/api/accounts').set('Authorization',`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('POST /api/accounts/:id/set-balance', async () => {
    const acc = await request(app).post('/api/accounts').set('Authorization',`Bearer ${token}`).send({name:'测试',type:'零钱',asset_category:'零钱',current_balance:100});
    const res = await request(app).post(`/api/accounts/${acc.body.id}/set-balance`).set('Authorization',`Bearer ${token}`).send({balance:500,note:'更新'});
    expect(res.status).toBe(200);
    expect(res.body.account.current_balance).toBe(500);
  });

  it('POST /api/accounts/:id/adjust', async () => {
    const acc = await request(app).post('/api/accounts').set('Authorization',`Bearer ${token}`).send({name:'测试',type:'零钱',asset_category:'零钱',current_balance:100});
    const res = await request(app).post(`/api/accounts/${acc.body.id}/adjust`).set('Authorization',`Bearer ${token}`).send({amount:50,note:'加钱'});
    expect(res.status).toBe(200);
    expect(res.body.account.current_balance).toBe(150);
  });

  it('DELETE /api/accounts/:id', async () => {
    const acc = await request(app).post('/api/accounts').set('Authorization',`Bearer ${token}`).send({name:'待删',type:'零钱',asset_category:'零钱',current_balance:0});
    const res = await request(app).delete(`/api/accounts/${acc.body.id}`).set('Authorization',`Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

afterAll(() => { db.close(); });
