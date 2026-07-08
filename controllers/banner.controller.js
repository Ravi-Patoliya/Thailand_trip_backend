'use strict';
const { z }           = require('zod');
const bannerService   = require('../services/banner.service');
const { validate, validateQuery, validateParams, zod: zv, messageForIssue } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { uploadObject, deleteObjects } = require('../helpers/s3.helper');
const AppError         = require('../utils/AppError');
const MSG              = require('../constants/message');
const { BANNER_TYPE, BANNER_TARGET } = require('../models/Banner');

// ── Schemas ───────────────────────────────────────────────────────

const listQuerySchema = z.object({
  id:       zv.mongoId.optional(),
  page:     zv.positiveInt.optional(),
  limit:    zv.positiveInt.optional(),
  target:   z.enum(Object.values(BANNER_TARGET)).optional(),
  type:     z.enum(Object.values(BANNER_TYPE)).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

// Schema for flat multipart form fields (image/mobileImage come as uploaded files)
const createBannerSchema = z.object({
  title:       z.string({ required_error: 'title is required.' }).trim().min(1, 'title must not be empty.').max(150, 'title must be 150 characters or fewer.'),
  subtitle:    z.string().trim().max(300).optional(),
  description: z.string().trim().optional(),
  altText:     z.string().trim().optional(),
  ctaLabel:    z.string().trim().optional(),
  ctaLink:     z.string().trim().optional(),
  type:        z.enum(Object.values(BANNER_TYPE), { invalid_type_error: `type must be one of: ${Object.values(BANNER_TYPE).join(', ')}.` }).optional(),
  target:      z.enum(Object.values(BANNER_TARGET), { invalid_type_error: `target must be one of: ${Object.values(BANNER_TARGET).join(', ')}.` }).optional(),
  order:       z.coerce.number({ invalid_type_error: 'order must be a number.' }).int().min(0).optional(),
  isActive:    z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  validFrom:   z.coerce.date().optional(),
  validUntil:  z.coerce.date().optional(),
});

const updateBannerSchema = createBannerSchema.partial();

const reorderSchema = z.object({
  items: z.array(z.object({
    id:    zv.mongoId,
    order: z.coerce.number().int().min(0),
  })).min(1, 'items must be a non-empty array'),
});

// ── Validators (exported for use in routes) ───────────────────────

const listQueryValidator = validateQuery(listQuerySchema);
const reorderValidator   = validate(reorderSchema);

// ── Helpers ───────────────────────────────────────────────────────

const uploadImageField = async (file, altText, uploadedKeys) => {
  const { url, key } = await uploadObject(file, 'banners');
  uploadedKeys.push(key);
  return { url, key, mimeType: file.mimetype, sizeBytes: file.size, altText: altText || '' };
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
//   files:  image (required), mobileImage (optional)
//   fields: title, subtitle, description, altText, ctaLabel, ctaLink,
//           type, target, order, isActive, validFrom, validUntil
const createBanner = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    if (!req.files?.image?.[0]) throw AppError.badRequest('image file is required. Please upload a JPEG, PNG, or WebP image.');

    const result = createBannerSchema.safeParse(req.body);
    if (!result.success) throw AppError.badRequest(messageForIssue(result.error.issues[0]));
    const data = result.data;

    data.image = await uploadImageField(req.files.image[0], data.altText, uploadedKeys);

    if (req.files?.mobileImage?.[0]) {
      data.mobileImage = await uploadImageField(req.files.mobileImage[0], data.altText, uploadedKeys);
    }

    delete data.altText;

    const banner = await bannerService.createBanner(data, req.user._id);
    API_response.CREATED({ res, message: MSG.BANNER_CREATED, payload: banner });
  } catch (err) {
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

// PATCH /api/banners/:id  (multipart/form-data)
//   files:  image (optional), mobileImage (optional)
//   fields: any subset of the create fields
const updateBanner = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    const imageFile       = req.files?.image?.[0];
    const mobileImageFile = req.files?.mobileImage?.[0];
    const hasFiles        = !!(imageFile || mobileImageFile);
    const hasFields       = Object.keys(req.body).length > 0;

    if (!hasFiles && !hasFields) throw AppError.badRequest(MSG.UPDATE_NOTHING);

    const result = updateBannerSchema.safeParse(req.body);
    if (!result.success) throw AppError.badRequest(messageForIssue(result.error.issues[0]));
    const data = result.data;

    const existing    = await bannerService.getBannerById(req.params.id);
    const removedKeys = [];
    const altText     = data.altText;
    delete data.altText;

    if (imageFile) {
      if (existing.image?.key) removedKeys.push(existing.image.key);
      data.image = await uploadImageField(imageFile, altText, uploadedKeys);
    }
    if (mobileImageFile) {
      if (existing.mobileImage?.key) removedKeys.push(existing.mobileImage.key);
      data.mobileImage = await uploadImageField(mobileImageFile, altText, uploadedKeys);
    }

    const banner = await bannerService.updateBanner(req.params.id, data, req.user._id);

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
  reorderValidator,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
