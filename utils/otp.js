'use strict';
const AppError = require('./AppError');
const Otp      = require('../models/Otp');

// Redis is the primary store for OTPs; Mongo is a fallback for when Redis is
// unreachable, so a provider blip never blocks login/signup. Each `storeOtp`
// overwrites any prior OTP for the same identifier and resets the TTL, so
// only the LATEST request is ever valid — an old/expired OTP can never block
// a fresh login.
const OTP_TTL          = 5 * 60; // OTP validity window, seconds
const MAX_VERIFY_TRIES = 5;      // wrong-guess attempts allowed per OTP before lockout
const OTP_LENGTH       = 6;

const otpKey      = (identifier) => `otp:${identifier}`;
const attemptsKey = (identifier) => `otp:attempts:${identifier}`;

// `status` can be transiently 'connecting'/'reconnecting' even while the
// client is about to serve the call fine (e.g. brief provider-side blips), so
// only treat Redis as down once it has never connected at all (status 'end',
// or missing client) — anything else is attempted and falls back on failure.
const isRedisDown = (redis) => !redis || redis.status === 'end';

// True for errors that mean "this Redis call didn't happen" (as opposed to a
// bug in our own code) — these are exactly the cases the Mongo fallback below
// should catch.
const isRedisFailure = (err) =>
  err?.message?.includes('Redis is not ready') ||
  err?.name === 'MaxRetriesPerRequestError' ||
  err?.code === 'ECONNREFUSED';

const generateOtp = () => {
  // Deterministic code in non-prod for easier testing; cryptographically-derived in prod.
  if (process.env.NODE_ENV !== 'production') return '123456';
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  // crypto.randomInt is uniform and unbiased (unlike Math.random)
  return String(require('crypto').randomInt(min, max + 1));
};

// ── Mongo fallback ────────────────────────────────────────────────
// Used whenever Redis is down or a Redis call fails, so OTP flows keep
// working. Mirrors the Redis key/TTL/attempts semantics above.
const mongoStoreOtp = async (identifier) => {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000);
  await Otp.findOneAndUpdate(
    { identifier },
    { otp, attempts: 0, expiresAt },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return otp;
};

const mongoVerifyOtp = async (identifier, inputOtp) => {
  const record = await Otp.findOne({ identifier });

  if (!record) {
    throw AppError.badRequest('Your OTP has expired or was already used. Please request a new one.');
  }

  if (record.otp !== inputOtp) {
    record.attempts += 1;

    if (record.attempts >= MAX_VERIFY_TRIES) {
      await Otp.deleteOne({ _id: record._id });
      throw AppError.badRequest('Too many incorrect attempts. Please request a new OTP.');
    }

    await record.save();
    const left = MAX_VERIFY_TRIES - record.attempts;
    throw AppError.badRequest(`Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
  }

  await Otp.deleteOne({ _id: record._id });
};

const mongoClearOtp = async (identifier) => {
  try {
    await Otp.deleteOne({ identifier });
  } catch {
    /* non-critical */
  }
};

/**
 * Generate a fresh OTP, overwriting any existing one and resetting its TTL.
 * Also clears the verify-attempt counter so the new OTP starts with a clean slate.
 * Multiple rapid requests simply keep the most recent OTP (last-write-wins).
 * Falls back to Mongo whenever Redis is down or a Redis call fails.
 */
const storeOtp = async (redis, identifier) => {
  if (isRedisDown(redis)) return mongoStoreOtp(identifier);

  const otp = generateOtp();
  try {
    // MULTI so the OTP write and attempt-counter reset are atomic together.
    await redis
      .multi()
      .set(otpKey(identifier), otp, 'EX', OTP_TTL)
      .del(attemptsKey(identifier))
      .exec();
    return otp;
  } catch (err) {
    if (isRedisFailure(err)) return mongoStoreOtp(identifier);
    throw err;
  }
};

/**
 * Verify an OTP. Throws AppError on any failure; resolves (and consumes the OTP)
 * on success. Enforces a per-OTP wrong-guess cap to prevent brute force.
 * Falls back to Mongo whenever Redis is down or a Redis call fails.
 */
const verifyOtp = async (redis, identifier, inputOtp) => {
  if (isRedisDown(redis)) return mongoVerifyOtp(identifier, inputOtp);

  let stored;
  try {
    stored = await redis.get(otpKey(identifier));
  } catch (err) {
    if (isRedisFailure(err)) return mongoVerifyOtp(identifier, inputOtp);
    throw err;
  }

  // No active OTP in Redis: could mean it was actually stored in Mongo (Redis
  // was down at send-time, since recovered). Check there before giving up.
  if (!stored) {
    const mongoRecord = await Otp.findOne({ identifier });
    if (mongoRecord) return mongoVerifyOtp(identifier, inputOtp);
    throw AppError.badRequest('Your OTP has expired or was already used. Please request a new one.');
  }

  if (stored !== inputOtp) {
    // Count the failed attempt against the CURRENT OTP. The counter shares the
    // OTP's lifetime, so it resets automatically when a new OTP is issued.
    const attempts = await redis.incr(attemptsKey(identifier));
    if (attempts === 1) await redis.expire(attemptsKey(identifier), OTP_TTL);

    if (attempts >= MAX_VERIFY_TRIES) {
      // Burn the OTP so the attacker must trigger a new send (rate-limited upstream).
      await redis.del(otpKey(identifier), attemptsKey(identifier));
      throw AppError.badRequest('Too many incorrect attempts. Please request a new OTP.');
    }

    const left = MAX_VERIFY_TRIES - attempts;
    throw AppError.badRequest(`Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
  }

  // Success — consume the OTP and clear the attempt counter (one-time use).
  await redis.del(otpKey(identifier), attemptsKey(identifier));
};

/**
 * Best-effort invalidation of any active OTP for an identifier (e.g. on logout
 * or password reset). Never throws. Clears both stores since either may hold
 * the active OTP depending on Redis's availability at the time it was issued.
 */
const clearOtp = async (redis, identifier) => {
  try {
    if (!isRedisDown(redis)) await redis.del(otpKey(identifier), attemptsKey(identifier));
  } catch {
    /* non-critical */
  }
  await mongoClearOtp(identifier);
};

module.exports = { storeOtp, verifyOtp, clearOtp, OTP_TTL, MAX_VERIFY_TRIES };
