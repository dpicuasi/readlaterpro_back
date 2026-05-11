const { body } = require('express-validator');

const notificationService = require('../services/notificationService');
const asyncHandler = require('../middlewares/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const registerValidators = [body('token').isString().notEmpty()];

const registerPushToken = [
  ...registerValidators,
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await notificationService.registerPushToken(req.user._id, token);
    res.status(204).send();
  }),
];

const unregisterPushToken = [
  ...registerValidators,
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await notificationService.removePushToken(req.user._id, token);
    res.status(204).send();
  }),
];

module.exports = {
  registerPushToken,
  unregisterPushToken,
};
