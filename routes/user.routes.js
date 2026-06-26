'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { requireUser, requireAdmin, requireSuperAdmin } = require('../middlewares/auth.middleware');

router.get   ('/me',           ...requireUser,       ctrl.getMe);
router.patch ('/me',           ...requireUser,       ctrl.updateProfileValidator,   ctrl.updateProfile);
router.patch ('/me/password',  ...requireAdmin,      ctrl.changePasswordValidator,  ctrl.changePassword);
router.patch ('/me/avatar',    ...requireUser,       ctrl.updateAvatarValidator,    ctrl.updateAvatar);

router.get   ('/stats',        ...requireAdmin,      ctrl.getUserStats);
router.get   ('/',             ...requireAdmin,      ctrl.listUsersQueryValidator,  ctrl.listUsers);
router.get   ('/:id',          ...requireAdmin,      ctrl.getUserByIdParamValidator, ctrl.getUserById);
router.post  ('/',             ...requireAdmin,      ctrl.createAdminUserValidator, ctrl.createAdminUser);
router.patch ('/:id/active',   ...requireAdmin,      ctrl.setActiveValidator,       ctrl.setUserActive);
router.patch ('/:id/role',     ...requireSuperAdmin, ctrl.updateUserRoleValidator,   ctrl.updateUserRole);
router.patch ('/:id',          ...requireSuperAdmin, ctrl.getUserByIdParamValidator, ctrl.updateAdminUserValidator,  ctrl.updateAdminUser);
router.patch ('/:id/password', ...requireSuperAdmin, ctrl.getUserByIdParamValidator, ctrl.setAdminPasswordValidator, ctrl.setAdminPassword);
router.delete('/:id',          ...requireSuperAdmin, ctrl.deleteUser);

module.exports = router;
