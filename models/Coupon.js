const mongoose = require('mongoose');
const { COUPON_TYPE } = require('../constants/enums');

/**
 * Coupon Model
 * Supports flat & percentage discounts, per-service/category scope,
 * usage limits, per-user limits, and validity windows.
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Code must be at least 3 characters'],
      maxlength: [20, 'Code cannot exceed 20 characters'],
      match: [/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, underscores'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },

    // ── Discount ──────────────────────────────────────────────
    type: {
      type: String,
      enum: {
        values:  Object.values(COUPON_TYPE),
        message: 'Type must be flat or percentage',
      },
      required: true,
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Value must be at least 1'],
    },
    maxDiscountAmount: {
      // Cap for percentage coupons (e.g. 20% but max ₹500 off)
      type: Number,
      default: null,
      min: 0,
    },

    // ── Eligibility ───────────────────────────────────────────
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Scope: empty arrays mean "applies to everything"
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    applicableServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],

    // ── Usage Limits ──────────────────────────────────────────
    maxUses: {
      type: Number,
      default: null, // null = unlimited
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ── Validity ──────────────────────────────────────────────
    validFrom: {
      type: Date,
      required: [true, 'Valid from date is required'],
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // ── Audit ─────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
// code is already unique: true on the field, but an explicit index entry makes
// the compound lookup pattern (code + isDeleted) index-covered.
couponSchema.index({ code: 1, isDeleted: 1 });
// isDeleted must be leading so the validity-window query hits the index.
couponSchema.index({ isDeleted: 1, isActive: 1, validFrom: 1, validUntil: 1 });

// ── Virtual: is currently valid ────────────────────────────────
couponSchema.virtual('isValid').get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.maxUses === null || this.usedCount < this.maxUses)
  );
});

// ── Virtual: remaining uses ────────────────────────────────────
couponSchema.virtual('remainingUses').get(function () {
  if (this.maxUses === null) return Infinity;
  return Math.max(0, this.maxUses - this.usedCount);
});

// ── Instance method: calculate discount for a given amount ─────
couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (orderAmount < this.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount is ₹${this.minOrderAmount}` };
  }

  let discount = 0;
  if (this.type === COUPON_TYPE.FLAT) {
    discount = Math.min(this.value, orderAmount); // never exceed order
  } else {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscountAmount !== null) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  }

  return {
    valid: true,
    discount: Math.round(discount),
    finalAmount: Math.round(orderAmount - discount),
    label:
      this.type === COUPON_TYPE.FLAT
        ? `₹${this.value} off`
        : `${this.value}% off${this.maxDiscountAmount ? ` (up to ₹${this.maxDiscountAmount})` : ''}`,
  };
};

// ── Static: validate coupon for a user + order ─────────────────
// Per-user check queries the Inquiry collection instead of a usageLog array
// so the Coupon document stays small regardless of how many users use it.
couponSchema.statics.validateForUser = async function (code, userId, orderAmount) {
  const coupon = await this.findOne({ code: code.toUpperCase(), isDeleted: false });

  if (!coupon) return { valid: false, reason: 'Coupon code not found' };
  if (!coupon.isActive) return { valid: false, reason: 'Coupon is inactive' };

  const now = new Date();
  if (now < coupon.validFrom) return { valid: false, reason: 'Coupon is not yet active' };
  if (now > coupon.validUntil) return { valid: false, reason: 'Coupon has expired' };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }

  // Per-user limit: only checked when a logged-in userId is provided
  if (userId) {
    const Inquiry = mongoose.model('Inquiry');
    const userUses = await Inquiry.countDocuments({ user: userId, coupon: coupon._id });
    if (userUses >= coupon.maxUsesPerUser) {
      return { valid: false, reason: 'You have already used this coupon' };
    }
  }

  return coupon.calculateDiscount(orderAmount);
};

module.exports = mongoose.model('Coupon', couponSchema);
