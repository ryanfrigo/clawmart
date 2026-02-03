const request = require('supertest');
const app = require('./server');

describe('Clawmart API', () => {
  test('GET /api/health returns operational status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('operational');
  });

  test('GET /api/v1/skills returns skills list', async () => {
    const res = await request(app).get('/api/v1/skills');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  test('GET /api/v1/skills/:id returns specific skill', async () => {
    const res = await request(app).get('/api/v1/skills/web-search@1.5.0');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('web-search');
  });

  test('GET /api/v1/search?q=weather returns results', async () => {
    const res = await request(app).get('/api/v1/search?q=weather');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('GET /api/v1/leaderboard returns leaderboard', async () => {
    const res = await request(app).get('/api/v1/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/v1/tags returns tags', async () => {
    const res = await request(app).get('/api/v1/tags');
    expect(res.status).toBe(200);
    expect(res.body.tags).toBeDefined();
  });
});
