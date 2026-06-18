'use strict';
const { User } = require('../models');

class AuthRepository {
  async findByMobile(mobile) {
    return User.findOne({ mobile, isDeleted: false })
      .select('+password +refreshToken')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase(), isDeleted: false })
      .select('+password +refreshToken')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findById(id) {
    return User.findOne({ _id: id, isDeleted: false })
      .select('+refreshToken')
      .populate({ path: 'role_id', select: 'name label isActive' });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId, isDeleted: false })
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
    return User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
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

  async updateById(userId, data) {
    return User.findByIdAndUpdate(userId, { $set: data }, { new: true });
  }
}

module.exports = new AuthRepository();
