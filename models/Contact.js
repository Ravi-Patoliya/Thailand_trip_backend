const mongoose = require('mongoose');
const { CONTACT_SOURCE, CONTACT_STATUS } = require('../constants/enums');

/**
 * Contact Model
 * Stores submissions from the public "Contact Us" page.
 * Admin can view, mark as read, and reply.
 */
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },

    // Which page/context the enquiry is from
    source: {
      type:    String,
      enum:    Object.values(CONTACT_SOURCE),
      default: CONTACT_SOURCE.CONTACT_PAGE,
    },

    // Admin workflow
    status: {
      type:    String,
      enum:    Object.values(CONTACT_STATUS),
      default: CONTACT_STATUS.UNREAD,
    },
    repliedAt: { type: Date, default: null },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    replyNote: { type: String, trim: true },

    // IP for spam detection (optional)
    ipAddress: { type: String, select: false },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
