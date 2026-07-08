'use strict';
const router           = require('express').Router();
const ctrl             = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { rateLimiters } = require('../middlewares/ratelimiter');

// `otp` limiter caps OTP-issuing endpoints (5 / hour / IP); `auth` caps credential checks.
router.post('/send-otp',   rateLimiters.otp,  ctrl.sendOtpValidator,   ctrl.sendOtp);
router.post('/verify-otp', rateLimiters.auth, ctrl.verifyOtpValidator, ctrl.verifyOtp);
router.post('/google',     rateLimiters.auth, ctrl.googleValidator, ctrl.googleLogin);
router.post('/login',      rateLimiters.auth, ctrl.loginValidator,     ctrl.login);
router.post('/forgot-password', rateLimiters.otp,  ctrl.forgotPasswordValidator, ctrl.forgotPassword);
router.post('/reset-password',  rateLimiters.auth, ctrl.resetPasswordValidator,  ctrl.resetPassword);
router.post('/refresh',                              ctrl.refresh);
router.post('/logout',                               ctrl.logout);
router.get ('/me',         authenticate,             ctrl.getMe);

module.exports = router;
