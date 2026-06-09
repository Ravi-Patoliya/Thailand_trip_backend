'use strict';
const { User } = require('../models');

class UserRepository {
  async findAll({ filter = {}, skip = 0, limit = 10, sort = { createdAt: -1 } }) {
    return User.find(filter)
      .select('-refreshToken -otp -password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return User.countDocuments(filter);
  }

  async findById(id) {
    return User.findById(id).select('-refreshToken -otp -password');
  }

  async findByIdWithSensitive(id) {
    return User.findById(id).select('+password +refreshToken');
  }

  async findByMobile(mobile) {
    return User.findOne({ mobile });
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async existsByMobile(mobile, excludeId = null) {
    const filter = { mobile };
    if (excludeId) filter._id = { $ne: excludeId };
    return User.exists(filter);
  }

  async existsByEmail(email, excludeId = null) {
    const filter = { email: email.toLowerCase() };
    if (excludeId) filter._id = { $ne: excludeId };
    return User.exists(filter);
  }

  async create(data) {
    return User.create(data);
  }

  async updateById(id, data) {
    return User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-refreshToken -otp -password');
  }

  async updateAvatar(id, avatarUrl) {
    return User.findByIdAndUpdate(
      id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('avatar');
  }

  async setActive(id, isActive) {
    return User.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    ).select('_id name isActive');
  }

  async updatePassword(id, hashedPassword) {
    return User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });
  }

  async deleteById(id) {
    return User.findByIdAndDelete(id);
  }

  async countByRole() {
    return User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  async getRecentUsers(limit = 5) {
    return User.find({ role: 'user', isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name mobile email createdAt')
      .lean();
  }
}

module.exports = new UserRepository();
