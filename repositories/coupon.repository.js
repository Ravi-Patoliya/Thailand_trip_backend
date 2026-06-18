'use strict';
const { Coupon } = require('../models');

class CouponRepository {
  async findByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), isDeleted: false });
  }

  async validateForUser(code, userId, orderAmount) {
    return Coupon.validateForUser(code, userId, orderAmount);
  }

  async recordUsage(couponId, userId, inquiryId, discountGiven) {
    return Coupon.findByIdAndUpdate(couponId, {
      $inc:  { usedCount: 1 },
      $push: { usageLog: { user: userId, inquiry: inquiryId, usedAt: new Date(), discountGiven } },
    });
  }
}

module.exports = new CouponRepository();
