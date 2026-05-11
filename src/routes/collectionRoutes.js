const express = require('express');
const { body, param } = require('express-validator');

const collectionController = require('../controllers/collectionController');
const { protect } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

const objectIdParam = () => param('id').isMongoId().withMessage('ID inválido');

router.use(protect);

router
  .route('/')
  .get(collectionController.listCollections)
  .post(
    [
      body('name')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ max: 60 }).withMessage('El nombre debe tener máximo 60 caracteres')
        .matches(/^[a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]+$/).withMessage('El nombre contiene caracteres inválidos'),
      body('description').optional({ nullable: true }).trim().isLength({ max: 300 }),
      body('color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Color hexadecimal inválido'),
    ],
    validateRequest,
    collectionController.createCollection
  );

router.get(
  '/:id/export',
  objectIdParam(),
  validateRequest,
  collectionController.exportCollection
);

router
  .route('/:id')
  .get(objectIdParam(), validateRequest, collectionController.getCollection)
  .patch(
    [
      objectIdParam(),
      body('name').optional().trim().notEmpty().isLength({ max: 60 }),
      body('description').optional({ nullable: true }).trim().isLength({ max: 300 }),
      body('color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Color hexadecimal inválido'),
    ],
    validateRequest,
    collectionController.updateCollection
  )
  .delete(objectIdParam(), validateRequest, collectionController.deleteCollection);

module.exports = router;
