'use strict';
const { z } = require('zod');
const AppError = require('../utils/AppError');

// Build a human-friendly message from a zod issue, prefixing the field name so
// generic/coercion codes ("Required", "Invalid date", "Expected number...")
// point at the offending field instead of being opaque.
const GENERIC_RE = /^(required|invalid input|invalid|invalid date|expected .* received .*|nan)$/i;

const messageForIssue = (issue) => {
  if (!issue) return 'Validation error';
  const field = Array.isArray(issue.path) && issue.path.length
    ? issue.path.join('.')
    : null;
  if (!field) return issue.message || 'Validation error';

  // Missing field (z.coerce.* turns undefined into NaN/Invalid Date, so detect both).
  const isMissing =
    (issue.code === 'invalid_type' && issue.received === 'undefined') ||
    issue.received === 'nan' ||
    /^invalid date$/i.test(issue.message || '');
  if (isMissing) return `${field} is required.`;

  // Other generic messages — prefix with the field for context.
  if (!issue.message || GENERIC_RE.test(issue.message)) return `${field}: ${issue.message || 'invalid value'}`;
  return issue.message;
};

const parseSchema = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.badRequest(messageForIssue(result.error.issues[0]));
  }
  return result.data;
};

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = parseSchema(schema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

const validateParams = (schema) => (req, _res, next) => {
  try {
    req.params = parseSchema(schema, req.params);
    next();
  } catch (err) {
    next(err);
  }
};

const validateQuery = (schema) => (req, _res, next) => {
  try {
    req.query = parseSchema(schema, req.query);
    next();
  } catch (err) {
    next(err);
  }
};

const zv = {
  mongoId:     z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  mobile:      z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number'),
  email:       z.string().trim().toLowerCase().email('Enter a valid email address'),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  otp:         z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  positiveInt: z.coerce.number().int().positive(),
};

module.exports = { validate, validateParams, validateQuery, zod: zv };
