'use strict';
const bcrypt         = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const AppError       = require('../utils/AppError');
const MSG            = require('../constants/message');
const { paginate }   = require('../utils/paginate');
const { deleteObject } = require('../helpers/s3.helper');

class UserService {
  async listUsers(query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 20 });

    const filter = {};

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { mobile: regex }];
    }

    const [data, total] = await Promise.all([
      userRepository.findAll({ filter, skip, limit, sort }),
      userRepository.countAll(filter),
    ]);

    return { data, page, limit, total };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  async updateProfile(userId, body) {
    const { name, email, mobile, address, passportNumber, dateOfBirth } = body;

    if (email) {
      const exists = await userRepository.existsByEmail(email, userId);
      if (exists) throw AppError.conflict(MSG.EMAIL_CONFLICT);
    }

    if (mobile) {
      const exists = await userRepository.existsByMobile(mobile, userId);
      if (exists) throw AppError.conflict(MSG.MOBILE_CONFLICT);
    }

    const updated = await userRepository.updateById(userId, {
      ...(name            && { name }),
      ...(email           && { email }),
      ...(mobile          && { mobile }),
      ...(address         && { address }),
      ...(passportNumber  && { passportNumber }),
      ...(dateOfBirth     && { dateOfBirth }),
    });

    if (!updated) throw AppError.notFound('User');
    return updated;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithSensitive(userId);
    if (!user) throw AppError.notFound('User');

    if (!user.password) {
      throw AppError.badRequest(MSG.NO_PASSWORD);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw AppError.badRequest(MSG.WRONG_PASSWORD);

    if (currentPassword === newPassword) {
      throw AppError.badRequest(MSG.SAME_PASSWORD);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(userId, hashed);
  }

  async updateAvatar(userId, avatarUrl, oldAvatarKey = null) {
    if (oldAvatarKey) await deleteObject(oldAvatarKey);
    return userRepository.updateAvatar(userId, avatarUrl);
  }

  async createAdminUser(body, createdByRole) {
    if (createdByRole !== 'superadmin') {
      throw AppError.forbidden(MSG.FORBIDDEN_ADMIN_CREATE);
    }

    const { name, email, password, role = 'admin' } = body;

    if (!['admin', 'superadmin'].includes(role)) {
      throw AppError.badRequest(MSG.INVALID_ADMIN_ROLE);
    }

    const emailExists = await userRepository.existsByEmail(email);
    if (emailExists) throw AppError.conflict(MSG.EMAIL_CONFLICT);

    return userRepository.create({ name, email, password, role, isVerified: true, isActive: true });
  }

  async setUserActive(userId, isActive) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User');

    if (user.role === 'superadmin') {
      throw AppError.forbidden(MSG.FORBIDDEN_SUPERADMIN_DEACTIVATE);
    }

    return userRepository.setActive(userId, isActive);
  }

  async deleteUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User');
    if (user.role === 'superadmin') throw AppError.forbidden(MSG.FORBIDDEN_SUPERADMIN_DELETE);
    return userRepository.deleteById(userId);
  }

  async getDashboardStats() {
    const [roleCounts, recentUsers] = await Promise.all([
      userRepository.countByRole(),
      userRepository.getRecentUsers(5),
    ]);
    return { roleCounts, recentUsers };
  }
}

module.exports = new UserService();
