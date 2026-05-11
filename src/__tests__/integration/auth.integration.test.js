const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/testDb');
const { authHeader } = require('../helpers/testUtils');

beforeAll(() => db.connect());
afterAll(() => db.disconnect());
afterEach(() => db.clearCollections());

const VALID_USER = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Secret123',
};

describe('POST /api/auth/register', () => {
  it('registra un usuario nuevo y devuelve token + user', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('devuelve 409 si el email ya está registrado', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(409);
  });

  it('devuelve 400 si el email es inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'no-es-email' });

    expect(res.status).toBe(400);
  });

  it('devuelve 400 si la contraseña es muy corta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() =>
    request(app).post('/api/auth/register').send(VALID_USER)
  );

  it('devuelve token con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('devuelve 401 con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('devuelve 401 si el usuario no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@example.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);
    token = res.body.token;
  });

  it('devuelve el usuario autenticado con token válido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('devuelve 401 con token malformado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set({ Authorization: 'Bearer token-invalido' });

    expect(res.status).toBe(401);
  });
});
