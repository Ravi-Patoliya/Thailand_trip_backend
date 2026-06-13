const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:      String,
      unique:    true,
      sparse:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    mobile: {
      type:  String,
      unique: true,
      sparse: true,
      trim:   true,
      // match:  [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
    },
    countryCode: {
      type:    String,
      default: '+91',
      trim:    true,
    },
    password: {
      type:      String,
      minlength: [8, 'Password must be at least 8 characters'],
      select:    false,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Role',
    },
    // OTP stored in Redis in production; this is a fallback
    otp: {
      code:      { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts:  { type: Number, default: 0, select: false },
    },
    refreshToken: {
      type:   String,
      select: false,
    },
    googleId: {
      type:   String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type:    String,
      default: null,
    },
    passportNumber: {
      type:    String,
      trim:    true,
      default: null,
    },
    dateOfBirth: {
      type:    Date,
      default: null,
    },
    address: {
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    fcmTokens: {
      type:    [String],
      default: [],
      select:  false,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },
    lastLoginAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

userSchema.index({ role_id: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual('fullMobile').get(function () {
  if (!this.mobile) return null;
  return `${this.countryCode}${this.mobile}`;
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isOtpValid = function (code) {
  if (!this.otp.code || !this.otp.expiresAt) return false;
  if (new Date() > this.otp.expiresAt) return false;
  if (this.otp.attempts >= 3) return false;
  return this.otp.code === code;
};

// Find admins: caller must pass admin/superadmin role_ids
userSchema.statics.findAdmins = function (adminRoleIds = []) {
  return this.find({ role_id: { $in: adminRoleIds }, isActive: true });
};

module.exports = mongoose.model('User', userSchema);
