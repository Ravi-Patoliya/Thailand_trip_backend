'use strict';
const jwt      = require('jsonwebtoken');
const AppError = require('./AppError');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL  || '15m';
const REFRESH_TTL    = process.env.JWT_REFRESH_TTL || '7d';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax', // Lax survives top-level navigation from external links (avoids surprise logout) while still blocking CSRF on cross-site POSTs
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:     '/',
};

const issueTokens = (res, payload) => {
  const accessToken  = jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token. Please log in again.');
  }
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
};

module.exports = { issueTokens, verifyRefreshToken, clearRefreshCookie };
