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

module.exports = {
  signToken,
};
