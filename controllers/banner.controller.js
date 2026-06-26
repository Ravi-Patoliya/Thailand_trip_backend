'use strict';
const { z }           = require('zod');
const bannerService   = require('../services/banner.service');
const { validate, validateQuery, validateParams, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { uploadObject, deleteObjects } = require('../helpers/s3.helper');
const AppError         = require('../utils/AppError');
const MSG              = require('../constants/message');
const { BANNER_TYPE, BANNER_TARGET } = require('../models/Banner');

// ── Schemas ───────────────────────────────────────────────────────

const imageSchema = z.object({
  url:       z.string().trim().url(),
  key:       z.string().trim().min(1),
  altText:   z.string().trim().default(''),
  mimeType:  z.string().trim().optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  id:       zv.mongoId.optional(),
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  target:   z.enum(Object.values(BANNER_TARGET)).optional(),
  type:     z.enum(Object.values(BANNER_TYPE)).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const createBannerSchema = z.object({
  title:       z.string().trim().min(1).max(150),
  subtitle:    z.string().trim().max(300).optional(),
  description: z.string().trim().optional(),
  image:       imageSchema,
  mobileImage: imageSchema.optional(),
  ctaLabel:    z.string().trim().optional(),
  ctaLink:     z.string().trim().optional(),
  type:        z.enum(Object.values(BANNER_TYPE)).optional(),
  target:      z.enum(Object.values(BANNER_TARGET)).optional(),
  order:       z.coerce.number().int().min(0).optional(),
  isActive:    z.boolean().optional(),
  validFrom:   z.coerce.date().optional(),
  validUntil:  z.coerce.date().optional(),
});

const updateBannerSchema = createBannerSchema
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const reorderSchema = z.object({
  items: z.array(z.object({
    id:    zv.mongoId,
    order: z.coerce.number().int().min(0),
  })).min(1, 'items must be a non-empty array'),
});

// ── Validators (exported for use in routes) ───────────────────────

const listQueryValidator   = validateQuery(listQuerySchema);
const createBannerValidator = validate(createBannerSchema);
const updateBannerValidator = validate(updateBannerSchema);
const reorderValidator      = validate(reorderSchema);

// ── Helpers ───────────────────────────────────────────────────────

// Upload a single image field from req.files
const uploadImageField = async (file, uploadedKeys) => {
  const { url, key } = await uploadObject(file, 'banners');
  uploadedKeys.push(key);
  return { url, key, mimeType: file.mimetype, sizeBytes: file.size, altText: '' };
};

// ── Handlers ──────────────────────────────────────────────────────

// GET /api/banners
// ?id=<mongoId>  → single banner
// no id          → paginated list; admin sees all, public sees isActive only
const getBanners = async (req, res, next) => {
  try {
    const adminView = !!(req.user && ['admin', 'superadmin'].includes(req.user.role));
    const { id, ...rest } = req.query;

    if (id) {
      const banner = await bannerService.getBannerById(id);
      if (!adminView && !banner.isActive) return next(AppError.notFound('Banner'));
      return API_response.OK({ res, message: MSG.BANNER_FETCHED, payload: banner });
    }

    const result = await bannerService.getBanners(rest, adminView);
    API_response.OK({ res, message: MSG.BANNERS_FETCHED, payload: result });
  } catch (err) { next(err); }
};

// POST /api/banners  (multipart/form-data)
//   fields: "image" (required), "mobileImage" (optional)
//   text:   "data"  → JSON string of the banner payload
const createBanner = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    if (!req.body.data) throw AppError.badRequest(MSG.UPLOAD_DATA_REQUIRED);

    let parsed;
    try { parsed = JSON.parse(req.body.data); }
    catch { throw AppError.badRequest(MSG.UPLOAD_DATA_INVALID); }

    // Validate before hitting S3
    const result = createBannerSchema.safeParse(parsed);
    if (!result.success) throw AppError.badRequest(result.error.issues[0]?.message || 'Validation error');
    const data = result.data;

    // Upload desktop image if provided as a file (overrides any url in data)
    if (req.files?.image?.[0]) {
      data.image = await uploadImageField(req.files.image[0], uploadedKeys);
    }
    if (!data.image) throw AppError.badRequest('Banner image is required (upload a file or provide image.url + image.key).');

    if (req.files?.mobileImage?.[0]) {
      data.mobileImage = await uploadImageField(req.files.mobileImage[0], uploadedKeys);
    }

    const banner = await bannerService.createBanner(data, req.user._id);
    API_response.CREATED({ res, message: MSG.BANNER_CREATED, payload: banner });
  } catch (err) {
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

// PATCH /api/banners/:id  (multipart/form-data)
//   fields: "image" (optional), "mobileImage" (optional)
//   text:   "data"  → JSON of fields to update (optional when only uploading a new image)
const updateBanner = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    const imageFile       = req.files?.image?.[0];
    const mobileImageFile = req.files?.mobileImage?.[0];
    const hasFiles = !!(imageFile || mobileImageFile);

    if (!req.body.data && !hasFiles) throw AppError.badRequest(MSG.UPDATE_NOTHING);

    let data = {};
    if (req.body.data) {
      let parsed;
      try { parsed = JSON.parse(req.body.data); }
      catch { throw AppError.badRequest(MSG.UPLOAD_DATA_INVALID); }

      const result = updateBannerSchema.safeParse(parsed);
      if (!result.success) throw AppError.badRequest(result.error.issues[0]?.message || 'Validation error');
      data = result.data;
    }

    // Fetch existing banner to know which old S3 keys to remove
    const existing = await bannerService.getBannerById(req.params.id);
    const removedKeys = [];

    if (imageFile) {
      if (existing.image?.key) removedKeys.push(existing.image.key);
      data.image = await uploadImageField(imageFile, uploadedKeys);
    }
    if (mobileImageFile) {
      if (existing.mobileImage?.key) removedKeys.push(existing.mobileImage.key);
      data.mobileImage = await uploadImageField(mobileImageFile, uploadedKeys);
    }

    const banner = await bannerService.updateBanner(req.params.id, data, req.user._id);

    // Safe to remove old S3 objects only after DB succeeds
    if (removedKeys.length) await deleteObjects(removedKeys);

    API_response.OK({ res, message: MSG.BANNER_UPDATED, payload: banner });
  } catch (err) {
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

// DELETE /api/banners/:id  (soft delete)
const deleteBanner = async (req, res, next) => {
  try {
    await bannerService.deleteBanner(req.params.id);
    API_response.OK({ res, message: MSG.BANNER_DELETED, payload: null });
  } catch (err) { next(err); }
};

// PATCH /api/banners/reorder
// body: { items: [{ id, order }] }
const reorderBanners = async (req, res, next) => {
  try {
    await bannerService.reorderBanners(req.body.items);
    API_response.OK({ res, message: MSG.BANNER_REORDERED, payload: null });
  } catch (err) { next(err); }
};

module.exports = {
  listQueryValidator,
  createBannerValidator,
  updateBannerValidator,
  reorderValidator,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
