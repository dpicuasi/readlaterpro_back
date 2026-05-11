const request = require('supertest');
const app = require('../../app');

const DEFAULT_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123',
};

/**
 * Registra un usuario y devuelve { token, user }.
 */
const registerAndLogin = async (overrides = {}) => {
  const payload = { ...DEFAULT_USER, ...overrides };

  const regRes = await request(app).post('/api/auth/register').send(payload);
  if (regRes.status !== 201) {
    // Si ya existe, hace login directamente
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password });
    return { token: loginRes.body.token, user: loginRes.body.user };
  }

  return { token: regRes.body.token, user: regRes.body.user };
};

/**
 * Helper: devuelve Authorization header con Bearer token.
 */
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { registerAndLogin, authHeader, DEFAULT_USER };
