/**
 * Central model exports
 * Import from here: const { User, Service } = require('../models');
 */
const User         = require('./User');
const Category     = require('./Category');
const Service      = require('./Service');
const Inquiry      = require('./Inquiry');
const Coupon       = require('./Coupon');
const Review       = require('./Review');
const Contact      = require('./Contact');
const Notification = require('./Notification');

module.exports = { User, Category, Service, Inquiry, Coupon, Review, Contact, Notification };
