const authService = require('../services/authService');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: req.user,
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshTokenFn(refreshToken);

  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);

  res.json({ message: 'Sesión cerrada correctamente' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);
  res.json(result);
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Email requerido', 400);
  }
  const result = await authService.resendVerificationEmail(email);
  res.json(result);
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Email requerido', 400);
  }
  const result = await authService.requestPasswordReset(email);
  res.json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  res.json(result);
});

module.exports = {
  register,
  login,
  me,
  refreshToken,
  logout,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
};
