'use strict';
const { z }        = require('zod');
const userService  = require('../services/user.service');
const { validate, validateParams, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const MSG          = require('../constants/message');

const idParamSchema = z.object({ id: zv.mongoId });

const updateProfileSchema = z.object({
  name:           z.string().trim().min(2).max(100).optional(),
  email:          zv.email.optional(),
  mobile:         zv.mobile.optional(),
  passportNumber: z.string().trim().max(20).optional(),
  dateOfBirth:    z.coerce.date().optional(),
  address: z.object({
    city:    z.string().trim().max(50).optional(),
    state:   z.string().trim().max(50).optional(),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter valid 6-digit pincode').optional(),
  }).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required to update.' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     zv.password,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const updateAvatarSchema = z.object({
  avatarUrl:    z.string().url('Invalid avatar URL'),
  oldAvatarKey: z.string().optional(),
});

const createAdminSchema = z.object({
  name:     z.string().trim().min(2).max(100),
  email:    zv.email,
  password: zv.password,
  role_id:  zv.mongoId,
});

const setActiveSchema = z.object({
  isActive: z.boolean(),
});

const updateAdminSchema = z.object({
  name:   z.string().trim().min(2).max(100).optional(),
  email:  zv.email.optional(),
  mobile: zv.mobile.optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const setAdminPasswordSchema = z.object({
  newPassword:     zv.password,
  confirmPassword: z.string().min(1, 'Please confirm the password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

const updateRoleSchema = z.object({
  role_id: zv.mongoId,
});

const listUsersQuerySchema = z.object({
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  role_id:  zv.mongoId.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search:   z.string().trim().max(100).optional(),
  sort:     z.string().optional(),
  order:    z.enum(['asc', 'desc']).optional(),
});

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user._id);
    API_response.OK({ res, message: MSG.USER_FETCHED, payload: user });
  } catch (err) { next(err); }
};

const updateProfileValidator = validate(updateProfileSchema);
const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user._id, req.body);
    API_response.OK({ res, message: MSG.USER_UPDATED, payload: updated });
  } catch (err) { next(err); }
};

const changePasswordValidator = validate(changePasswordSchema);
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user._id, currentPassword, newPassword);
    API_response.OK({ res, message: MSG.PASSWORD_CHANGED });
  } catch (err) { next(err); }
};

const updateAvatarValidator = validate(updateAvatarSchema);
const updateAvatar = async (req, res, next) => {
  try {
    const { avatarUrl, oldAvatarKey } = req.body;
    const result = await userService.updateAvatar(req.user._id, avatarUrl, oldAvatarKey);
    API_response.OK({ res, message: MSG.AVATAR_UPDATED, payload: result });
  } catch (err) { next(err); }
};

const listUsersQueryValidator = validateQuery(listUsersQuerySchema);
const listUsers = async (req, res, next) => {
  try {
    const { data, page, limit, total } = await userService.listUsers(req.query);
    API_response.OK({ res, message: MSG.USERS_FETCHED, payload: { data, page, limit, total } });
  } catch (err) { next(err); }
};

const getUserByIdParamValidator = validateParams(idParamSchema);
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    API_response.OK({ res, message: MSG.USER_FETCHED, payload: user });
  } catch (err) { next(err); }
};

const createAdminUserValidator = validate(createAdminSchema);
const createAdminUser = async (req, res, next) => {
  try {
    const user = await userService.createAdminUser(req.body, req.user.role);
    API_response.CREATED({ res, message: MSG.USER_CREATED, payload: user });
  } catch (err) { next(err); }
};

const setActiveValidator = validate(setActiveSchema);
const setUserActive = async (req, res, next) => {
  try {
    const result = await userService.setUserActive(req.params.id, req.body.isActive);
    const message = req.body.isActive ? MSG.USER_ACTIVATED : MSG.USER_DEACTIVATED;
    API_response.OK({ res, message, payload: result });
  } catch (err) { next(err); }
};

const updateUserRoleValidator = validate(updateRoleSchema);
const updateUserRole = async (req, res, next) => {
  try {
    const updated = await userService.updateUserRole(req.params.id, req.body.role_id);
    API_response.OK({ res, message: 'User role updated successfully.', payload: updated });
  } catch (err) { next(err); }
};

const updateAdminUserValidator = validate(updateAdminSchema);
const updateAdminUser = async (req, res, next) => {
  try {
    const updated = await userService.updateAdminUser(req.params.id, req.body, req.user.role);
    API_response.OK({ res, message: MSG.USER_UPDATED, payload: updated });
  } catch (err) { next(err); }
};

const setAdminPasswordValidator = validate(setAdminPasswordSchema);
const setAdminPassword = async (req, res, next) => {
  try {
    await userService.setAdminPassword(req.params.id, req.body.newPassword, req.user.role);
    API_response.OK({ res, message: MSG.PASSWORD_CHANGED });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    API_response.OK({ res, message: MSG.USER_DELETED });
  } catch (err) { next(err); }
};

const getUserStats = async (req, res, next) => {
  try {
    const stats = await userService.getDashboardStats();
    API_response.OK({ res, message: MSG.STATS_FETCHED, payload: stats });
  } catch (err) { next(err); }
};

module.exports = {
  getMe,
  updateProfileValidator,    updateProfile,
  changePasswordValidator,   changePassword,
  updateAvatarValidator,     updateAvatar,
  listUsersQueryValidator,   listUsers,
  getUserByIdParamValidator, getUserById,
  createAdminUserValidator,  createAdminUser,
  setActiveValidator,        setUserActive,
  deleteUser,
  getUserStats,
  updateUserRoleValidator,    updateUserRole,
  updateAdminUserValidator,   updateAdminUser,
  setAdminPasswordValidator,  setAdminPassword,
};
