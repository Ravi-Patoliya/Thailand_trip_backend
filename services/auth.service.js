'use strict';
const authRepository      = require('../repositories/auth.repository');
const roleService         = require('./role.service');
const { storeOtp, verifyOtp } = require('../utils/otp');
const { issueTokens, verifyRefreshToken, clearRefreshCookie } = require('../utils/jwt');
const { sendOtpEmail }    = require('../helpers/email.helper');
const { getAuth }         = require('../config/firebase.config');
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
      const userRoleId = await roleService.getIdByName('user');
      user = isEmail
        ? await authRepository.createUserByEmail(identifier, userRoleId)
        : await authRepository.createUser({
            mobile:     identifier,
            name:       `User_${identifier.slice(-4)}`,
            role_id:    userRoleId,
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

    if (!user.role_id || !user.role_id.isActive) {
      throw AppError.forbidden('Your role has been deactivated. Please contact support.');
    }

    if (!user.isVerified) {
      await authRepository.markVerified(user._id);
    }

    const payload = { id: user._id, role: user.role_id.name };
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
        role:       { _id: user.role_id._id, name: user.role_id.name, label: user.role_id.label },
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

    if (!user.role_id || !user.role_id.isActive) {
      throw AppError.forbidden('Your role has been deactivated. Please contact support.');
    }

    const payload = { id: user._id, role: user.role_id.name };
    const { accessToken, refreshToken } = issueTokens(res, payload);

    await authRepository.updateRefreshToken(user._id, refreshToken);
    await authRepository.updateLastLogin(user._id);

    return {
      accessToken,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  { _id: user.role_id._id, name: user.role_id.name, label: user.role_id.label },
      },
    };
  }

  async googleLogin(idToken, res) {
    // Verify the Firebase ID token sent by the frontend
    const firebaseAuth = getAuth();
    if (!firebaseAuth) throw AppError.badRequest('Google login is not configured on this server.');

    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired Google token.');
    }

    const { uid, email, name, picture } = decoded;
    if (!email) throw AppError.badRequest('Google account must have an email address.');

    const userRoleId = await roleService.getIdByName('user');

    // Upsert: find by googleId or email, create if new
    let user = await authRepository.findByGoogleId(uid);
    if (!user) user = await authRepository.findByEmail(email);

    if (user) {
      if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);
      // Link googleId if signing in via email-matched account for the first time
      if (!user.googleId) {
        await authRepository.linkGoogleId(user._id, uid, picture);
      }
      // Re-fetch with role populated
      user = await authRepository.findById(user._id);
    } else {
      user = await authRepository.createGoogleUser({
        googleId:   uid,
        email,
        name:       name || `User_${email.split('@')[0]}`,
        avatar:     picture || null,
        role_id:    userRoleId,
        isVerified: true,
        isActive:   true,
      });
      user = await authRepository.findById(user._id);
    }

    if (!user.role_id || !user.role_id.isActive) {
      throw AppError.forbidden('Your role has been deactivated. Please contact support.');
    }

    const payload = { id: user._id, role: user.role_id.name };
    const { accessToken, refreshToken } = issueTokens(res, payload);

    await authRepository.updateRefreshToken(user._id, refreshToken);
    await authRepository.updateLastLogin(user._id);

    return {
      accessToken,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
        role:   { _id: user.role_id._id, name: user.role_id.name, label: user.role_id.label },
        isVerified: true,
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

  async forgotPassword(email, redis) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw AppError.notFound('No account found with this email.');
    if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);

    const otp = await storeOtp(redis, `reset:${email}`);
    await sendOtpEmail(email, otp, { subject: 'Reset your password', purpose: 'password reset' });

    return process.env.NODE_ENV !== 'production' ? { otp } : {};
  }

  async resetPassword(email, otp, newPassword, redis) {
    await verifyOtp(redis, `reset:${email}`, otp);

    const user = await authRepository.findByEmail(email);
    if (!user) throw AppError.notFound('User');
    if (!user.isActive) throw AppError.forbidden(MSG.ACCOUNT_DEACTIVATED);

    const hashed = await require('bcryptjs').hash(newPassword, 12);
    await authRepository.updatePassword(user._id, hashed);
    // Invalidate all existing sessions
    await authRepository.clearRefreshToken(user._id);
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
