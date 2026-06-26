'use strict';
const { Notification, User, Role } = require('../models');

class NotificationRepository {
  async create(data) {
    return Notification.create(data);
  }

  async createMany(docs) {
    return Notification.insertMany(docs, { ordered: false });
  }

  async findByUser({ userId, skip = 0, limit = 20, onlyUnread = false, types }) {
    const filter = { user: userId };
    if (onlyUnread) filter.isRead = false;
    if (types?.length) filter.type = { $in: types };
    return Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByUser(userId, onlyUnread = false, types) {
    const filter = { user: userId };
    if (onlyUnread) filter.isRead = false;
    if (types?.length) filter.type = { $in: types };
    return Notification.countDocuments(filter);
  }

  async findById(id) {
    return Notification.findById(id);
  }

  async markRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
  }

  async markAllRead(userId) {
    return Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  async deleteOne(id, userId) {
    return Notification.findOneAndDelete({ _id: id, user: userId });
  }

  async deleteAllRead(userId) {
    return Notification.deleteMany({ user: userId, isRead: true });
  }

  async unreadCount(userId) {
    return Notification.unreadCount(userId);
  }

  async findAll({ filter = {}, skip = 0, limit = 50, sort = { createdAt: -1 } }) {
    return Notification.find(filter)
      .populate('user', 'name mobile email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return Notification.countDocuments(filter);
  }

  async markPushSent(id) {
    return Notification.findByIdAndUpdate(id, { $set: { pushSent: true } });
  }

  // ── User FCM helpers (owned by notification domain) ───────────

  async findUserWithFcmTokens(userId) {
    return User.findById(userId).select('+fcmTokens').lean();
  }

  async findAdminsWithFcmTokens() {
    const adminRoles = await Role.find({ name: { $in: ['admin', 'superadmin'] } }).select('_id').lean();
    const adminRoleIds = adminRoles.map(r => r._id);
    return User.find({ role_id: { $in: adminRoleIds }, isActive: true, isDeleted: false })
      .select('+fcmTokens')
      .lean();
  }

  async addFcmToken(userId, fcmToken) {
    return User.findByIdAndUpdate(userId, { $addToSet: { fcmTokens: fcmToken } });
  }

  async removeFcmToken(userId, fcmToken) {
    return User.findByIdAndUpdate(userId, { $pull: { fcmTokens: fcmToken } });
  }

  async getPrefs(userId) {
    const user = await User.findById(userId).select('notificationPrefs').lean();
    return user?.notificationPrefs ?? { booking: true, reviews: true, offers: true };
  }

  async updatePrefs(userId, prefs) {
    const update = {};
    for (const [k, v] of Object.entries(prefs)) {
      update[`notificationPrefs.${k}`] = v;
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, select: 'notificationPrefs' }
    ).lean();
    return user?.notificationPrefs;
  }
}

module.exports = new NotificationRepository();
