'use strict';
const couponRepository = require('../repositories/coupon.repository');
const AppError         = require('../utils/AppError');
const MSG              = require('../constants/message');
const { COUPON_TYPE }  = require('../constants/enums');

const EDITABLE_FIELDS = [
  'description', 'type', 'value', 'maxDiscountAmount', 'minOrderAmount',
  'currency', 'applicableCategories', 'applicableServices', 'maxUses',
  'maxUsesPerUser', 'validFrom', 'validUntil', 'isActive',
];

class CouponService {
  // ── Admin: paginated list of all coupons (any status) ─────────────
  async getAllCoupons(query = {}) {
    const page  = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.type) filter.type = query.type;
    if (query.search) filter.code = { $regex: new RegExp(query.search, 'i') };

    const [data, total] = await Promise.all([
      couponRepository.findAllPaginated({ filter, skip, limit }),
      couponRepository.countAll(filter),
    ]);

    return { data, page, limit, total };
  }

  // ── Public/User: currently active & valid coupons only ────────────
  async getActiveCoupons() {
    const now = new Date();
    const filter = {
      isDeleted: false,
      isActive:  true,
      validFrom:  { $lte: now },
      validUntil: { $gte: now },
    };
    return couponRepository.findAllPaginated({ filter, skip: 0, limit: 100 });
  }

  async getCouponById(id, { adminView = false } = {}) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw AppError.notFound('Coupon');
    if (!adminView && !coupon.isActive) throw AppError.notFound('Coupon');
    return coupon;
  }

  async createCoupon(body, adminId) {
    const data = this._sanitize(body);
    this._validateBusinessRules(data);

    const exists = await couponRepository.existsByCode(data.code);
    if (exists) throw AppError.conflict(MSG.COUPON_CODE_CONFLICT);

    // Revive a soft-deleted coupon holding the same (unique) code.
    const deleted = await couponRepository.findDeletedByCode(data.code);
    if (deleted) {
      return couponRepository.updateById(deleted._id, {
        ...data,
        usedCount: 0,
        usageLog:  [],
        isDeleted: false,
        isActive:  data.isActive ?? true,
        createdBy: adminId,
      });
    }

    return couponRepository.create({ ...data, createdBy: adminId });
  }

  async updateCoupon(id, body, adminId) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw AppError.notFound('Coupon');

    if (body.code && body.code.toUpperCase() !== coupon.code) {
      const exists = await couponRepository.existsByCode(body.code, id);
      if (exists) throw AppError.conflict(MSG.COUPON_CODE_CONFLICT);
    }

    const update = {};
    EDITABLE_FIELDS.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
    if (body.code !== undefined) update.code = body.code;
    update.updatedBy = adminId;

    // Validate merged result so partial updates can't produce an invalid coupon.
    this._validateBusinessRules({ ...coupon.toObject(), ...update });

    return couponRepository.updateById(id, update);
  }

  async deleteCoupon(id) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw AppError.notFound('Coupon');
    return couponRepository.softDeleteById(id);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  _sanitize(body) {
    const data = { ...body };
    if (data.code) data.code = data.code.toUpperCase().trim();
    // The admin UI only supplies an expiry date; start validity from now.
    if (!data.validFrom) data.validFrom = new Date();
    return data;
  }

  _validateBusinessRules(data) {
    if (data.validFrom && data.validUntil) {
      if (new Date(data.validUntil) <= new Date(data.validFrom)) {
        throw AppError.badRequest(MSG.COUPON_INVALID_DATES);
      }
    }
    if (data.type === COUPON_TYPE.PERCENTAGE && data.value !== undefined) {
      if (data.value < 1 || data.value > 100) {
        throw AppError.badRequest(MSG.COUPON_PERCENT_RANGE);
      }
    }
    if (data.type === COUPON_TYPE.FLAT && data.maxDiscountAmount != null) {
      throw AppError.badRequest(MSG.COUPON_MAX_DISCOUNT_FLAT);
    }
  }
}

module.exports = new CouponService();
