const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');

const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user);

  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  if (!user.isActive) {
    throw new AppError('La cuenta está inactiva', 403);
  }

  const token = signToken(user);

  return { user, token };
};

module.exports = {
  register,
  login,
};
