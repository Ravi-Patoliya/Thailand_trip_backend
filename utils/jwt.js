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
  // 'none' is required because the frontend (mythaibooking.com) and this API
  // (thai-api.mythaibooking.com) are different hosts, which browsers treat as
  // cross-site for cookie purposes even though they share a parent domain.
  // 'lax' silently dropped the cookie on the frontend's cross-site
  // withCredentials fetch to /auth/refresh, causing an immediate 401 in
  // production while working on localhost (where both sides are same-site).
  // 'none' requires 'secure: true', which is already forced in production above.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  // Without an explicit domain, the cookie defaults to the exact host that set
  // it (thai-api.mythaibooking.com only) and is invisible to the frontend's
  // origin. Scoping it to the shared parent domain lets both subdomains see it.
  domain:   process.env.COOKIE_DOMAIN || undefined,
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
