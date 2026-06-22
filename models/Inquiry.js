const mongoose = require('mongoose');
const crypto = require('crypto');
const { INQUIRY_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/enums');

/**
 * Inquiry Model
 * The core transaction document. Represents a user's request for one or more services.
 * Admin actions on inquiries: call user, confirm, log payment, mark complete.
 * Status machine: new → contacted → confirmed → payment_pending → completed | cancelled
 */

// Sub-schema: a service item within the inquiry
const inquiryServiceSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    // Snapshot of pricing at time of inquiry (price may change later)
    serviceTitle: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    priceTierLabel: { type: String }, // e.g. "Per Person"
    quantity: { type: Number, default: 1, min: 1 }, // number of units/people
    subtotal: { type: Number, required: true },
  },
  { _id: true }
);

// Sub-schema: offline payment log entry
const paymentLogSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },
    reference: { type: String, trim: true }, // UTR / transaction ID
    note: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }//
);

// Sub-schema: status history for timeline view
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Sub-schema: internal admin note
const adminNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const inquirySchema = new mongoose.Schema(
  {
    // ── Reference number ─────────────────────────────────────
    referenceNumber: {
      type: String,
      unique: true,
      // Generated pre-save: TTP-YYYYMMDD-XXXX
    },

    // ── User ─────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    // Snapshot of user contact at time of inquiry
    contactSnapshot: {
      name: { type: String, required: true },
      mobile: { type: String, default: null },
      email: { type: String },
    },

    // ── Services Selected ─────────────────────────────────────
    services: {
      type: [inquiryServiceSchema],
      validate: {
        validator: (v) => v && v.length > 0,
        message: 'At least one service is required',
      },
    },

    // ── Travel Details ────────────────────────────────────────
    travelDate: {
      type: Date,
      required: [true, 'Travel date is required'],
    },
    returnDate: {
      type: Date,
      default: null,
    },
    adults: {
      type: Number,
      required: true,
      min: [1, 'At least 1 adult required'],
      max: [50, 'Cannot exceed 50 adults'],
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special requests cannot exceed 1000 characters'],
    },

    // ── Pricing ───────────────────────────────────────────────
    subtotal: { type: Number, required: true, min: 0 },     // before coupon
    discountAmount: { type: Number, default: 0, min: 0 },   // coupon discount
    totalAmount: { type: Number, required: true, min: 0 },  // after coupon

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    couponCode: { type: String, default: null },             // snapshot

    currency: { type: String, default: 'INR' },

    // ── Status Machine ────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values:  Object.values(INQUIRY_STATUS),
        message: 'Invalid inquiry status',
      },
      default: INQUIRY_STATUS.NEW,
    },
    statusHistory: [statusHistorySchema],

    // ── Admin Workflow ────────────────────────────────────────
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // admin staff member
      default: null,
    },
    adminNotes: [adminNoteSchema],
    callAttempts: {
      type: Number,
      default: 0,
    },
    lastCalledAt: {
      type: Date,
      default: null,
    },

    // ── Payment (offline, collected via call) ─────────────────
    paymentLog: [paymentLogSchema],
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum:    Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
    },

    // ── e-Voucher ─────────────────────────────────────────────
    voucherUrl: {
      type: String,
      default: null, // S3 URL of generated PDF voucher
    },
    voucherKey: {
      type: String,
      default: null, // S3 key
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
// inquirySchema.index({ referenceNumber: 1 });
inquirySchema.index({ user: 1, createdAt: -1 });       // user's inquiry list
inquirySchema.index({ status: 1, createdAt: -1 });     // admin filtered by status
inquirySchema.index({ assignedTo: 1, status: 1 });    // admin staff workload
inquirySchema.index({ travelDate: 1 });               // upcoming travel
inquirySchema.index({ paymentStatus: 1 });
inquirySchema.index({ coupon: 1 });                   // coupon analytics
inquirySchema.index({ createdAt: -1 });

// ── Virtual: balance due ───────────────────────────────────────
inquirySchema.virtual('balanceDue').get(function () {
  return Math.max(0, this.totalAmount - this.totalPaid);
});

// ── Virtual: is upcoming ───────────────────────────────────────
inquirySchema.virtual('isUpcoming').get(function () {
  return this.travelDate > new Date();
});

// ── Pre-save: generate reference number ───────────────────────
inquirySchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    const datePart = `ENQ_${date.toISOString().slice(0, 10).replace(/-/g, '')}`;
    // Count today's inquiries for sequential suffix
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const count = await mongoose.model('Inquiry').countDocuments({
      createdAt: { $gte: todayStart },
    });
    this.referenceNumber = `${datePart}-${crypto.randomBytes(4).toString('hex')}-${String(count + 1).padStart(4, '0')}`;
  }

  // Push to status history when status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({ status: this.status });
  }

  // Recalculate totalPaid from payment log
  if (this.isModified('paymentLog')) {
    this.totalPaid = this.paymentLog.reduce((sum, p) => sum + p.amount, 0);
    if (this.totalPaid <= 0) this.paymentStatus = PAYMENT_STATUS.UNPAID;
    else if (this.totalPaid < this.totalAmount) this.paymentStatus = PAYMENT_STATUS.PARTIAL;
    else this.paymentStatus = PAYMENT_STATUS.PAID;
  }

  next();
});

// ── Static: get status counts for admin dashboard ──────────────
inquirySchema.statics.getStatusCounts = async function () {
  return this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
};

// ── Static: revenue summary ────────────────────────────────────
inquirySchema.statics.getRevenueSummary = async function (from, to) {
  return this.aggregate([
    {
      $match: {
        status:    INQUIRY_STATUS.COMPLETED,
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPaid' },
        totalInquiries: { $sum: 1 },
        avgOrderValue: { $avg: '$totalAmount' },
      },
    },
  ]);
};

module.exports = mongoose.model('Inquiry', inquirySchema);
