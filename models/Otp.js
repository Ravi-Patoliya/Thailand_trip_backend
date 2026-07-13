const mongoose = require('mongoose');

/**
 * Otp Model
 * Mongo-backed fallback for OTP storage when Redis is unavailable.
 * expiresAt drives a TTL index so expired OTPs are auto-purged, mirroring
 * Redis's EX behaviour.
 */
const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
