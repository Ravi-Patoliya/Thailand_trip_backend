'use strict';
const { User } = require('../models');

class UserRepository {
  async findAll({ filter = {}, skip = 0, limit = 10, sort = { createdAt: -1 } }) {
    return User.find(filter)
      .select('-refreshToken -otp -password')
      .populate({ path: 'role_id', select: 'name label' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return User.countDocuments(filter);
  }

  async findById(id) {
    return User.findOne({ _id: id, isDeleted: false })
      .select('-refreshToken -otp -password')
      .populate({ path: 'role_id', select: 'name label' });
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
    )
      .select('-refreshToken -otp -password')
      .populate({ path: 'role_id', select: 'name label' });
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

  async softDeleteById(id) {
    return User.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
  }

  async countByRole() {
    return User.aggregate([
      { $group: { _id: '$role_id', count: { $sum: 1 } } },
      { $lookup: { from: 'roles', localField: '_id', foreignField: '_id', as: 'role' } },
      { $unwind: { path: '$role', preserveNullAndEmpty: true } },
      { $project: { _id: 0, role: '$role.name', label: '$role.label', count: 1 } },
      { $sort: { role: 1 } },
    ]);
  }

  async getRecentUsers(userRoleId, limit = 5) {
    return User.find({ role_id: userRoleId, isActive: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name mobile email createdAt')
      .lean();
  }
}

module.exports = new UserRepository();
