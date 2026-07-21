'use strict';
const { z }            = require('zod');
const categoryService  = require('../services/category.service');
const { validate, validateParams, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const MSG              = require('../constants/message');

// Shared query schema — admin-only fields are ignored when role is insufficient
const listQuerySchema = z.object({
  id:       zv.mongoId.optional(),                               // fetch single
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  search:   z.string().trim().max(100).optional(),
  parent:   z.union([zv.mongoId, z.literal('null')]).optional(),
  isActive: z.enum(['true', 'false']).optional(),                // admin-only
});

const createCategorySchema = z.object({
  name:            z.string().trim().min(1).max(80),
  description:     z.string().trim().max(500).optional(),
  icon:            z.string().trim().optional(),
  metaTitle:       z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  parent:          zv.mongoId.optional(),
});

const updateCategorySchema = z.object({
  name:            z.string().trim().min(1).max(80).optional(),
  description:     z.string().trim().max(500).optional(),
  icon:            z.string().trim().optional(),
  isActive:        z.boolean().optional(),
  order:           z.coerce.number().int().min(0).optional(),
  metaTitle:       z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const listQueryValidator = validateQuery(listQuerySchema);
const createCategoryValidator = validate(createCategorySchema);
const updateCategoryValidator = validate(updateCategorySchema);

const isAdmin = (req) => req.user && ['admin', 'superadmin'].includes(req.user.role);

// GET /api/categories
// ?id=<mongoId>           → single category  (admin: any status | public: active only)
// no id                   → list             (admin: flat paginated | public: nested active tree)
// admin-only query params : isActive, page, limit (ignored for public callers)
const getCategories = async (req, res, next) => {
  try {
    const admin = isAdmin(req);
    const { id, ...rest } = req.query;

    if (id) {
      const category = await categoryService.getCategoryById(id, { adminView: admin });
      return API_response.OK({ res, message: MSG.CATEGORY_FETCHED, payload: category });
    }

    if (admin) {
      const { data, page, limit, total } = await categoryService.getAllCategories(rest);
      return API_response.OK({ res, message: MSG.CATEGORIES_FETCHED, payload: { data, page, limit, total } });
    }

    // public — force isActive, ignore any status filter from query.
    // Unpaginated by design; still wrapped in { data } so list payloads are
    // consistently objects with a `data` key (never a bare array).
    const data = await categoryService.getActiveCategories({ ...rest, isActive: 'true' });
    API_response.OK({ res, message: MSG.CATEGORIES_FETCHED, payload: { data } });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body, req.user._id);
    API_response.CREATED({ res, message: MSG.CATEGORY_CREATED, payload: category });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.user._id);
    API_response.OK({ res, message: MSG.CATEGORY_UPDATED, payload: category });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    API_response.OK({ res, message: MSG.CATEGORY_DELETED, payload: null });
  } catch (err) { next(err); }
};

module.exports = {
  listQueryValidator,
  createCategoryValidator,
  updateCategoryValidator,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
