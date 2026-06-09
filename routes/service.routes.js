'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/service.controller');
const { optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { validateParams, zod: zv }    = require('../middlewares/validate.middleware');
const { z }                          = require('zod');

const idParamValidator = validateParams(z.object({ id: zv.mongoId }));

// GET /api/services          — public: active only | admin: all statuses
router.get('/', optionalAuth, ctrl.listQueryValidator, ctrl.getServices);

// Admin — create / update / delete (soft)
router.post  ('/',    ...requireAdmin, ctrl.createServiceValidator,               ctrl.createService);
router.patch ('/:id', ...requireAdmin, idParamValidator, ctrl.updateServiceValidator, ctrl.updateService);
router.delete('/:id', ...requireAdmin, idParamValidator,                           ctrl.deleteService);

module.exports = router;
