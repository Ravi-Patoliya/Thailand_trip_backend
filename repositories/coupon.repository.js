'use strict';
const { Coupon } = require('../models');

class CouponRepository {
  // ── Reads ──────────────────────────────────────────────────────
  async findAllPaginated({ filter = {}, skip = 0, limit = 20 }) {
    return Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-usageLog')
      .lean();
  }

  async countAll(filter = {}) {
    return Coupon.countDocuments(filter);
  }

  async findById(id) {
    return Coupon.findOne({ _id: id, isDeleted: false });
  }

  async findByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), isDeleted: false });
  }

  async existsByCode(code, excludeId = null) {
    const filter = { code: code.toUpperCase(), isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId };
    return Coupon.exists(filter);
  }

  // Find a soft-deleted coupon by code so a create with the same code can
  // revive it instead of leaving a duplicate tombstone (code is unique).
  async findDeletedByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), isDeleted: true });
  }

  // ── Writes ─────────────────────────────────────────────────────
  async create(data) {
    return Coupon.create(data);
  }

  async updateById(id, update) {
    return Coupon.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Coupon.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } }, { new: true });
  }

  // ── Usage ──────────────────────────────────────────────────────
  async validateForUser(code, userId, orderAmount) {
    return Coupon.validateForUser(code, userId, orderAmount);
  }

  async recordUsage(couponId) {
    return Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
  }
}

module.exports = new CouponRepository();
