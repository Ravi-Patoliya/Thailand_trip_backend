const mongoose = require('mongoose');
const slugify  = require('slugify');
const { SERVICE_AVAILABILITY, DURATION_UNIT } = require('../constants/enums');

/**
 * Service Model
 * Represents individual bookable items within a category.
 * e.g. "Phuket Airport Taxi", "Pattaya Beach Hotel Standard Room", "Koh Samui Villa (3BHK)"
 * Supports multiple images, rich pricing, inclusions/exclusions, and duration.
 */

// Sub-schema: a single image/media asset stored in S3
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },  // CloudFront/S3 public URL
    key: { type: String, required: true },  // S3 object key (for deletion)
    isPrimary: { type: Boolean, default: false }, // thumbnail
    altText: { type: String, default: '' },
    mimeType: { type: String }, // image/webp, video/mp4
    sizeBytes: { type: Number },
  },
  { _id: true }
);

// Sub-schema: pricing tier
const priceTierSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Per Person", "Per Vehicle", "Per Night"
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    isBase: { type: Boolean, default: false }, // base/starting price shown on card
  },
  { _id: true }
);

const serviceSchema = new mongoose.Schema(
  {
    // ── Basics ────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },

    // ── Description (rich text stored as HTML string) ──────────
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    shortDescription: {
      type: String,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
      trim: true,
    },

    // ── Pricing ────────────────────────────────────────────────
    pricing: [priceTierSchema],
    // Convenience field: pulled from pricing where isBase=true for fast card rendering
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // ── Media ─────────────────────────────────────────────────
    images: [mediaSchema],   // photos
    videos: [mediaSchema],   // short reels uploaded by admin for service showcase

    // ── Details ───────────────────────────────────────────────
    duration: {
      value: { type: Number },          // e.g. 3
      unit: {
        type:    String,
        enum:    Object.values(DURATION_UNIT),
        default: DURATION_UNIT.DAYS,
      },
    },
    maxGroupSize: {
      type: Number,
      min: 1,
      default: null, // null = no limit
    },
    availability: {
      type:    String,
      enum:    Object.values(SERVICE_AVAILABILITY),
      default: SERVICE_AVAILABILITY.AVAILABLE,
    },
    inclusions: [{ type: String, trim: true }],   // "Airport pickup", "Breakfast"
    exclusions: [{ type: String, trim: true }],   // "Airfare", "Personal expenses"
    highlights: [{ type: String, trim: true }],   // Key selling points

    // ── Location (Thailand context) ────────────────────────────
    location: {
      city: { type: String, trim: true },   // e.g. Phuket, Pattaya, Bangkok
      region: { type: String, trim: true },
    },

    // ── Rating cache (denormalised for performance) ────────────
    // Updated by a post-save hook on Review model
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    // ── State ─────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },

    // ── SEO ───────────────────────────────────────────────────
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    tags: [{ type: String, lowercase: true, trim: true }],

    // ── Audit ─────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
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
// serviceSchema.index({ slug: 1 });
serviceSchema.index({ category: 1, isActive: 1 });         // category page query
serviceSchema.index({ isActive: 1, isFeatured: 1 });       // featured services
serviceSchema.index({ basePrice: 1 });                      // price filter
serviceSchema.index({ 'rating.average': -1 });             // top rated
serviceSchema.index({ 'location.city': 1 });               // location filter
serviceSchema.index({ tags: 1 });                          // tag search
serviceSchema.index({ createdAt: -1 });
// Full-text search index
serviceSchema.index(
  { title: 'text', shortDescription: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, shortDescription: 2 } }
);

// ── Virtual: primary image ─────────────────────────────────────
serviceSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find((img) => img.isPrimary) || this.images[0];
});

// ── Pre-save: slug + basePrice sync ───────────────────────────
serviceSchema.pre('save', function (next) {
  // Generate slug
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  // Sync basePrice from pricing array
  if (this.isModified('pricing') && this.pricing.length > 0) {
    const base = this.pricing.find((p) => p.isBase);
    this.basePrice = base ? base.amount : this.pricing[0].amount;
  }
  next();
});


module.exports = mongoose.model('Service', serviceSchema);
