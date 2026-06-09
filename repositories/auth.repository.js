'use strict';
const { User } = require('../models');

class AuthRepository {
  async findByMobile(mobile) {
    return User.findOne({ mobile }).select('+password +refreshToken +otp');
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  }

  async findById(id) {
    return User.findById(id).select('+refreshToken');
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async existsByMobile(mobile) {
    return User.exists({ mobile });
  }

  async existsByEmail(email) {
    return User.exists({ email: email.toLowerCase() });
  }

  async createUser(data) {
    return User.create(data);
  }

  async createUserByEmail(email) {
    return User.create({
      email,
      name:       `User_${email.split('@')[0]}`,
      role:       'user',
      isVerified: false,
    });
  }

  async updateRefreshToken(userId, refreshToken) {
    return User.findByIdAndUpdate(userId, { refreshToken }, { new: true });
  }

  async markVerified(userId) {
    return User.findByIdAndUpdate(
      userId,
      { isVerified: true, 'otp.code': null, 'otp.expiresAt': null },
      { new: true }
    );
  }

  async updateLastLogin(userId) {
    return User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }

  async saveGoogleUser(googleId, data) {
    return User.findOneAndUpdate(
      { googleId },
      { $set: { ...data, googleId, isVerified: true } },
      { upsert: true, new: true }
    );
  }

  async clearRefreshToken(userId) {
    return User.findByIdAndUpdate(userId, { $unset: { refreshToken: '' } });
  }

  async updatePassword(userId, hashedPassword) {
    return User.findByIdAndUpdate(userId, { password: hashedPassword });
  }
}

module.exports = new AuthRepository();
