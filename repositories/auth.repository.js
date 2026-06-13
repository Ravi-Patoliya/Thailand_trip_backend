'use strict';
const { User } = require('../models');

class AuthRepository {
  async findByMobile(mobile) {
    return User.findOne({ mobile })
      .select('+password +refreshToken +otp')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshToken')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findById(id) {
    return User.findById(id)
      .select('+refreshToken')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId })
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async createGoogleUser(data) {
    return User.create(data);
  }

  async linkGoogleId(userId, googleId, avatar) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { googleId, ...(avatar && !avatar ? {} : { avatar }) } },
      { new: true }
    );
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

  async createUserByEmail(email, userRoleId) {
    return User.create({
      email,
      name:       `User_${email.split('@')[0]}`,
      role_id:    userRoleId,
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

  async clearRefreshToken(userId) {
    return User.findByIdAndUpdate(userId, { $unset: { refreshToken: '' } });
  }

  async updatePassword(userId, hashedPassword) {
    return User.findByIdAndUpdate(userId, { password: hashedPassword });
  }
}

module.exports = new AuthRepository();
