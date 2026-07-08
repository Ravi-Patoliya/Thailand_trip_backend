'use strict';
const { getMessaging } = require('./config/firebase.config');
const logger           = require('./helpers/logger.helper');

const sendToTokens = async (tokens, { title, body, data = {} }) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug(`[FCM] Skipped (Firebase not configured): ${title}`);
    return { successCount: 0, failureCount: 0, staleTokens: [] };
  }

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, staleTokens: [] };
  }

  const uniqueTokens = [...new Set(tokens)];

  const message = {
    notification: { title, body },
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      clickAction: data.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: {
        sound:       'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId:   data.channelId || 'default',
      },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast({ tokens: uniqueTokens, ...message });

    const staleTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code || '';
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          staleTokens.push(uniqueTokens[idx]);
        }
        logger.warn(`[FCM] Token send failed (${uniqueTokens[idx].slice(0, 12)}...): ${errorCode}`);
      }
    });

    logger.info(`[FCM] Sent "${title}" → ${response.successCount}✓ ${response.failureCount}✗`);
    return { successCount: response.successCount, failureCount: response.failureCount, staleTokens };

  } catch (err) {
    logger.error('[FCM] sendToTokens error:', err.message);
    return { successCount: 0, failureCount: 0, staleTokens: [] };
  }
};

const sendToUser = async (user, payload) => {
  if (!user?.fcmTokens?.length) return;

  const { staleTokens } = await sendToTokens(user.fcmTokens, payload);

  if (staleTokens.length > 0) {
    try {
      const { User } = require('./models');
      const remaining = user.fcmTokens.filter(t => !staleTokens.includes(t));
      const update = { $pull: { fcmTokens: { $in: staleTokens } } };
      // All tokens gone — ask the client to re-register on next login
      if (remaining.length === 0) update.$set = { fcmTokenRequired: true };
      await User.findByIdAndUpdate(user._id, update);
    } catch (err) {
      logger.warn('[FCM] Failed to remove stale tokens:', err.message);
    }
  }
};

const sendToMany = async (users, payload) => {
  if (!users?.length) return;
  const allTokens = users.flatMap(u => u.fcmTokens || []);
  if (!allTokens.length) return;
  await sendToTokens(allTokens, payload);
};

const sendToTopic = async (topic, payload) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug(`[FCM] Topic send skipped (Firebase not configured): ${topic}`);
    return;
  }

  try {
    const message = {
      topic,
      notification: { title: payload.title, body: payload.body },
      data: Object.fromEntries(
        Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high', notification: { sound: 'default', channelId: payload.data?.channelId || 'default' } },
      apns:    { payload: { aps: { sound: 'default' } } },
    };

    const response = await messaging.send(message);
    logger.info(`[FCM] Topic "${topic}" sent → messageId: ${response}`);
  } catch (err) {
    logger.error(`[FCM] Topic send error (${topic}):`, err.message);
  }
};

const subscribeToTopic = async (tokens, topic) => {
  const messaging = getMessaging();
  if (!messaging || !tokens?.length) return;
  try {
    await messaging.subscribeToTopic(tokens, topic);
    logger.info(`[FCM] Subscribed ${tokens.length} token(s) to topic "${topic}"`);
  } catch (err) {
    logger.warn(`[FCM] subscribeToTopic error (${topic}):`, err.message);
  }
};

const unsubscribeFromTopic = async (tokens, topic) => {
  const messaging = getMessaging();
  if (!messaging || !tokens?.length) return;
  try {
    await messaging.unsubscribeFromTopic(tokens, topic);
  } catch (err) {
    logger.warn(`[FCM] unsubscribeFromTopic error (${topic}):`, err.message);
  }
};

const PAYLOADS = {
  inquirySubmitted: (ref, userName) => ({
    title: '🔔 New Inquiry Received',
    body:  `${userName} submitted inquiry ${ref}. Tap to view details.`,
    data:  { type: 'inquiry_submitted', referenceNumber: ref, channelId: 'inquiries' },
  }),

  inquiryStatusUpdate: (ref, status) => {
    const statusLabels = {
      contacted:       { emoji: '📞', msg: 'Our team has contacted you about your booking.' },
      confirmed:       { emoji: '✅', msg: 'Your booking has been confirmed!' },
      payment_pending: { emoji: '💳', msg: 'Payment is pending for your booking.' },
      completed:       { emoji: '🎉', msg: 'Your Thailand trip booking is complete. Have a great trip!' },
      cancelled:       { emoji: '❌', msg: 'Your booking has been cancelled. Contact us for help.' },
    };
    const label = statusLabels[status] || { emoji: '📋', msg: `Booking status updated to ${status}.` };
    return {
      title: `${label.emoji} Booking ${ref}`,
      body:  label.msg,
      data:  { type: 'inquiry_status_update', referenceNumber: ref, status, channelId: 'bookings' },
    };
  },

  paymentReceived: (ref, amount) => ({
    title: '💰 Payment Received',
    body:  `We received ₹${amount} for booking ${ref}. Thank you!`,
    data:  { type: 'payment_received', referenceNumber: ref, amount: String(amount), channelId: 'payments' },
  }),

  reviewApproved: (serviceName) => ({
    title: '⭐ Review Published',
    body:  `Your review for "${serviceName}" is now live. Thank you for your feedback!`,
    data:  { type: 'review_approved', channelId: 'reviews' },
  }),

  reviewRejected: (serviceName, reason) => ({
    title: '❌ Review Not Published',
    body:  `Your review for "${serviceName}" was not approved. Reason: ${reason || 'Content guidelines not met.'}`,
    data:  { type: 'review_rejected', channelId: 'reviews' },
  }),

  adminReviewReply: (serviceName) => ({
    title: '💬 New Reply to Your Review',
    body:  `The team replied to your review of "${serviceName}". Tap to read.`,
    data:  { type: 'admin_review_reply', channelId: 'reviews' },
  }),

  newCategory: (categoryName) => ({
    title: '🌟 New Category Available',
    body:  `"${categoryName}" services are now available. Explore now!`,
    data:  { type: 'new_category', channelId: 'catalogue' },
  }),

  newService: (serviceName, categoryName) => ({
    title: `✈️ New Service: ${serviceName}`,
    body:  `A new service has been added under ${categoryName}. Check it out!`,
    data:  { type: 'new_service', channelId: 'catalogue' },
  }),
};

module.exports = {
  sendToUser,
  sendToMany,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  PAYLOADS,
};
