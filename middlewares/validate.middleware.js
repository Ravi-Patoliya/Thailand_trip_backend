'use strict';
const { z } = require('zod');
const AppError = require('../utils/AppError');

const parseSchema = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw AppError.badRequest(first?.message || 'Validation error');
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
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  otp:         z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  positiveInt: z.coerce.number().int().positive(),
};

module.exports = { validate, validateParams, validateQuery, zod: zv };
