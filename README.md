# ReadLaterPro Backend

API REST para capturar links, ordenarlos por colecciones y enriquecerlos con metadatos básicos.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticación
- Axios + Cheerio para extracción inicial de metadatos

## Ejecutar localmente

```bash
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000/api`.

## Endpoints iniciales

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/links`
- `POST /api/links`
- `GET /api/links/:id`
- `PATCH /api/links/:id`
- `DELETE /api/links/:id`
- `GET /api/collections`
- `POST /api/collections`
- `GET /api/collections/:id`
- `PATCH /api/collections/:id`
- `DELETE /api/collections/:id`

Los endpoints de links y colecciones requieren header `Authorization: Bearer <token>`.
