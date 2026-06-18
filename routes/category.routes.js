'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/category.controller');
const { optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { validateParams, zod: zv } = require('../middlewares/validate.middleware');
const { z } = require('zod');

const idParam = z.object({ id: zv.mongoId });
const idParamValidator = validateParams(idParam);

// GET  /api/categories          — all (list or single via ?id=)
router.get('/', optionalAuth, ctrl.listQueryValidator, ctrl.getCategories);

// Admin — create / update / delete
router.post('/', ...requireAdmin, ctrl.createCategoryValidator, ctrl.createCategory);
router.patch('/:id', ...requireAdmin, idParamValidator, ctrl.updateCategoryValidator, ctrl.updateCategory);
router.delete('/:id', ...requireAdmin, idParamValidator, ctrl.deleteCategory);

module.exports = router;
