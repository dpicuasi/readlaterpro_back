const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// Umbral: si el resumen tiene menos de este nro de caracteres, llamamos al LLM
const SUMMARY_MIN_LENGTH = 80;

// Prompt optimizado para modelos free tier (instrucciones cortas, JSON directo)
const buildPrompt = (url, existingTitle, existingBody) => `Analiza este contenido web y responde SOLO con un objeto JSON válido, sin texto extra, sin markdown, sin bloques de código.

URL: ${url}
Título actual: ${existingTitle || 'no disponible'}
Contenido: ${existingBody || 'no disponible'}

Responde exactamente con este formato JSON:
{
  "title": "título claro y descriptivo en español, máximo 90 caracteres",
  "summary": "resumen en español de 2-3 oraciones que explique qué es y por qué es útil, máximo 300 caracteres",
  "tags": ["tag1", "tag2", "tag3"]
}

Reglas:
- title y summary siempre en español
- tags en minúsculas, máximo 5, sin espacios (usa guiones si es necesario)
- Si el contenido es código o técnico, menciona el lenguaje o tecnología
- No inventes información que no esté en el contenido`;

/**
 * Llama a OpenRouter con el modelo free tier configurado en .env.
 * Devuelve { title, summary, tags } o null si falla.
 */
const enhanceWithAI = async (url, existingTitle, existingContent) => {
  logger.info(`[OpenRouter] enhanceWithAI llamado — url: ${url}`);

  if (!env.openrouter.apiKey || env.openrouter.apiKey.startsWith('sk-or-xxx')) {
    logger.warn('[OpenRouter] ⚠️  API key no configurada (OPENROUTER_API_KEY) — saltando mejora con IA');
    return null;
  }

  logger.info(`[OpenRouter] 🚀 Enviando request al modelo: ${env.openrouter.model}`);
  const prompt = buildPrompt(url, existingTitle, existingContent);

  try {
    const response = await axios.post(
      `${env.openrouter.baseUrl}/chat/completions`,
      {
        model: env.openrouter.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${env.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://readlaterpro.app',
          'X-Title': 'ReadLaterPro',
        },
        timeout: 25000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content?.trim();
    logger.info(`[OpenRouter] ✅ Respuesta recibida (${raw?.length ?? 0} chars)`);
    if (!raw) {
      logger.warn('[OpenRouter] Respuesta vacía del modelo');
      return null;
    }

    // Limpia posibles bloques markdown que el modelo añada por error
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    logger.info(`[OpenRouter] 🎯 Parsed OK — title: "${parsed.title?.slice(0, 60)}" | summary: ${parsed.summary?.length ?? 0} chars | tags: [${parsed.tags?.join(', ')}]`);

    return {
      title: typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim().slice(0, 200)
        : null,
      summary: typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 500)
        : null,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
            .filter(Boolean)
            .slice(0, 5)
        : [],
    };
  } catch (error) {
    if (error.response) {
      logger.warn(`[OpenRouter] Error HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.name === 'SyntaxError') {
      logger.warn('[OpenRouter] Respuesta no es JSON válido');
    } else {
      logger.warn(`[OpenRouter] ${error.message}`);
    }
    return null;
  }
};

/**
 * Decide si el link necesita mejora con IA.
 * Condiciones: resumen vacío o demasiado corto.
 */
const needsEnhancement = (metadata) => {
  if (!metadata.summary) {
    logger.info('[OpenRouter] needsEnhancement → true (sin resumen)');
    return true;
  }
  const len = metadata.summary.trim().length;
  if (len < SUMMARY_MIN_LENGTH) {
    logger.info(`[OpenRouter] needsEnhancement → true (resumen corto: ${len}/${SUMMARY_MIN_LENGTH} chars)`);
    return true;
  }
  logger.info(`[OpenRouter] needsEnhancement → false (resumen OK: ${len} chars)`);
  return false;
};

const buildRichSummaryPrompt = (url, title, content) =>
  `Analiza este contenido web y responde SOLO con un objeto JSON válido, sin texto extra, sin markdown.

URL: ${url}
Título: ${title || 'no disponible'}
Contenido: ${content || 'no disponible'}

Responde exactamente con este formato:
{
  "content": "resumen de 2-3 párrafos en español (máximo 600 caracteres) explicando qué es, por qué importa y qué aprenderá el lector",
  "keyPoints": [
    { "title": "Concepto o sección clave", "points": ["bullet conciso 1", "bullet conciso 2"] },
    { "title": "Otro concepto clave", "points": ["bullet conciso 1", "bullet conciso 2"] }
  ]
}

Reglas:
- content y keyPoints siempre en español
- keyPoints: entre 2 y 4 objetos, cada uno con 2-3 bullets de máximo 90 caracteres
- No inventes información que no esté en el contenido`;

/**
 * Genera un resumen enriquecido (párrafo + puntos clave) para mostrar en AISummaryScreen.
 * Devuelve { content, keyPoints } o lanza error si falla.
 */
const generateRichSummary = async (url, title, content) => {
  if (!env.openrouter.apiKey || env.openrouter.apiKey.startsWith('sk-or-xxx')) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  logger.info(`[OpenRouter] 📄 generateRichSummary — modelo: ${env.openrouter.model} | url: ${url}`);
  const prompt = buildRichSummaryPrompt(url, title, content);

  let response;
  try {
    response = await axios.post(
      `${env.openrouter.baseUrl}/chat/completions`,
      {
        model: env.openrouter.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${env.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://readlaterpro.app',
          'X-Title': 'ReadLaterPro',
        },
        timeout: 30000,
      }
    );
  } catch (axiosErr) {
    const status = axiosErr.response?.status;
    if (status === 404) {
      throw new Error(`Modelo no encontrado en OpenRouter: "${env.openrouter.model}". Actualiza OPENROUTER_MODEL en .env (ej: meta-llama/llama-3.3-70b-instruct:free)`);
    }
    if (status === 401) {
      throw new Error('API key de OpenRouter inválida. Verifica OPENROUTER_API_KEY en .env');
    }
    if (status === 429) {
      throw new Error('Límite de requests de OpenRouter alcanzado. Intenta en unos minutos');
    }
    throw new Error(`OpenRouter error ${status ?? 'red'}: ${axiosErr.message}`);
  }

  const raw = response.data?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('Respuesta vacía del modelo');

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  logger.info(`[OpenRouter] ✅ Rich summary generado — ${parsed.keyPoints?.length ?? 0} key points`);

  return {
    content: typeof parsed.content === 'string' ? parsed.content.trim().slice(0, 1200) : '',
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints
          .filter((kp) => kp && typeof kp.title === 'string')
          .slice(0, 5)
          .map((kp) => ({
            title: kp.title.trim().slice(0, 100),
            points: Array.isArray(kp.points)
              ? kp.points
                  .filter((p) => typeof p === 'string')
                  .map((p) => p.trim().slice(0, 120))
                  .filter(Boolean)
                  .slice(0, 4)
              : [],
          }))
      : [],
  };
};

module.exports = { enhanceWithAI, needsEnhancement, generateRichSummary };
