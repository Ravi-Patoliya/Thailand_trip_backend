'use strict';
const mongoose = require('mongoose');

const BANNER_TYPE = {
  HERO:        'hero',
  PROMOTIONAL: 'promotional',
  CATEGORY:    'category',
  POPUP:       'popup',
};

const BANNER_TARGET = {
  HOME:     'home',
  SERVICES: 'services',
  CATEGORY: 'category',
  CUSTOM:   'custom',
};

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Banner title is required'],
      trim:      true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    subtitle: {
      type:    String,
      trim:    true,
      maxlength: [300, 'Subtitle cannot exceed 300 characters'],
      default: null,
    },
    description: {
      type:    String,
      trim:    true,
      default: null,
    },

    // ── Media ─────────────────────────────────────────────────────
    image: {
      url:       { type: String, required: [true, 'Banner image URL is required'] },
      key:       { type: String, required: [true, 'Banner image S3 key is required'] },
      altText:   { type: String, default: '' },
      mimeType:  { type: String },
      sizeBytes: { type: Number },
    },
    // Optional separate image for mobile viewports
    mobileImage: {
      url:       { type: String, default: null },
      key:       { type: String, default: null },
      altText:   { type: String, default: '' },
      mimeType:  { type: String },
      sizeBytes: { type: Number },
    },

    // ── CTA ───────────────────────────────────────────────────────
    ctaLabel: {
      type:    String,
      trim:    true,
      default: null,
    },
    ctaLink: {
      type:    String,
      trim:    true,
      default: null,
    },

    // ── Classification ────────────────────────────────────────────
    type: {
      type:    String,
      enum:    Object.values(BANNER_TYPE),
      default: BANNER_TYPE.HERO,
    },
    target: {
      type:    String,
      enum:    Object.values(BANNER_TARGET),
      default: BANNER_TARGET.HOME,
    },

    // ── Display control ───────────────────────────────────────────
    order: {
      type:    Number,
      default: 0,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    isDeleted: {
      type:    Boolean,
      default: false,
    },

    // ── Validity window (optional) ────────────────────────────────
    validFrom: {
      type:    Date,
      default: null,
    },
    validUntil: {
      type:    Date,
      default: null,
    },

    // ── Audit ─────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ target: 1, isActive: 1 });
bannerSchema.index({ createdAt: -1 });

bannerSchema.virtual('isLive').get(function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.validFrom  && now < this.validFrom)  return false;
  if (this.validUntil && now > this.validUntil) return false;
  return true;
});

module.exports = { Banner: mongoose.model('Banner', bannerSchema), BANNER_TYPE, BANNER_TARGET };
