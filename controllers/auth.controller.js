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

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id, res);
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
  sendOtpValidator, sendOtp,
  verifyOtpValidator, verifyOtp,
  loginValidator, login,
  refresh,
  logout,
  getMe,
};
