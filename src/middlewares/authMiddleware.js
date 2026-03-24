const userModel = require('../models/userModel');
const ApiError = require('../utils/apiError');
const { verifyToken } = require('../utils/jwt');

const requireAuth = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is required.');
  }
  const payload = verifyToken(authHeader.slice(7));
  const user = userModel.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Invalid token user.');
  }
  req.user = user;
};

module.exports = { requireAuth };
