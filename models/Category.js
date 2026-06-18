const mongoose = require('mongoose');
const slugify = require('slugify');

/**
 * Category Model
 * Top-level grouping: Taxi Booking, Hotel Booking, Villa Booking, Place Booking, Tour Packages
 * Admin-managed. Orderable via drag-and-drop in admin UI.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Icon: stores icon name (e.g. Lucide icon key, or emoji, or uploaded icon URL)
    icon: {
      type: String,
      default: null,
    },

    // Cover image shown on category card
    coverImage: {
      url: { type: String, default: null },
      key: { type: String, default: null }, // S3 key for deletion
    },

    // Display order (lower = shown first)
    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Self-referencing parent — null means top-level category, ObjectId means subcategory
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },

    // Meta for SEO
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
// categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, order: 1 }); // compound: active categories sorted by order
categorySchema.index({ createdAt: -1 });

// ── Virtual: count of active services ─────────────────────────
// Note: populate with countDocuments in controller for real count
categorySchema.virtual('services', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// ── Pre-save: auto-generate slug ───────────────────────────────
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ── Pre-update: regenerate slug on name change ─────────────────
categorySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.name) {
    update.slug = slugify(update.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
