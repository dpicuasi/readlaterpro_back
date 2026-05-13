const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken, signRefreshToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const generateTokens = (user) => {
  const token = signToken(user);
  const refreshToken = signRefreshToken(user._id);
  return { token, refreshToken };
};

const generateEmailToken = () => crypto.randomBytes(32).toString('hex');

const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const emailVerificationToken = generateEmailToken();
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken,
    emailVerificationExpires,
  });

  await sendVerificationEmail(user, emailVerificationToken);

  const { token, refreshToken } = generateTokens(user);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  return { user, token, refreshToken };
};

const verifyEmail = async (token) => {
  if (!token) {
    throw new AppError('Token de verificación requerido', 400);
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Token inválido o expirado', 400);
  }

  await User.findByIdAndUpdate(user._id, {
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  });

  return { message: 'Email verificado correctamente' };
};

const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('El email ya está verificado', 400);
  }

  const emailVerificationToken = generateEmailToken();
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    emailVerificationToken,
    emailVerificationExpires,
  });

  await sendVerificationEmail(user, emailVerificationToken);

  return { message: 'Email de verificación reenviado' };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  if (!user.isActive) {
    throw new AppError('La cuenta está inactiva', 403);
  }

  if (!user.isEmailVerified) {
    throw new AppError('Debes verificar tu email antes de iniciar sesión', 401);
  }

  const { token, refreshToken } = generateTokens(user);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  return { user, token, refreshToken };
};

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return { message: 'Si el email existe, recibirás un enlace de recuperación' };
  }

  const passwordResetToken = generateEmailToken();
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken,
    passwordResetExpires,
  });

  await sendPasswordResetEmail(user, passwordResetToken);

  return { message: 'Si el email existe, recibirás un enlace de recuperación' };
};

const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new AppError('Token y nueva contraseña requeridos', 400);
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+password');

  if (!user) {
    throw new AppError('Token inválido o expirado', 400);
  }

  user.password = newPassword;
  await user.save();

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: null,
    passwordResetExpires: null,
    refreshToken: null,
  });

  return { message: 'Contraseña actualizada correctamente' };
};

const refreshTokenFn = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token requerido', 400);
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  const user = await User.findOne({ _id: decoded.sub, refreshToken }).select('+refreshToken');

  if (!user) {
    throw new AppError('Sesión inválida. Por favor, inicia sesión nuevamente', 401);
  }

  const { token, refreshToken: newRefreshToken } = generateTokens(user);

  await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

  return { user, token, refreshToken: newRefreshToken };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  refreshTokenFn,
  logout,
};
