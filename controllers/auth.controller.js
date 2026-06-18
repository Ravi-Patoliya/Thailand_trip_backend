'use strict';
const { z }            = require('zod');
const authService      = require('../services/auth.service');
const { validate, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const MSG              = require('../constants/message');

const sendOtpSchema = z
  .object({
    mobile: zv.mobile.optional(),
    email:  zv.email.optional(),
  })
  .refine((d) => d.mobile || d.email, { message: 'Provide either mobile or email' })
  .refine((d) => !(d.mobile && d.email), { message: 'Provide only one of mobile or email, not both' });

const verifyOtpSchema = z
  .object({
    mobile: zv.mobile.optional(),
    email:  zv.email.optional(),
    otp:    zv.otp,
  })
  .refine((d) => d.mobile || d.email, { message: 'Provide either mobile or email' })
  .refine((d) => !(d.mobile && d.email), { message: 'Provide only one of mobile or email, not both' });

const loginSchema = z.object({
  email:    zv.email,
  password: z.string().min(1, 'Password is required'),
});

const googleSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

const forgotPasswordSchema = z.object({
  email: zv.email,
});

const resetPasswordSchema = z.object({
  email:           zv.email,
  otp:             zv.otp,
  newPassword:     zv.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

const sendOtpValidator = validate(sendOtpSchema);
const sendOtp = async (req, res, next) => {
  try {
    const identifier = req.body.mobile || req.body.email;
    const otp        = await authService.sendOtp(identifier, req.redis);
    const message    = req.body.email ? MSG.OTP_SENT_EMAIL : MSG.OTP_SENT;
    const payload    = process.env.NODE_ENV !== 'production' ? { otp } : {};
    API_response.OK({ res, message, payload });
  } catch (err) { next(err); }
};

const verifyOtpValidator = validate(verifyOtpSchema);
const verifyOtp = async (req, res, next) => {
  try {
    const identifier = req.body.mobile || req.body.email;
    const result     = await authService.verifyOtpAndLogin(identifier, req.body.otp, req.redis, res);
    API_response.OK({ res, message: MSG.LOGIN_SUCCESS, payload: result });
  } catch (err) { next(err); }
};

const googleValidator = validate(googleSchema);
const googleLogin = async (req, res, next) => {
  try {
    const result = await authService.googleLogin(req.body.idToken, res);
    API_response.OK({ res, message: MSG.LOGIN_SUCCESS, payload: result });
  } catch (err) { next(err); }
};

const loginValidator = validate(loginSchema);
const login = async (req, res, next) => {
  try {
    const result = await authService.loginWithPassword(req.body.email, req.body.password, res);
    API_response.OK({ res, message: MSG.LOGIN_SUCCESS, payload: result });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refreshTokens(req, res);
    API_response.OK({ res, message: MSG.TOKEN_REFRESHED, payload: result });
  } catch (err) { next(err); }
};

const forgotPasswordValidator = validate(forgotPasswordSchema);
const forgotPassword = async (req, res, next) => {
  try {
    const payload = await authService.forgotPassword(req.body.email, req.redis);
    API_response.OK({ res, message: 'Password reset OTP sent to your email.', payload });
  } catch (err) { next(err); }
};

const resetPasswordValidator = validate(resetPasswordSchema);
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword(email, otp, newPassword, req.redis);
    API_response.OK({ res, message: 'Password reset successfully. Please log in again.' });
  } catch (err) { next(err); }
};

// Idempotent — does not require a valid access token. Always returns 200.
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.cookies?.refreshToken, res);
    API_response.OK({ res, message: MSG.LOGOUT_SUCCESS });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    API_response.OK({ res, message: MSG.USER_FETCHED, payload: user });
  } catch (err) { next(err); }
};

module.exports = {
  sendOtpValidator,      sendOtp,
  verifyOtpValidator,    verifyOtp,
  googleValidator,       googleLogin,
  loginValidator,        login,
  forgotPasswordValidator, forgotPassword,
  resetPasswordValidator,  resetPassword,
  refresh,
  logout,
  getMe,
};
