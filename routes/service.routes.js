'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/service.controller');
const { optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { validateParams, zod: zv }    = require('../middlewares/validate.middleware');
const { uploadMedia }                = require('../middlewares/upload.middleware');
const { z }                          = require('zod');

const idParamValidator = validateParams(z.object({ id: zv.mongoId }));

// GET /api/services          — public: active only | admin: all statuses
router.get('/', optionalAuth, ctrl.listQueryValidator, ctrl.getServices);

// Admin — create / update / delete (soft)
// Create is multipart: file fields "images"/"video" + text field "data" (JSON payload).
router.post  ('/',    ...requireAdmin, uploadMedia, ctrl.createService);
router.patch ('/:id', ...requireAdmin, uploadMedia, idParamValidator, ctrl.updateService);
router.delete('/:id', ...requireAdmin, idParamValidator,                           ctrl.deleteService);

module.exports = router;
