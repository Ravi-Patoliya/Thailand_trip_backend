'use strict';
const AppError = require('./AppError');

// Redis is the single source of truth for OTPs. Each `storeOtp` overwrites any
// prior OTP for the same identifier and resets the TTL, so only the LATEST
// request is ever valid — an old/expired OTP can never block a fresh login.
const OTP_TTL          = 5 * 60; // OTP validity window, seconds
const MAX_VERIFY_TRIES = 5;      // wrong-guess attempts allowed per OTP before lockout
const OTP_LENGTH       = 6;

const otpKey      = (identifier) => `otp:${identifier}`;
const attemptsKey = (identifier) => `otp:attempts:${identifier}`;

// Redis is optional infra (see config/redis.config.js). `status` can be
// transiently 'connecting'/'reconnecting' even while the client is about to
// serve the call fine (e.g. brief provider-side blips), so gating on the
// status string alone caused false 503s. Instead, only report unavailable
// once redis has never connected at all (status 'end', or missing client).
const assertRedisReady = (redis) => {
  if (!redis || redis.status === 'end') {
    throw AppError.serviceUnavailable('OTP service is temporarily unavailable. Please try again shortly.');
  }
};

// Wrap a redis call so genuine connection failures surface as a clean 503
// instead of the raw ioredis error (e.g. ECONNREFUSED, MaxRetriesPerRequestError).
const withRedis = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    if (err?.message?.includes('Redis is not ready') || err?.name === 'MaxRetriesPerRequestError' || err?.code === 'ECONNREFUSED') {
      throw AppError.serviceUnavailable('OTP service is temporarily unavailable. Please try again shortly.');
    }
    throw err;
  }
};

const generateOtp = () => {
  // Deterministic code in non-prod for easier testing; cryptographically-derived in prod.
  if (process.env.NODE_ENV !== 'production') return '123456';
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  // crypto.randomInt is uniform and unbiased (unlike Math.random)
  return String(require('crypto').randomInt(min, max + 1));
};

/**
 * Generate a fresh OTP, overwriting any existing one and resetting its TTL.
 * Also clears the verify-attempt counter so the new OTP starts with a clean slate.
 * Multiple rapid requests simply keep the most recent OTP (last-write-wins).
 */
const storeOtp = async (redis, identifier) => {
  assertRedisReady(redis);
  const otp = generateOtp();
  // MULTI so the OTP write and attempt-counter reset are atomic together.
  await withRedis(() => redis
    .multi()
    .set(otpKey(identifier), otp, 'EX', OTP_TTL)
    .del(attemptsKey(identifier))
    .exec());
  return otp;
};

/**
 * Verify an OTP. Throws AppError on any failure; resolves (and consumes the OTP)
 * on success. Enforces a per-OTP wrong-guess cap to prevent brute force.
 */
const verifyOtp = async (redis, identifier, inputOtp) => {
  assertRedisReady(redis);
  const stored = await withRedis(() => redis.get(otpKey(identifier)));

  // No active OTP: either never requested, already used, or genuinely expired.
  if (!stored) {
    throw AppError.badRequest('Your OTP has expired or was already used. Please request a new one.');
  }

  if (stored !== inputOtp) {
    // Count the failed attempt against the CURRENT OTP. The counter shares the
    // OTP's lifetime, so it resets automatically when a new OTP is issued.
    const attempts = await withRedis(() => redis.incr(attemptsKey(identifier)));
    if (attempts === 1) await withRedis(() => redis.expire(attemptsKey(identifier), OTP_TTL));

    if (attempts >= MAX_VERIFY_TRIES) {
      // Burn the OTP so the attacker must trigger a new send (rate-limited upstream).
      await withRedis(() => redis.del(otpKey(identifier), attemptsKey(identifier)));
      throw AppError.badRequest('Too many incorrect attempts. Please request a new OTP.');
    }

    const left = MAX_VERIFY_TRIES - attempts;
    throw AppError.badRequest(`Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
  }

  // Success — consume the OTP and clear the attempt counter (one-time use).
  await withRedis(() => redis.del(otpKey(identifier), attemptsKey(identifier)));
};

/**
 * Best-effort invalidation of any active OTP for an identifier (e.g. on logout
 * or password reset). Never throws.
 */
const clearOtp = async (redis, identifier) => {
  try {
    await redis.del(otpKey(identifier), attemptsKey(identifier));
  } catch {
    /* non-critical */
  }
};

module.exports = { storeOtp, verifyOtp, clearOtp, OTP_TTL, MAX_VERIFY_TRIES };
