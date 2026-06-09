'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/notification.controller');
const { requireUser, requireAdmin } = require('../middlewares/auth.middleware');

router.post  ('/fcm-token',    ...requireUser,  ctrl.registerFcmTokenValidator, ctrl.registerFcmToken);
router.delete('/fcm-token',    ...requireUser,  ctrl.removeFcmTokenValidator,   ctrl.removeFcmToken);

router.get   ('/',             ...requireUser,  ctrl.listQueryValidator,         ctrl.getUserNotifications);
router.get   ('/unread-count', ...requireUser,  ctrl.getUnreadCount);
router.patch ('/read-all',     ...requireUser,  ctrl.markAllRead);
router.delete('/read',         ...requireUser,  ctrl.deleteAllRead);
router.patch ('/:id/read',     ...requireUser,  ctrl.idParamValidator,           ctrl.markRead);
router.delete('/:id',          ...requireUser,  ctrl.idParamValidator,           ctrl.deleteOne);

router.post('/broadcast',      ...requireAdmin, ctrl.broadcastValidator,         ctrl.sendBroadcast);
router.get ('/admin/all',      ...requireAdmin, ctrl.adminListQueryValidator,     ctrl.listAllNotifications);

module.exports = router;
