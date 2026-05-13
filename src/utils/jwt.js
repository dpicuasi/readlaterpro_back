const jwt = require('jsonwebtoken');

const env = require('../config/env');

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    }
  );

const signRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId.toString(), type: 'refresh' },
    env.jwt.secret,
    { expiresIn: '30d' }
  );

const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
};
