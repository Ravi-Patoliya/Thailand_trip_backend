'use strict';
const { z }            = require('zod');
const couponService    = require('../services/coupon.service');
const { validate, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const MSG              = require('../constants/message');
const { COUPON_TYPE }  = require('../constants/enums');

const codeField = z.string().trim().toUpperCase()
  .min(3, 'Code must be at least 3 characters')
  .max(20, 'Code cannot exceed 20 characters')
  .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, underscores');

const listQuerySchema = z.object({
  id:       zv.mongoId.optional(),                 // fetch single
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  search:   z.string().trim().max(100).optional(), // by code
  type:     z.enum(Object.values(COUPON_TYPE)).optional(),
  isActive: z.enum(['true', 'false']).optional(),  // admin-only
});

const createCouponSchema = z.object({
  code:                codeField,
  description:         z.string().trim().max(200).optional(),
  type:                z.enum(Object.values(COUPON_TYPE), { required_error: 'Discount type is required' }),
  value:               z.coerce.number().min(1, 'Discount amount must be at least 1'),
  maxDiscountAmount:   z.coerce.number().min(0).nullable().optional(),
  minOrderAmount:      z.coerce.number().min(0).optional(),
  currency:            z.string().trim().optional(),
  applicableCategories:z.array(zv.mongoId).optional(),
  applicableServices:  z.array(zv.mongoId).optional(),
  maxUses:             z.coerce.number().int().min(1).nullable().optional(),
  maxUsesPerUser:      z.coerce.number().int().min(1).optional(),
  validFrom:           z.coerce.date({ required_error: 'Valid from date is required' }),
  validUntil:          z.coerce.date({ required_error: 'Valid until date is required' }),
  isActive:            z.boolean().optional(),
});

const updateCouponSchema = z.object({
  code:                codeField.optional(),
  description:         z.string().trim().max(200).optional(),
  type:                z.enum(Object.values(COUPON_TYPE)).optional(),
  value:               z.coerce.number().min(1).optional(),
  maxDiscountAmount:   z.coerce.number().min(0).nullable().optional(),
  minOrderAmount:      z.coerce.number().min(0).optional(),
  currency:            z.string().trim().optional(),
  applicableCategories:z.array(zv.mongoId).optional(),
  applicableServices:  z.array(zv.mongoId).optional(),
  maxUses:             z.coerce.number().int().min(1).nullable().optional(),
  maxUsesPerUser:      z.coerce.number().int().min(1).optional(),
  validFrom:           z.coerce.date().optional(),
  validUntil:          z.coerce.date().optional(),
  isActive:            z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const validateCouponSchema = z.object({
  code:        codeField,
  orderAmount: z.coerce.number().positive('orderAmount must be a positive number'),
});

const listQueryValidator      = validateQuery(listQuerySchema);
const createCouponValidator   = validate(createCouponSchema);
const updateCouponValidator   = validate(updateCouponSchema);
const validateCouponValidator = validate(validateCouponSchema);

const isAdmin = (req) => req.user && ['admin', 'superadmin'].includes(req.user.role);

// GET /api/coupons
// ?id=<mongoId>  → single coupon (admin: any status | public: active only)
// no id          → list (admin: paginated, all statuses | public: active & valid only)
// admin-only query params: isActive, page, limit (ignored for public callers)
const getCoupons = async (req, res, next) => {
  try {
    const admin = isAdmin(req);
    const { id, ...rest } = req.query;

    if (id) {
      const coupon = await couponService.getCouponById(id, { adminView: admin });
      return API_response.OK({ res, message: MSG.COUPON_FETCHED, payload: coupon });
    }

    if (admin) {
      const { data, page, limit, total } = await couponService.getAllCoupons(rest);
      return API_response.OK({ res, message: MSG.COUPONS_FETCHED, payload: { data, page, limit, total } });
    }

    // public/user — only currently active & valid coupons, unpaginated.
    const data = await couponService.getActiveCoupons();
    API_response.OK({ res, message: MSG.COUPONS_FETCHED, payload: { data } });
  } catch (err) { next(err); }
};

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user._id);
    API_response.CREATED({ res, message: MSG.COUPON_CREATED, payload: coupon });
  } catch (err) { next(err); }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body, req.user._id);
    API_response.OK({ res, message: MSG.COUPON_UPDATED, payload: coupon });
  } catch (err) { next(err); }
};

// POST /api/coupons/validate
// Requires an authenticated user — per-user limit check needs a real userId.
const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user?._id ?? null;
    const result = await couponService.validateCoupon(code, userId, orderAmount);
    API_response.OK({ res, message: MSG.COUPON_VALIDATED, payload: result });
  } catch (err) { next(err); }
};

const deleteCoupon = async (req, res, next) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    API_response.OK({ res, message: MSG.COUPON_DELETED, payload: null });
  } catch (err) { next(err); }
};

module.exports = {
  listQueryValidator,
  createCouponValidator,
  updateCouponValidator,
  validateCouponValidator,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};
