const jwt = require('jsonwebtoken');

const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('./asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Token de autenticación requerido', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.jwt.secret);
  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive) {
    throw new AppError('Usuario no autorizado', 401);
  }

  req.user = user;
  next();
});

module.exports = {
  protect,
};
