const mongoose = require('mongoose');
const { NOTIFICATION_TYPE } = require('../constants/enums');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    title: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 150,
    },
    body: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 500,
    },
    type: {
      type:     String,
      enum:     Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    data: {
      referenceNumber: { type: String },
      inquiryId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
      serviceId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
      categoryId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      reviewId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
      status:          { type: String },
      amount:          { type: Number },
      extra:           { type: mongoose.Schema.Types.Mixed },
    },
    isRead: {
      type:    Boolean,
      default: false,
    },
    readAt: {
      type:    Date,
      default: null,
    },
    pushSent: {
      type:    Boolean,
      default: false,
    },
    pushError: {
      type:    String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

notificationSchema.statics.unreadCount = function (userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
