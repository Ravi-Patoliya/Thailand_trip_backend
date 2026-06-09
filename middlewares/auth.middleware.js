'use strict';
const jwt      = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { User } = require('../models');
const { ROLE } = require('../constants/enums');
const MSG      = require('../constants/message');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const decodeAndAttach = async (req) => {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw AppError.unauthorized(MSG.NO_TOKEN);

  let decoded;
  try {
    decoded = jwt.verify(token, ACCESS_SECRET);
  } catch {
    throw AppError.unauthorized(MSG.INVALID_TOKEN);
  }
  const user = await User.findById(decoded.id).select('_id name email role isActive isVerfied fullMobile');
  console.log(user);
  if (!user)          throw AppError.unauthorized(MSG.INVALID_TOKEN);
  if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);

  req.user = user;
};

const authenticate = async (req, res, next) => {
  try {
    await decodeAndAttach(req);
    next();
  } catch (err) { next(err); }
};

const requireRole = (...roles) => [
  authenticate,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(MSG.FORBIDDEN));
    }
    next();
  },
];

const requireUser       = requireRole(ROLE.USER, ROLE.ADMIN, ROLE.SUPERADMIN);
const requireAdmin      = requireRole(ROLE.ADMIN, ROLE.SUPERADMIN);
const requireSuperAdmin = requireRole(ROLE.SUPERADMIN);

// Attaches req.user if a valid token is present, but never blocks the request
const optionalAuth = async (req, res, next) => {
  try {
    await decodeAndAttach(req);
  } catch {
    // no-op — unauthenticated requests continue with req.user undefined
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireUser, requireAdmin, requireSuperAdmin };
