const mongoose = require('mongoose');
const { REVIEW_STATUS, TRAVEL_TYPE } = require('../constants/enums');

/**
 * Review Model
 * Post-booking reviews only (linked to a completed inquiry for authenticity).
 * Supports text, multiple images, and one short video reel.
 * Requires admin approval before going live.
 */

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },   // CloudFront/S3 URL
    key: { type: String, required: true },   // S3 key for deletion
    mimeType: { type: String },              // image/webp | video/mp4
    sizeBytes: { type: Number },
    thumbnailUrl: { type: String },          // video thumbnail
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: [true, 'Inquiry reference is required'],
      // One review per inquiry-service combination (enforced by unique index)
    },

    // ── Rating & Text ─────────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    body: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },

    // ── Media ─────────────────────────────────────────────────
    images: {
      type: [mediaSchema],
      validate: {
        validator: (v) => v.length <= 5,
        message: 'Maximum 5 images allowed per review',
      },
    },
    video: {
      type: mediaSchema,
      default: null, // one short reel (≤60s, ≤50MB)
    },

    // ── Trip Context (shown with review for credibility) ──────
    travelDate: { type: Date },       // from linked inquiry
    travelType: {
      type:    String,
      enum:    Object.values(TRAVEL_TYPE),
      default: null,
    },

    // ── Moderation ────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values:  Object.values(REVIEW_STATUS),
        message: 'Status must be pending, approved, or rejected',
      },
      default: REVIEW_STATUS.PENDING,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Admin Reply ───────────────────────────────────────────
    adminReply: {
      text: { type: String, trim: true },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      repliedAt: { type: Date },
    },

    // ── Engagement ────────────────────────────────────────────
    helpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulVotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Flags ─────────────────────────────────────────────────
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
// One review per user per service per inquiry
reviewSchema.index({ service: 1, user: 1, inquiry: 1 }, { unique: true });
reviewSchema.index({ service: 1, status: 1, createdAt: -1 });  // service review list
reviewSchema.index({ user: 1, createdAt: -1 });                // user's reviews
reviewSchema.index({ status: 1, createdAt: -1 });              // admin moderation queue
reviewSchema.index({ rating: 1 });                             // rating filter
reviewSchema.index({ isFlagged: 1 });                          // flagged content

// ── Static: get rating distribution for a service ─────────────
reviewSchema.statics.getRatingDistribution = async function (serviceId) {
  return this.aggregate([
    {
      $match: {
        service: new mongoose.Types.ObjectId(serviceId),
        status: REVIEW_STATUS.APPROVED,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);
};

// ── Static: get pending moderation count ──────────────────────
reviewSchema.statics.getPendingCount = function () {
  return this.countDocuments({ status: REVIEW_STATUS.PENDING, isDeleted: false });
};

module.exports = mongoose.model('Review', reviewSchema);
