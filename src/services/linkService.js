const Link = require('../models/Link');
const Collection = require('../models/Collection');
const AppError = require('../utils/AppError');
const metadataService = require('./metadataService');
const openrouterService = require('./openrouterService');
const logger = require('../utils/logger');

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

const ensureCollectionBelongsToUser = async (collectionId, userId) => {
  if (!collectionId) return;

  const collection = await Collection.findOne({ _id: collectionId, userId });

  if (!collection) {
    throw new AppError('Colección no encontrada', 404);
  }
};

const buildFilters = (userId, query) => {
  const filters = { userId };
  const { status, priority, sourceType, collectionId, tag, search, favorite, dateFilter } = query;

  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (sourceType) filters.sourceType = sourceType;
  if (collectionId === 'none') {
    filters.collectionId = null;
  } else if (collectionId) {
    filters.collectionId = collectionId;
  }
  if (tag) filters.tags = tag.toLowerCase();
  if (favorite !== undefined) {
    filters.isFavorite = favorite === 'true' || favorite === true;
  }

  if (dateFilter) {
    const now = new Date();
    let startDate;
    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        break;
    }
    if (startDate) {
      filters.createdAt = { $gte: startDate };
    }
  }

  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = [
      { title: new RegExp(safeSearch, 'i') },
      { summary: new RegExp(safeSearch, 'i') },
      { notes: new RegExp(safeSearch, 'i') },
      { url: new RegExp(safeSearch, 'i') },
    ];
  }

  return filters;
};

const createLink = async (userId, payload) => {
  await ensureCollectionBelongsToUser(payload.collectionId, userId);

  const linkData = {
    userId,
    url: payload.url,
    notes: payload.notes,
    priority: payload.priority,
    collectionId: payload.collectionId || null,
    tags: normalizeTags(payload.tags),
    isFavorite: Boolean(payload.isFavorite),
    processingStatus: 'processing',
  };

  // ── Paso 1: scraping de metadata (rápido) ──
  let scrapedMetadata = null;
  try {
    scrapedMetadata = await metadataService.fetchMetadata(payload.url);
    Object.assign(linkData, scrapedMetadata, {
      title: payload.title || scrapedMetadata.title,
      summary: payload.summary || scrapedMetadata.summary,
      // Si el resumen necesita mejora, queda en 'processing'
      processingStatus: openrouterService.needsEnhancement(scrapedMetadata)
        ? 'processing'
        : 'done',
      // needsEnhancement ya logueó su decisión en openrouterService
    });
  } catch (error) {
    let fallbackDomain = 'enlace guardado';
    let fallbackSourceType = 'other';
    try {
      const parsedUrl = new URL(payload.url);
      fallbackDomain = parsedUrl.hostname.replace(/^www\./, '');
      fallbackSourceType = metadataService.getSourceType(payload.url);
    } catch {
      // URL malformada
    }
    Object.assign(linkData, {
      title: payload.title || fallbackDomain,
      summary: payload.summary || null,
      domain: fallbackDomain,
      sourceType: fallbackSourceType,
      processingStatus: 'processing', // intentó scrap, falló — IA puede aún intentar
      processingError: error.message,
    });
  }

  // ── Paso 2: guardar inmediatamente ──
  const saved = await Link.create(linkData);

  // ── Paso 3: mejorar con IA en background (no bloquea la respuesta) ──
  if (saved.processingStatus === 'processing') {
    logger.info(`[OpenRouter] 🔧 Iniciando mejora en background para link ${saved._id} (url: ${saved.url})`);
    setImmediate(async () => {
      try {
        const bodyContent = scrapedMetadata?.summary || saved.title || '';
        const enhanced = await openrouterService.enhanceWithAI(
          saved.url,
          saved.title,
          bodyContent
        );

        if (enhanced) {
          const update = { processingStatus: 'done', processingError: null };
          // Solo sobreescribir si el campo estaba vacío o era muy corto
          if (!saved.title || saved.title === saved.domain) {
            update.title = enhanced.title || saved.title;
          }
          if (openrouterService.needsEnhancement({ summary: saved.summary })) {
            update.summary = enhanced.summary || saved.summary;
          }
          if (!saved.tags?.length && enhanced.tags?.length) {
            update.tags = enhanced.tags;
          }
          await Link.findByIdAndUpdate(saved._id, update);
          logger.info(`[OpenRouter] Link ${saved._id} mejorado con éxito`);
        } else {
          logger.info(`[OpenRouter] 🔵 enhanceWithAI retornó null para link ${saved._id} (sin API key o error — revisar logs anteriores)`);
          await Link.findByIdAndUpdate(saved._id, {
            processingStatus: 'done',
            processingError: null,
          });
        }
      } catch (err) {
        logger.error(`[OpenRouter] Error al mejorar link ${saved._id}: ${err.message}`);
        await Link.findByIdAndUpdate(saved._id, {
          processingStatus: 'error',
          processingError: err.message,
        }).catch(() => {});
      }
    });
  } else {
    logger.info(`[OpenRouter] ⏭️  Link ${saved._id} no necesita mejora con IA (resumen suficiente)`);
  }

  return saved;
};

const listLinks = async (userId, query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = buildFilters(userId, query);

  const [rawItems, total] = await Promise.all([
    Link.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('collectionId', 'name color'),
    Link.countDocuments(filters),
  ]);

  // Normaliza collectionId → collection para consistencia en el frontend
  const items = rawItems.map((doc) => {
    const obj = doc.toObject();
    obj.collection = obj.collectionId ?? null;
    delete obj.collectionId;
    return obj;
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getLinkStatus = async (userId, linkId) => {
  const doc = await Link.findOne(
    { _id: linkId, userId },
    'processingStatus title summary tags imageUrl favicon domain sourceType estimatedReadTime'
  ).populate('collectionId', 'name color');

  if (!doc) {
    throw new AppError('Link no encontrado', 404);
  }

  const link = doc.toObject();
  link.collection = link.collectionId ?? null;
  delete link.collectionId;
  return link;
};

const getLink = async (userId, linkId) => {
  const doc = await Link.findOne({ _id: linkId, userId }).populate(
    'collectionId',
    'name color'
  );

  if (!doc) {
    throw new AppError('Link no encontrado', 404);
  }

  const link = doc.toObject();
  link.collection = link.collectionId ?? null;
  delete link.collectionId;
  return link;
};

const updateLink = async (userId, linkId, payload) => {
  await ensureCollectionBelongsToUser(payload.collectionId, userId);

  const update = {
    ...payload,
  };

  if (payload.tags) {
    update.tags = normalizeTags(payload.tags);
  }

  const link = await Link.findOneAndUpdate({ _id: linkId, userId }, update, {
    new: true,
    runValidators: true,
  }).populate('collectionId', 'name color');

  if (!link) {
    throw new AppError('Link no encontrado', 404);
  }

  const obj = link.toObject();
  obj.collection = obj.collectionId ?? null;
  delete obj.collectionId;
  return obj;
};

const deleteLink = async (userId, linkId) => {
  const link = await Link.findOneAndDelete({ _id: linkId, userId });

  if (!link) {
    throw new AppError('Link no encontrado', 404);
  }
};

const reprocessLink = async (userId, linkId) => {
  const link = await Link.findOne({ _id: linkId, userId });

  if (!link) {
    throw new AppError('Link no encontrado', 404);
  }

  link.processingStatus = 'processing';
  link.processingError = null;
  await link.save();

  // Corre scraping + IA en background, devuelve inmediatamente
  setImmediate(async () => {
    try {
      const metadata = await metadataService.fetchMetadata(link.url);
      const update = {
        title: metadata.title || link.title,
        summary: metadata.summary || link.summary,
        imageUrl: metadata.imageUrl || link.imageUrl,
        favicon: metadata.favicon || link.favicon,
        domain: metadata.domain || link.domain,
        sourceType: metadata.sourceType || link.sourceType,
        estimatedReadTime: metadata.estimatedReadTime || link.estimatedReadTime,
        processingStatus: 'done',
        processingError: null,
      };

      // Intenta mejorar con IA
      if (openrouterService.needsEnhancement(metadata)) {
        const enhanced = await openrouterService.enhanceWithAI(
          link.url,
          metadata.title || link.title,
          metadata.summary || ''
        );
        if (enhanced) {
          if (enhanced.title) update.title = enhanced.title;
          if (enhanced.summary) update.summary = enhanced.summary;
          if (enhanced.tags?.length && !link.tags?.length) update.tags = enhanced.tags;
        }
      }

      await Link.findByIdAndUpdate(link._id, update);
      logger.info(`[OpenRouter] Reprocess link ${link._id} completado`);
    } catch (err) {
      logger.error(`[OpenRouter] Error reprocessing link ${link._id}: ${err.message}`);
      await Link.findByIdAndUpdate(link._id, {
        processingStatus: 'error',
        processingError: err.message,
      }).catch(() => {});
    }
  });

  return link;
};

module.exports = {
  createLink,
  listLinks,
  getLinkStatus,
  getLink,
  updateLink,
  deleteLink,
  reprocessLink,
};
