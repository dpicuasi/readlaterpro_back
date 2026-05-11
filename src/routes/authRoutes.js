const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 60 }),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 50 })
      .withMessage('La contraseña debe tener entre 6 y 50 caracteres'),
  ],
  validateRequest,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  validateRequest,
  authController.login
);

router.get('/me', protect, authController.me);

module.exports = router;
