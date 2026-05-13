const linkService = require('../services/linkService');
const aiSummaryService = require('../services/aiSummaryService');
const asyncHandler = require('../middlewares/asyncHandler');

const createLink = asyncHandler(async (req, res) => {
  const link = await linkService.createLink(req.user._id, req.body);

  res.status(201).json({ link });
});

const listLinks = asyncHandler(async (req, res) => {
  const result = await linkService.listLinks(req.user._id, req.query);

  res.json(result);
});

const getLink = asyncHandler(async (req, res) => {
  const link = await linkService.getLink(req.user._id, req.params.id);

  res.json({ link });
});

const updateLink = asyncHandler(async (req, res) => {
  const link = await linkService.updateLink(req.user._id, req.params.id, req.body);

  res.json({ link });
});

const deleteLink = asyncHandler(async (req, res) => {
  await linkService.deleteLink(req.user._id, req.params.id);

  res.status(204).send();
});

const reprocessLink = asyncHandler(async (req, res) => {
  const link = await linkService.reprocessLink(req.user._id, req.params.id);

  res.json({ link });
});

const getLinkStatus = asyncHandler(async (req, res) => {
  const link = await linkService.getLinkStatus(req.user._id, req.params.id);
  res.json({ link });
});

const generateAISummary = asyncHandler(async (req, res) => {
  const { aiSummary, quotaInfo } = await aiSummaryService.generateForLink(
    req.user._id,
    req.params.id
  );
  res.json({ aiSummary, quotaInfo });
});

const getAIQuota = asyncHandler(async (req, res) => {
  const quotaInfo = await aiSummaryService.getQuotaInfo(req.user._id);
  res.json({ quotaInfo });
});

module.exports = {
  createLink,
  listLinks,
  getLink,
  getLinkStatus,
  updateLink,
  deleteLink,
  reprocessLink,
  generateAISummary,
  getAIQuota,
};
