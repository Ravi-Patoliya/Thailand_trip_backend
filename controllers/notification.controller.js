'use strict';
const { z }                  = require('zod');
const notificationService    = require('../services/notification.service');
const { validate, validateParams, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response }       = require('../helpers');
const { ROLE }               = require('../constants/enums');
const MSG                    = require('../constants/message');

const idParam = z.object({ id: zv.mongoId });

const registerFcmSchema = z.object({
  fcmToken: z.string().trim().min(10, 'Invalid FCM token'),
  platform: z.enum(['web', 'android', 'ios']).optional(),
});

const removeFcmSchema = z.object({
  fcmToken: z.string().trim().min(10, 'Invalid FCM token'),
});

const prefsSchema = z.object({
  booking: z.boolean().optional(),
  reviews: z.boolean().optional(),
  offers:  z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Provide at least one preference to update.' });

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body:  z.string().trim().min(3).max(500),
  role:  z.enum([...Object.values(ROLE), 'all']).optional(),
});

const listQuerySchema = z.object({
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  unread:   z.enum(['true', 'false']).optional(),
  category: z.enum(['booking', 'reviews', 'offers']).optional(),
});

const adminListQuerySchema = z.object({
  page:   zv.positiveInt.optional(),
  limit:  zv.positiveInt.optional(),
  type:   z.string().optional(),
  userId: zv.mongoId.optional(),
});

const registerFcmTokenValidator = validate(registerFcmSchema);
const registerFcmToken = async (req, res, next) => {
  try {
    const result = await notificationService.registerFcmToken(
      req.user._id,
      req.body.fcmToken,
      req.user.role
    );
    API_response.OK({ res, message: MSG.FCM_REGISTERED, payload: result });
  } catch (err) { next(err); }
};

const removeFcmTokenValidator = validate(removeFcmSchema);
const removeFcmToken = async (req, res, next) => {
  try {
    await notificationService.removeFcmToken(req.user._id, req.body.fcmToken);
    API_response.OK({ res, message: MSG.FCM_REMOVED });
  } catch (err) { next(err); }
};

const listQueryValidator = validateQuery(listQuerySchema);
const getUserNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    API_response.OK({ res, message: MSG.NOTIFICATIONS_FETCHED, payload: result });
  } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    API_response.OK({ res, message: MSG.UNREAD_COUNT_FETCHED, payload: { unread: count } });
  } catch (err) { next(err); }
};

const idParamValidator = validateParams(idParam);
const markRead = async (req, res, next) => {
  try {
    const notif = await notificationService.markRead(req.params.id, req.user._id);
    API_response.OK({ res, message: MSG.NOTIFICATION_READ, payload: notif });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user._id);
    API_response.OK({ res, message: MSG.NOTIFICATIONS_ALL_READ });
  } catch (err) { next(err); }
};

const deleteOne = async (req, res, next) => {
  try {
    await notificationService.deleteOne(req.params.id, req.user._id);
    API_response.OK({ res, message: MSG.NOTIFICATION_DELETED });
  } catch (err) { next(err); }
};

const deleteAllRead = async (req, res, next) => {
  try {
    await notificationService.deleteAllRead(req.user._id);
    API_response.OK({ res, message: MSG.NOTIFICATIONS_CLEARED });
  } catch (err) { next(err); }
};

const getPreferences = async (req, res, next) => {
  try {
    const prefs = await notificationService.getNotificationPrefs(req.user._id);
    API_response.OK({ res, message: MSG.NOTIFICATION_PREFS_FETCHED, payload: prefs });
  } catch (err) { next(err); }
};

const prefsValidator = validate(prefsSchema);
const updatePreferences = async (req, res, next) => {
  try {
    const prefs = await notificationService.updateNotificationPrefs(req.user._id, req.body);
    API_response.OK({ res, message: MSG.NOTIFICATION_PREFS_UPDATED, payload: prefs });
  } catch (err) { next(err); }
};

const broadcastValidator = validate(broadcastSchema);
const sendBroadcast = async (req, res, next) => {
  try {
    const { title, body, role } = req.body;
    const result = await notificationService.sendBroadcast({
      title,
      body,
      role: role === 'all' ? null : role,
      adminId: req.user._id,
    });
    API_response.OK({ res, message: result.message });
  } catch (err) { next(err); }
};

const adminListQueryValidator = validateQuery(adminListQuerySchema);
const listAllNotifications = async (req, res, next) => {
  try {
    const { data, page, limit, total } = await notificationService.listAllNotifications(req.query);
    API_response.OK({ res, message: 'Notifications fetched.', payload: { data, page, limit, total } });
  } catch (err) { next(err); }
};

module.exports = {
  registerFcmTokenValidator, registerFcmToken,
  removeFcmTokenValidator,   removeFcmToken,
  listQueryValidator,        getUserNotifications,
  getUnreadCount,
  idParamValidator,          markRead,
  markAllRead,
  deleteOne,
  deleteAllRead,
  getPreferences,
  prefsValidator,            updatePreferences,
  broadcastValidator,        sendBroadcast,
  adminListQueryValidator,   listAllNotifications,
};
