'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/role.controller');
const { optionalAuth, requireAdmin, requireSuperAdmin } = require('../middlewares/auth.middleware');

// GET /api/roles  — public (frontend dropdown)
router.get ('/',     optionalAuth,        ctrl.getRoles);
router.get ('/:id',  optionalAuth,        ctrl.idValidator,    ctrl.getRoleById);

// Admin — create / update
router.post  ('/',     ...requireAdmin,   ctrl.createValidator, ctrl.createRole);
router.patch ('/:id',  ...requireAdmin,   ctrl.idValidator, ctrl.updateValidator, ctrl.updateRole);

// Activate / deactivate — superadmin only
router.patch ('/:id/active', ...requireSuperAdmin, ctrl.idValidator, ctrl.activeValidator, ctrl.setRoleActive);

module.exports = router;
