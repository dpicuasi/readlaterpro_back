const Collection = require('../models/Collection');
const Link = require('../models/Link');
const AppError = require('../utils/AppError');

const createCollection = async (userId, payload) =>
  Collection.create({
    userId,
    name: payload.name,
    description: payload.description,
    color: payload.color,
  });

const listCollections = async (userId) =>
  Collection.find({ userId })
    .sort({ createdAt: -1 })
    .populate('linkCount');

const getCollection = async (userId, collectionId) => {
  const collection = await Collection.findOne({ _id: collectionId, userId }).populate(
    'linkCount'
  );

  if (!collection) {
    throw new AppError('Colección no encontrada', 404);
  }

  return collection;
};

const updateCollection = async (userId, collectionId, payload) => {
  const collection = await Collection.findOneAndUpdate(
    { _id: collectionId, userId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!collection) {
    throw new AppError('Colección no encontrada', 404);
  }

  return collection;
};

const deleteCollection = async (userId, collectionId) => {
  const collection = await Collection.findOneAndDelete({ _id: collectionId, userId });

  if (!collection) {
    throw new AppError('Colección no encontrada', 404);
  }

  await Link.updateMany({ userId, collectionId }, { collectionId: null });
};

const STATUS_LABEL = { pending: 'Pendiente', read: 'Leído' };
const PRIORITY_LABEL = { high: 'Alta', medium: 'Media', low: 'Baja' };

const exportCollectionAsMarkdown = async (userId, collectionId) => {
  const collection = await Collection.findOne({ _id: collectionId, userId });
  if (!collection) throw new AppError('Colección no encontrada', 404);

  const links = await Link.find({ userId, collectionId }).sort({ createdAt: -1 }).lean();

  const dateStr = new Date().toLocaleDateString('es', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const lines = [
    `# 📚 ${collection.name}`,
    '',
  ];

  if (collection.description) {
    lines.push(`> ${collection.description}`, '');
  }

  lines.push(
    `**${links.length} link${links.length !== 1 ? 's' : ''}** · Exportado el ${dateStr}`,
    '',
    '---',
    '',
  );

  links.forEach((link, i) => {
    lines.push(`## ${i + 1}. ${link.title || link.url}`);
    lines.push(`🔗 ${link.url}`);

    if (link.summary) lines.push('', `📝 ${link.summary}`);
    if (link.tags?.length) lines.push(`🏷️ ${link.tags.map((t) => `#${t}`).join(' ')}`);

    const meta = [
      `📊 ${STATUS_LABEL[link.status] ?? link.status}`,
      `⚡ ${PRIORITY_LABEL[link.priority] ?? link.priority}`,
    ];
    if (link.estimatedReadTime) meta.push(`⏱ ${link.estimatedReadTime} min`);
    lines.push(meta.join(' · '));

    const saved = new Date(link.createdAt).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    lines.push(`📅 ${saved}`);
    lines.push('', '---', '');
  });

  return {
    filename: `${collection.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`,
    content: lines.join('\n'),
    collection,
    linkCount: links.length,
  };
};

module.exports = {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  exportCollectionAsMarkdown,
};
