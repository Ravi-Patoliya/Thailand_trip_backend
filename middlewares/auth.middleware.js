'use strict';
const jwt      = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { User } = require('../models');
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

  const user = await User.findById(decoded.id)
    .select('_id name email role_id isActive isVerified fullMobile')
    .populate({ path: 'role_id', select: 'name label isActive' });

  if (!user)                                throw AppError.unauthorized(MSG.INVALID_TOKEN);
  if (!user.isActive)                       throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);
  if (!user.role_id || !user.role_id.isActive) throw AppError.forbidden('Your role has been deactivated. Please contact support.');

  // Expose role name as req.user.role so all existing permission checks continue to work
  req.user = user;
  req.user.role = user.role_id.name;
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

const requireUser       = requireRole('user', 'admin', 'superadmin');
const requireAdmin      = requireRole('admin', 'superadmin');
const requireSuperAdmin = requireRole('superadmin');

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
