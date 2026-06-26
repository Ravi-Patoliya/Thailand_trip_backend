const mongoose = require('mongoose');
const { API_response } = require('../helpers');

// Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
const dbHealthCheck = (_req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return API_response.SERVICE_UNAVAILABLE({
    res,
    message: 'Database is currently unavailable. Please try again shortly.',
  });
};

module.exports = dbHealthCheck;
