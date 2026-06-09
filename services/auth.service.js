'use strict';
const authRepository      = require('../repositories/auth.repository');
const { storeOtp, verifyOtp } = require('../utils/otp');
const { issueTokens, verifyRefreshToken, clearRefreshCookie } = require('../utils/jwt');
const { sendOtpEmail }    = require('../helpers/email.helper');
const AppError            = require('../utils/AppError');
const MSG                 = require('../constants/message');

class AuthService {
  // identifier is either a mobile number or an email address
  async sendOtp(identifier, redis) {
    const isEmail = identifier.includes('@');

    let user = isEmail
      ? await authRepository.findByEmail(identifier)
      : await authRepository.findByMobile(identifier);

    if (!user) {
      user = isEmail
        ? await authRepository.createUserByEmail(identifier)
        : await authRepository.createUser({
            mobile:     identifier,
            name:       `User_${identifier.slice(-4)}`,
            role:       'user',
            isVerified: false,
          });
    }

    if (!user.isActive) {
      throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);
    }

    const otp = await storeOtp(redis, identifier);

    if (isEmail) {
      await sendOtpEmail(identifier, otp);
      return process.env.NODE_ENV === 'production' ? null : otp;
    }

    // SMS delivery is handled externally (MSG91); return OTP in non-prod
    return process.env.NODE_ENV === 'production' ? null : otp;
  }

  // identifier is either a mobile number or an email address
  async verifyOtpAndLogin(identifier, inputOtp, redis, res) {
    const isEmail = identifier.includes('@');

    const user = isEmail
      ? await authRepository.findByEmail(identifier)
      : await authRepository.findByMobile(identifier);

    if (!user) throw AppError.notFound('User');
    if (!user.isActive) throw AppError.forbidden('Account deactivated.');

    await verifyOtp(redis, identifier, inputOtp);

    if (!user.isVerified) {
      await authRepository.markVerified(user._id);
    }

    const payload = { id: user._id, role: user.role };
    const { accessToken, refreshToken } = issueTokens(res, payload);

    await authRepository.updateRefreshToken(user._id, refreshToken);
    await authRepository.updateLastLogin(user._id);

    return {
      accessToken,
      user: {
        id:         user._id,
        name:       user.name,
        mobile:     user.mobile,
        email:      user.email,
        role:       user.role,
        isVerified: true,
      },
    };
  }

  async loginWithPassword(email, password, res) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw AppError.unauthorized(MSG.INVALID_CREDENTIALS);
    if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw AppError.unauthorized(MSG.INVALID_CREDENTIALS);

    const payload = { id: user._id, role: user.role };
    const { accessToken, refreshToken } = issueTokens(res, payload);

    await authRepository.updateRefreshToken(user._id, refreshToken);
    await authRepository.updateLastLogin(user._id);

    return {
      accessToken,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    };
  }

  async refreshTokens(req, res) {
    const token = req.cookies?.refreshToken;
    if (!token) throw AppError.unauthorized(MSG.NO_REFRESH_TOKEN);

    const decoded = verifyRefreshToken(token);
    const user    = await authRepository.findById(decoded.id);

    if (!user) throw AppError.unauthorized(MSG.INVALID_CREDENTIALS);
    if (user.refreshToken !== token) {
      await authRepository.clearRefreshToken(user._id);
      throw AppError.unauthorized(MSG.TOKEN_REUSE);
    }
    if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);

    const payload = { id: user._id, role: user.role };
    const { accessToken, refreshToken } = issueTokens(res, payload);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return { accessToken };
  }

  async logout(userId, res) {
    await authRepository.clearRefreshToken(userId);
    clearRefreshCookie(res);
  }

  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound('User');
    return user;
  }
}

module.exports = new AuthService();
