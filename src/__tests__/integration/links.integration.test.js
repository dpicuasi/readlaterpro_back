const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/testDb');
const { registerAndLogin, authHeader } = require('../helpers/testUtils');

// Mockeamos los servicios externos para no hacer peticiones HTTP reales
jest.mock('../../services/metadataService', () => ({
  fetchMetadata: jest.fn().mockResolvedValue({
    title: 'Artículo de prueba',
    summary: 'Este es un resumen de prueba suficientemente largo para superar el umbral mínimo de caracteres.',
    domain: 'example.com',
    sourceType: 'web',
    imageUrl: null,
    favicon: null,
  }),
  getSourceType: jest.fn().mockReturnValue('web'),
}));

jest.mock('../../services/openrouterService', () => ({
  needsEnhancement: jest.fn().mockReturnValue(false),
  enhanceWithAI: jest.fn().mockResolvedValue(null),
  generateRichSummary: jest.fn().mockResolvedValue({ content: '', keyPoints: [] }),
}));

beforeAll(() => db.connect());
afterAll(() => db.disconnect());
afterEach(() => db.clearCollections());

const VALID_URL = 'https://example.com/articulo-de-prueba';

describe('POST /api/links', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await registerAndLogin());
  });

  it('crea un link con URL válida', async () => {
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: VALID_URL });

    expect(res.status).toBe(201);
    expect(res.body.link.url).toBe(VALID_URL);
    expect(res.body.link.domain).toBe('example.com');
  });

  it('devuelve 400 con URL inválida', async () => {
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: 'no-es-url' });

    expect(res.status).toBe(400);
  });

  it('respeta el título personalizado', async () => {
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: VALID_URL, title: 'Mi título' });

    expect(res.status).toBe(201);
    expect(res.body.link.title).toBe('Mi título');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: VALID_URL });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/links', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    await request(app).post('/api/links').set(authHeader(token)).send({ url: VALID_URL });
    await request(app).post('/api/links').set(authHeader(token)).send({ url: 'https://otro.com/post' });
  });

  it('lista los links del usuario con paginación', async () => {
    const res = await request(app).get('/api/links').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
  });

  it('filtra por status=pending', async () => {
    const res = await request(app)
      .get('/api/links?status=pending')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.items.every((l) => l.status === 'pending')).toBe(true);
  });

  it('no devuelve links de otro usuario', async () => {
    const { token: otherToken } = await registerAndLogin({ email: 'otro@example.com' });
    const res = await request(app).get('/api/links').set(authHeader(otherToken));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/links/:id', () => {
  let token;
  let linkId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: VALID_URL });
    linkId = res.body.link._id;
  });

  it('devuelve el link por ID', async () => {
    const res = await request(app)
      .get(`/api/links/${linkId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.link._id).toBe(linkId);
  });

  it('devuelve 404 para ID inexistente', async () => {
    const res = await request(app)
      .get('/api/links/000000000000000000000001')
      .set(authHeader(token));

    expect(res.status).toBe(404);
  });

  it('devuelve 400 para ID malformado', async () => {
    const res = await request(app)
      .get('/api/links/id-invalido')
      .set(authHeader(token));

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/links/:id', () => {
  let token;
  let linkId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: VALID_URL });
    linkId = res.body.link._id;
  });

  it('actualiza el status a read', async () => {
    const res = await request(app)
      .patch(`/api/links/${linkId}`)
      .set(authHeader(token))
      .send({ status: 'read' });

    expect(res.status).toBe(200);
    expect(res.body.link.status).toBe('read');
  });

  it('actualiza isFavorite', async () => {
    const res = await request(app)
      .patch(`/api/links/${linkId}`)
      .set(authHeader(token))
      .send({ isFavorite: true });

    expect(res.status).toBe(200);
    expect(res.body.link.isFavorite).toBe(true);
  });

  it('actualiza priority', async () => {
    const res = await request(app)
      .patch(`/api/links/${linkId}`)
      .set(authHeader(token))
      .send({ priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.link.priority).toBe('high');
  });

  it('devuelve 400 con status inválido', async () => {
    const res = await request(app)
      .patch(`/api/links/${linkId}`)
      .set(authHeader(token))
      .send({ status: 'invalido' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/links/:id', () => {
  let token;
  let linkId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/links')
      .set(authHeader(token))
      .send({ url: VALID_URL });
    linkId = res.body.link._id;
  });

  it('elimina el link y devuelve 204', async () => {
    const res = await request(app)
      .delete(`/api/links/${linkId}`)
      .set(authHeader(token));

    expect(res.status).toBe(204);

    const check = await request(app)
      .get(`/api/links/${linkId}`)
      .set(authHeader(token));
    expect(check.status).toBe(404);
  });

  it('devuelve 404 al eliminar un link inexistente', async () => {
    const res = await request(app)
      .delete('/api/links/000000000000000000000001')
      .set(authHeader(token));

    expect(res.status).toBe(404);
  });

  it('no permite eliminar links de otro usuario', async () => {
    const { token: otherToken } = await registerAndLogin({ email: 'otro@example.com' });
    const res = await request(app)
      .delete(`/api/links/${linkId}`)
      .set(authHeader(otherToken));

    expect(res.status).toBe(404);
  });
});
