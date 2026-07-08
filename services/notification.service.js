'use strict';
const notificationRepository = require('../repositories/notification.repository');
const {
  sendToUser,
  sendToMany,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  PAYLOADS,
}                            = require('../notification.util');
const AppError               = require('../utils/AppError');
const { paginate }           = require('../utils/paginate');
const logger                 = require('../helpers/logger.helper');

const CATEGORY_MAP = {
  inquiry_submitted:    'booking',
  inquiry_status_update:'booking',
  payment_received:     'booking',
  review_approved:      'reviews',
  review_rejected:      'reviews',
  admin_review_reply:   'reviews',
  new_category:         'offers',
  new_service:          'offers',
  broadcast:            'offers',
};

class NotificationService {
  // ── Internal: check user's category preference ────────────────

  async _isAllowed(userId, type) {
    const category = CATEGORY_MAP[type];
    if (!category) return true; // unknown types (e.g. 'system') are always allowed
    const prefs = await notificationRepository.getPrefs(userId);
    return prefs[category] !== false;
  }

  // ── Internal: save record + send FCM push to one user ────────

  async _createAndSend(userId, payload, notifData = {}) {
    try {
      const type = notifData.type || payload.data?.type || 'system';
      if (!(await this._isAllowed(userId, type))) return;

      const notif = await notificationRepository.create({
        user:     userId,
        title:    payload.title,
        body:     payload.body,
        type,
        data:     notifData.data || {},
        pushSent: false,
      });

      const user = await notificationRepository.findUserWithFcmTokens(userId);
      if (user?.fcmTokens?.length) {
        await sendToUser(user, payload);
        await notificationRepository.markPushSent(notif._id);
      }
    } catch (err) {
      logger.error('[NotificationService] _createAndSend error:', err.message);
    }
  }

  async _createAndSendToAdmins(payload, notifData = {}) {
    try {
      const admins = await notificationRepository.findAdminsWithFcmTokens();
      if (!admins.length) return;

      const docs = admins.map(a => ({
        user:     a._id,
        title:    payload.title,
        body:     payload.body,
        type:     notifData.type || 'inquiry_submitted',
        data:     notifData.data || {},
        pushSent: true,
      }));
      await notificationRepository.createMany(docs);
      await sendToMany(admins, payload);
    } catch (err) {
      logger.error('[NotificationService] _createAndSendToAdmins error:', err.message);
    }
  }

  // ── Business event notifications ──────────────────────────────

  async notifyInquirySubmitted(inquiry) {
    const payload = PAYLOADS.inquirySubmitted(
      inquiry.referenceNumber,
      inquiry.contactSnapshot.name
    );
    await this._createAndSendToAdmins(payload, {
      type: 'inquiry_submitted',
      data: { inquiryId: inquiry._id, referenceNumber: inquiry.referenceNumber },
    });
  }

  async notifyInquiryStatusUpdate(inquiry) {
    const payload = PAYLOADS.inquiryStatusUpdate(inquiry.referenceNumber, inquiry.status);
    await this._createAndSend(inquiry.user._id || inquiry.user, payload, {
      type: 'inquiry_status_update',
      data: { inquiryId: inquiry._id, referenceNumber: inquiry.referenceNumber, status: inquiry.status },
    });
  }

  async notifyPaymentReceived(inquiry, amount) {
    const payload = PAYLOADS.paymentReceived(inquiry.referenceNumber, amount);
    await this._createAndSend(inquiry.user._id || inquiry.user, payload, {
      type: 'payment_received',
      data: { inquiryId: inquiry._id, referenceNumber: inquiry.referenceNumber, amount },
    });
  }

  async notifyReviewApproved(review, serviceName) {
    const payload = PAYLOADS.reviewApproved(serviceName);
    await this._createAndSend(review.user._id || review.user, payload, {
      type: 'review_approved',
      data: { reviewId: review._id, serviceId: review.service },
    });
  }

  async notifyReviewRejected(review, serviceName, reason) {
    const payload = PAYLOADS.reviewRejected(serviceName, reason);
    await this._createAndSend(review.user._id || review.user, payload, {
      type: 'review_rejected',
      data: { reviewId: review._id, serviceId: review.service },
    });
  }

  async notifyAdminReviewReply(review, serviceName) {
    const payload = PAYLOADS.adminReviewReply(serviceName);
    await this._createAndSend(review.user._id || review.user, payload, {
      type: 'admin_review_reply',
      data: { reviewId: review._id, serviceId: review.service },
    });
  }

  async notifyNewCategory(category) {
    const payload = PAYLOADS.newCategory(category.name);
    await sendToTopic('new_catalogue', payload);
  }

  async sendBroadcast({ title, body, role = null, adminId }) {
    if (!title || !body) throw AppError.badRequest('Title and body are required.');

    const topic = role === 'admin' ? 'admins' : 'all_users';
    await sendToTopic(topic, { title, body, data: { type: 'broadcast' } });

    await notificationRepository.create({
      user:     adminId,
      title,
      body,
      type:     'broadcast',
      data:     { extra: { targetRole: role || 'all' } },
      pushSent: true,
    });

    return { message: `Broadcast sent to topic "${topic}".` };
  }

  // ── Notification preferences ──────────────────────────────────

  async getNotificationPrefs(userId) {
    return notificationRepository.getPrefs(userId);
  }

  async updateNotificationPrefs(userId, prefs) {
    const ALLOWED = new Set(['booking', 'reviews', 'offers']);
    const invalid = Object.keys(prefs).filter(k => !ALLOWED.has(k));
    if (invalid.length) throw AppError.badRequest(`Invalid preference keys: ${invalid.join(', ')}`);

    const nonBool = Object.entries(prefs).filter(([, v]) => typeof v !== 'boolean');
    if (nonBool.length) throw AppError.badRequest('Preference values must be boolean.');

    return notificationRepository.updatePrefs(userId, prefs);
  }

  // ── FCM token management ──────────────────────────────────────

  async registerFcmToken(userId, fcmToken, role = 'user') {
    if (!fcmToken) throw AppError.badRequest('FCM token is required.');

    await notificationRepository.addFcmToken(userId, fcmToken);

    await subscribeToTopic([fcmToken], 'all_users');
    await subscribeToTopic([fcmToken], 'new_catalogue');
    if (['admin', 'superadmin'].includes(role)) {
      await subscribeToTopic([fcmToken], 'admins');
    }

    return { registered: true };
  }

  async removeFcmToken(userId, fcmToken) {
    await notificationRepository.removeFcmToken(userId, fcmToken);
    await unsubscribeFromTopic([fcmToken], 'all_users');
    await unsubscribeFromTopic([fcmToken], 'new_catalogue');
    await unsubscribeFromTopic([fcmToken], 'admins');
  }

  // ── User notification inbox ───────────────────────────────────

  async getUserNotifications(userId, query) {
    const { page, limit, skip } = paginate(query, { limit: 20 });
    const onlyUnread = query.unread === 'true';

    let categoryTypes;
    if (query.category) {
      categoryTypes = Object.entries(CATEGORY_MAP)
        .filter(([, cat]) => cat === query.category)
        .map(([type]) => type);
    }

    const [data, total, unread] = await Promise.all([
      notificationRepository.findByUser({ userId, skip, limit, onlyUnread, types: categoryTypes }),
      notificationRepository.countByUser(userId, onlyUnread, categoryTypes),
      notificationRepository.unreadCount(userId),
    ]);

    return { data, page, limit, total, unread };
  }

  async markRead(notifId, userId) {
    const notif = await notificationRepository.markRead(notifId, userId);
    if (!notif) throw AppError.notFound('Notification');
    return notif;
  }

  async markAllRead(userId) {
    return notificationRepository.markAllRead(userId);
  }

  async deleteOne(notifId, userId) {
    const result = await notificationRepository.deleteOne(notifId, userId);
    if (!result) throw AppError.notFound('Notification');
  }

  async deleteAllRead(userId) {
    return notificationRepository.deleteAllRead(userId);
  }

  async getUnreadCount(userId) {
    return notificationRepository.unreadCount(userId);
  }

  async listAllNotifications(query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 50 });
    const filter = {};
    if (query.type)   filter.type = query.type;
    if (query.userId) filter.user = query.userId;

    const [data, total] = await Promise.all([
      notificationRepository.findAll({ filter, skip, limit, sort }),
      notificationRepository.countAll(filter),
    ]);
    return { data, page, limit, total };
  }
}

module.exports = new NotificationService();
module.exports.CATEGORY_MAP = CATEGORY_MAP;
