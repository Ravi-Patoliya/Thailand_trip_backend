'use strict';
const router           = require('express').Router();
const ctrl             = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/send-otp',   ctrl.sendOtpValidator,   ctrl.sendOtp);
router.post('/verify-otp', ctrl.verifyOtpValidator,  ctrl.verifyOtp);
router.post('/login',      ctrl.loginValidator,      ctrl.login);
router.post('/refresh',                              ctrl.refresh);
router.post('/logout',     authenticate,             ctrl.logout);
router.get ('/me',         authenticate,             ctrl.getMe);

module.exports = router;
