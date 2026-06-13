'use strict';
const AppError = require('./AppError');

const OTP_TTL = 5 * 60; // 5 minutes in seconds

const generateOtp = () =>
  process.env.NODE_ENV !== 'production' ? '123456' : String(Math.floor(100000 + Math.random() * 900000));

const storeOtp = async (redis, identifier) => {
  const otp = generateOtp();
  await redis.set(`otp:${identifier}`, otp, 'EX', OTP_TTL);
  return otp;
};

const verifyOtp = async (redis, identifier, inputOtp) => {
  const stored = await redis.get(`otp:${identifier}`);
  if (!stored)              throw AppError.badRequest('OTP has expired. Please request a new one.');
  if (stored !== inputOtp)  throw AppError.badRequest('Invalid OTP. Please try again.');
  await redis.del(`otp:${identifier}`);
};

module.exports = { storeOtp, verifyOtp };
