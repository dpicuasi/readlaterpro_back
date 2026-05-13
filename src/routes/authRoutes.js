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

router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  ],
  validateRequest,
  authController.refreshToken
);

router.post('/logout', protect, authController.logout);

router.post(
  '/verify-email',
  [
    body('token').notEmpty().withMessage('Token de verificación requerido'),
  ],
  validateRequest,
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  ],
  validateRequest,
  authController.resendVerificationEmail
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  ],
  validateRequest,
  authController.requestPasswordReset
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('password')
      .isLength({ min: 6, max: 50 })
      .withMessage('La contraseña debe tener entre 6 y 50 caracteres'),
  ],
  validateRequest,
  authController.resetPassword
);

module.exports = router;
