const collectionService = require('../services/collectionService');
const asyncHandler = require('../middlewares/asyncHandler');

const createCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.createCollection(req.user._id, req.body);

  res.status(201).json({ collection });
});

const listCollections = asyncHandler(async (req, res) => {
  const collections = await collectionService.listCollections(req.user._id);

  res.json({ collections });
});

const getCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.getCollection(req.user._id, req.params.id);

  res.json({ collection });
});

const updateCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.updateCollection(
    req.user._id,
    req.params.id,
    req.body
  );

  res.json({ collection });
});

const deleteCollection = asyncHandler(async (req, res) => {
  await collectionService.deleteCollection(req.user._id, req.params.id);

  res.status(204).send();
});

const exportCollection = asyncHandler(async (req, res) => {
  const { filename, content, linkCount } = await collectionService.exportCollectionAsMarkdown(
    req.user._id,
    req.params.id
  );

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Link-Count', linkCount);
  res.send(content);
});

module.exports = {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  exportCollection,
};
