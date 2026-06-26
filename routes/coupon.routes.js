'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { validateParams, zod: zv } = require('../middlewares/validate.middleware');
const { z } = require('zod');

const idParam = z.object({ id: zv.mongoId });
const idParamValidator = validateParams(idParam);

// GET /api/coupons          — list (admin: all | user/public: active & valid) or single via ?id=
router.get('/', optionalAuth, ctrl.listQueryValidator, ctrl.getCoupons);

// POST /api/coupons/validate — preview discount for a coupon code + order amount (no usage recorded)
router.post('/validate', optionalAuth, ctrl.validateCouponValidator, ctrl.validateCoupon);

// Admin & Super Admin — create / update / delete
router.post('/', ...requireAdmin, ctrl.createCouponValidator, ctrl.createCoupon);
router.patch('/:id', ...requireAdmin, idParamValidator, ctrl.updateCouponValidator, ctrl.updateCoupon);
router.delete('/:id', ...requireAdmin, idParamValidator, ctrl.deleteCoupon);

module.exports = router;
