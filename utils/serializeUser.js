'use strict';

// Single canonical user shape returned by every user-returning endpoint
// (/auth/login, /auth/verify-otp, /auth/google, /auth/me, ...).
// `role` is ALWAYS a string (the role name); never exposes refreshToken/password/otp.
const serializeUser = (user) => {
  if (!user) return null;

  // Support both populated role_id objects and plain ObjectIds
  const role      = user.role_id && user.role_id.name  ? user.role_id.name  : null;
  const roleLabel = user.role_id && user.role_id.label ? user.role_id.label : null;
  const roleId    = user.role_id && user.role_id._id   ? user.role_id._id   : user.role_id || null;

  return {
    id:         user._id,
    name:       user.name,
    email:      user.email || null,
    mobile:     user.mobile || null,
    avatar:     user.avatar || null,
    role,                       // string, e.g. "superadmin"
    roleLabel,                  // human-readable, e.g. "Super Admin" (null if role not populated)
    role_id:    roleId,         // ObjectId of the role
    isActive:   user.isActive,
    isVerified: user.isVerified,
    createdAt:  user.createdAt,
  };
};

module.exports = serializeUser;
