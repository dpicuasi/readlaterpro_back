const authService = require('../services/authService');
const asyncHandler = require('../middlewares/asyncHandler');

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

module.exports = {
  register,
  login,
  me,
};
