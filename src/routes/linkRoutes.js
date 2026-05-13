const express = require('express');
const { body, param, query } = require('express-validator');

const linkController = require('../controllers/linkController');
const { protect } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

const objectIdParam = () => param('id').isMongoId().withMessage('ID inválido');

router.use(protect);

router
  .route('/')
  .get(
    [
      query('status').optional().isIn(['pending', 'read']).withMessage('Estado inválido'),
      query('priority')
        .optional()
        .isIn(['high', 'medium', 'low'])
        .withMessage('Prioridad inválida'),
      query('sourceType')
        .optional()
        .isIn(['github', 'twitter', 'youtube', 'web', 'reddit', 'medium', 'other'])
        .withMessage('Tipo de fuente inválido'),
      query('collectionId').optional().isMongoId().withMessage('Colección inválida'),
      query('favorite').optional().isBoolean().toBoolean(),
    ],
    validateRequest,
    linkController.listLinks
  )
  .post(
    [
      body('url').isURL({ require_protocol: true }).withMessage('URL inválida'),
      body('title').optional().trim().isLength({ max: 160 }),
      body('summary').optional().trim().isLength({ max: 600 }),
      body('notes').optional().trim().isLength({ max: 1000 }),
      body('priority').optional().isIn(['high', 'medium', 'low']),
      body('collectionId').optional({ nullable: true }).isMongoId(),
      body('tags').optional().isArray(),
      body('tags.*').optional().trim().isLength({ max: 30 }),
      body('isFavorite').optional().isBoolean(),
    ],
    validateRequest,
    linkController.createLink
  );

router.get('/ai-quota', linkController.getAIQuota);

router.get(
  '/:id/status',
  objectIdParam(),
  validateRequest,
  linkController.getLinkStatus
);

router
  .route('/:id')
  .get(objectIdParam(), validateRequest, linkController.getLink)
  .patch(
    [
      objectIdParam(),
      body('title').optional().trim().isLength({ max: 160 }),
      body('summary').optional().trim().isLength({ max: 600 }),
      body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
      body('priority').optional().isIn(['high', 'medium', 'low']),
      body('status').optional().isIn(['pending', 'read']),
      body('collectionId').optional({ nullable: true }).isMongoId(),
      body('tags').optional().isArray(),
      body('tags.*').optional().trim().isLength({ max: 30 }),
      body('isFavorite').optional().isBoolean(),
    ],
    validateRequest,
    linkController.updateLink
  )
  .delete(objectIdParam(), validateRequest, linkController.deleteLink);

router.post(
  '/:id/reprocess',
  objectIdParam(),
  validateRequest,
  linkController.reprocessLink
);

router.post(
  '/:id/ai-summary',
  objectIdParam(),
  validateRequest,
  linkController.generateAISummary
);

module.exports = router;
