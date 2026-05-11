const User = require('../models/User');
const Link = require('../models/Link');
const AppError = require('../utils/AppError');
const openrouterService = require('./openrouterService');
const metadataService = require('./metadataService');
const logger = require('../utils/logger');

// Cuotas de resúmenes IA por plan
const PLAN_QUOTAS = {
  free: 5,
  medium: 50,
  pro: Infinity,
};

/**
 * Devuelve la cuota y el uso actual del usuario.
 */
const getQuotaInfo = async (userId) => {
  const user = await User.findById(userId).select('plan aiSummaryUsed');
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const quota = PLAN_QUOTAS[user.plan] ?? PLAN_QUOTAS.free;
  const used = user.aiSummaryUsed ?? 0;
  const remaining = quota === Infinity ? null : Math.max(quota - used, 0);

  return {
    plan: user.plan,
    quota: quota === Infinity ? null : quota,
    used,
    remaining,
    hasQuota: remaining === null || remaining > 0,
  };
};

/**
 * Genera y guarda el resumen IA para un link.
 * Verifica cuotas antes de llamar al LLM.
 */
const generateForLink = async (userId, linkId) => {
  // 1. Verificar cuota
  const quotaInfo = await getQuotaInfo(userId);
  if (!quotaInfo.hasQuota) {
    throw new AppError(
      `Has alcanzado el límite de ${quotaInfo.quota} resúmenes IA del plan ${quotaInfo.plan}. Actualiza tu plan para continuar.`,
      402
    );
  }

  // 2. Obtener el link
  const link = await Link.findOne({ _id: linkId, userId });
  if (!link) throw new AppError('Link no encontrado', 404);

  // 3. Si ya tiene resumen IA reciente (< 24h), devolverlo sin gastar cuota
  if (link.aiSummary?.generatedAt) {
    const ageMs = Date.now() - new Date(link.aiSummary.generatedAt).getTime();
    const AGE_24H = 24 * 60 * 60 * 1000;
    if (ageMs < AGE_24H && link.aiSummary.content) {
      logger.info(`[AISummary] Usando resumen cacheado para link ${linkId}`);
      return { aiSummary: link.aiSummary, quotaInfo };
    }
  }

  // 4. Obtener contenido fresco si es posible (para un mejor contexto al LLM)
  let contentForAI = link.summary || '';
  try {
    const fresh = await metadataService.fetchMetadata(link.url);
    contentForAI = fresh?.summary || contentForAI;
  } catch {
    // No crítico — usamos lo que hay en la BD
  }

  // 5. Llamar al LLM
  logger.info(`[AISummary] Generando resumen para link ${linkId} (usuario ${userId}, plan ${quotaInfo.plan})`);
  const generated = await openrouterService.generateRichSummary(
    link.url,
    link.title,
    contentForAI
  );

  // 6. Guardar en el link
  const aiSummary = {
    content: generated.content,
    keyPoints: generated.keyPoints,
    generatedAt: new Date(),
  };
  await Link.findByIdAndUpdate(linkId, { aiSummary });

  // 7. Incrementar contador de uso del usuario
  await User.findByIdAndUpdate(userId, { $inc: { aiSummaryUsed: 1 } });
  logger.info(`[AISummary] ✅ Resumen guardado. Uso actualizado: ${quotaInfo.used + 1}/${quotaInfo.quota ?? '∞'}`);

  let newRemaining = quotaInfo.remaining;
  if (newRemaining !== null) newRemaining -= 1;

  return {
    aiSummary,
    quotaInfo: {
      ...quotaInfo,
      used: quotaInfo.used + 1,
      remaining: newRemaining,
    },
  };
};

module.exports = { generateForLink, getQuotaInfo, PLAN_QUOTAS };
