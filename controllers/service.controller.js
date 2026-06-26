'use strict';
const { z }            = require('zod');
const serviceService   = require('../services/service.service');
const { validate, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { uploadObject, deleteObjects } = require('../helpers/s3.helper');
const AppError         = require('../utils/AppError');
const { SERVICE_AVAILABILITY, DURATION_UNIT, ROLE, THAILAND_CITY } = require('../constants/enums');
const MSG              = require('../constants/message');

const priceTierSchema = z.object({
  label:       z.string().trim().min(1),
  amount:      z.coerce.number().min(0),
  strikePrice: z.coerce.number().min(0).nullable().optional(),
  currency:    z.string().trim().default('INR'),
  isBase:      z.boolean().default(false),
});

// Media asset already uploaded to S3 — client sends back the url/key, not the file.
const mediaSchema = z.object({
  url:       z.string().trim().url(),
  key:       z.string().trim().min(1),
  isPrimary: z.boolean().default(false),
  altText:   z.string().trim().default(''),
  mimeType:  z.string().trim().optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  id:           zv.mongoId.optional(),
  page:         zv.positiveInt.optional(),
  limit:        zv.positiveInt.optional(),
  category:     zv.mongoId.optional(),
  city:         z.enum(Object.values(THAILAND_CITY)).optional(),
  search:       z.string().trim().max(100).optional(),
  availability: z.enum(Object.values(SERVICE_AVAILABILITY)).optional(),
  minPrice:     z.coerce.number().min(0).optional(),
  maxPrice:     z.coerce.number().min(0).optional(),
  tags:         z.string().trim().optional(),
  sort:         z.enum(['price_asc', 'price_desc', 'rating', 'newest']).optional(),
  // admin-only
  isActive:     z.enum(['true', 'false']).optional(),
  isFeatured:   z.enum(['true', 'false']).optional(),
});

const createServiceSchema = z.object({
  title:            z.string().trim().min(1).max(150),
  category:         zv.mongoId,
  description:      z.string().trim().min(1),
  shortDescription: z.string().trim().max(300).optional(),
  pricing: z.array(priceTierSchema).min(1, 'At least one pricing tier is required.'),
  images:   z.array(mediaSchema).optional(),
  videos:   z.array(mediaSchema).optional(),
  duration: z.object({
    value: z.coerce.number().positive().optional(),
    unit:  z.enum(Object.values(DURATION_UNIT)).optional(),
  }).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  availability: z.enum(Object.values(SERVICE_AVAILABILITY)).optional(),
  inclusions:   z.array(z.string().trim()).optional(),
  exclusions:   z.array(z.string().trim()).optional(),
  highlights:   z.array(z.string().trim()).optional(),
  location: z.object({
    city:   z.enum(Object.values(THAILAND_CITY)).optional(),
    region: z.string().trim().optional(),
  }).optional(),
  isActive:        z.boolean().optional(),
  isFeatured:      z.boolean().optional(),
  metaTitle:       z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  tags:            z.array(z.string().trim().toLowerCase()).optional(),
  metadata:        z.record(z.string(), z.unknown()).optional(),
});

const updateServiceSchema = createServiceSchema
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const listQueryValidator   = validateQuery(listQuerySchema);
const createServiceValidator = validate(createServiceSchema);
const updateServiceValidator = validate(updateServiceSchema);

const isAdmin = (req) => req.user && [ROLE.ADMIN, ROLE.SUPERADMIN].includes(req.user.role);

// GET /api/services
// ?id=<mongoId>  → single service
// no id          → paginated list
// admin extras   : isActive, isFeatured filters
const getServices = async (req, res, next) => {
  try {
    const admin      = isAdmin(req);
    const { id, ...rest } = req.query;

    if (id) {
      const service = await serviceService.getServiceById(id, admin);
      return API_response.OK({ res, message: MSG.SERVICE_FETCHED, payload: service });
    }

    const { data, page, limit, total } = await serviceService.getServices(rest, admin);
    API_response.OK({ res, message: MSG.SERVICES_FETCHED, payload: { data, page, limit, total } });
  } catch (err) { next(err); }
};

// POST /api/services  (multipart/form-data)
//   fields : "images" (up to 5), "video" (1)
//   text   : "data"  → JSON string of the service payload (pricing, location, etc.)
// Files are uploaded to S3 first; if validation or DB write fails afterwards,
// the freshly-uploaded objects are deleted so nothing is orphaned.
const createService = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    if (!req.body.data) throw AppError.badRequest(MSG.UPLOAD_DATA_REQUIRED);

    let parsed;
    try {
      parsed = JSON.parse(req.body.data);
    } catch {
      throw AppError.badRequest(MSG.UPLOAD_DATA_INVALID);
    }

    // Validate the JSON payload up front — before touching S3 — so a bad body
    // never causes an upload we'd have to roll back.
    const result = createServiceSchema.safeParse(parsed);
    if (!result.success) {
      throw AppError.badRequest(result.error.issues[0]?.message || 'Validation error');
    }
    const data = result.data;

    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video  || [];

    const [uploadedImages, uploadedVideos] = await Promise.all([
      Promise.all(imageFiles.map((f, i) =>
        uploadObject(f, 'services').then(({ url, key }) => {
          uploadedKeys.push(key);
          return { url, key, mimeType: f.mimetype, sizeBytes: f.size, isPrimary: i === 0 };
        })
      )),
      Promise.all(videoFiles.map(f =>
        uploadObject(f, 'services').then(({ url, key }) => {
          uploadedKeys.push(key);
          return { url, key, mimeType: f.mimetype, sizeBytes: f.size };
        })
      )),
    ]);

    if (uploadedImages.length) data.images = uploadedImages;
    if (uploadedVideos.length) data.videos = uploadedVideos;

    const service = await serviceService.createService(data, req.user._id);
    API_response.CREATED({ res, message: MSG.SERVICE_CREATED, payload: service });
  } catch (err) {
    // Roll back any S3 objects uploaded during this failed request.
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

// Merge an existing media array with newly-uploaded files for one update request.
//   kept      : the {url,key,...} objects the client wants to keep (from data),
//               or undefined if the client didn't touch this media field
//   existing  : the media array currently stored on the service
//   uploaded  : freshly-uploaded {url,key,...} objects for new files
// Returns { final, removedKeys }:
//   - data field omitted & no new files → final=null (don't update this field)
//   - data field omitted but new files  → append uploaded to existing, remove nothing
//   - data field present                → final = kept + uploaded; remove existing keys
//                                          that are no longer kept
const mergeMedia = (kept, existing = [], uploaded = []) => {
  if (kept === undefined) {
    if (uploaded.length === 0) return { final: null, removedKeys: [] };
    return { final: [...existing, ...uploaded], removedKeys: [] };
  }
  const final    = [...kept, ...uploaded];
  const keepSet  = new Set(final.map(m => m.key));
  const removedKeys = existing
    .map(m => m.key)
    .filter(key => key && !keepSet.has(key));
  return { final, removedKeys };
};

// PATCH /api/services/:id  (multipart/form-data)
//   fields : "images" (up to 5), "video" (1)   — optional (the NEW files to add)
//   text   : "data"  → JSON of fields to update — optional
//            data.images / data.videos = the EXISTING media to KEEP.
//            New files are appended; any stored media not in the keep-list is
//            deleted from S3. Omit data.images to leave existing images as-is.
// Old S3 objects are deleted only after the DB write succeeds. On failure the
// freshly-uploaded objects are rolled back and stored media is left untouched.
const updateService = async (req, res, next) => {
  const uploadedKeys = [];   // new files this request — deleted on failure
  try {
    // data is optional on update (admin may only be adding/removing images).
    let parsed = {};
    if (req.body.data) {
      try {
        parsed = JSON.parse(req.body.data);
      } catch {
        throw AppError.badRequest(MSG.UPLOAD_DATA_INVALID);
      }
    }

    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video  || [];
    const hasFiles   = imageFiles.length > 0 || videoFiles.length > 0;

    if (!req.body.data && !hasFiles) {
      throw AppError.badRequest(MSG.UPDATE_NOTHING);
    }

    // Validate any provided fields. Allow an empty object when only files are sent.
    const data = {};
    if (req.body.data) {
      const result = updateServiceSchema.safeParse(parsed);
      if (!result.success) {
        throw AppError.badRequest(result.error.issues[0]?.message || 'Validation error');
      }
      Object.assign(data, result.data);
    }

    // Fetch existing service first so we know which old keys to delete later.
    const existing = await serviceService.getServiceById(req.params.id, true);

    // Upload new files (objects collected for both the merge and rollback).
    const uploadedImages = await Promise.all(imageFiles.map(f =>
      uploadObject(f, 'services').then(({ url, key }) => {
        uploadedKeys.push(key);
        return { url, key, mimeType: f.mimetype, sizeBytes: f.size };
      })
    ));
    const uploadedVideos = await Promise.all(videoFiles.map(f =>
      uploadObject(f, 'services').then(({ url, key }) => {
        uploadedKeys.push(key);
        return { url, key, mimeType: f.mimetype, sizeBytes: f.size };
      })
    ));

    // Merge keep-lists (from data) with the new uploads; figure out what to delete.
    const img = mergeMedia(data.images, existing.images, uploadedImages);
    const vid = mergeMedia(data.videos, existing.videos, uploadedVideos);

    if (img.final !== null) {
      // Guarantee exactly one primary image.
      if (img.final.length && !img.final.some(m => m.isPrimary)) img.final[0].isPrimary = true;
      data.images = img.final;
    } else {
      delete data.images;
    }
    if (vid.final !== null) data.videos = vid.final;
    else delete data.videos;

    const removedKeys = [...img.removedKeys, ...vid.removedKeys];

    const service = await serviceService.updateService(req.params.id, data, req.user._id);

    // DB write succeeded — now safe to remove the de-listed media from S3.
    if (removedKeys.length) await deleteObjects(removedKeys);

    API_response.OK({ res, message: MSG.SERVICE_UPDATED, payload: service });
  } catch (err) {
    // Roll back only the files uploaded during this failed request.
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    await serviceService.deleteService(req.params.id);
    API_response.OK({ res, message: MSG.SERVICE_DELETED, payload: null });
  } catch (err) { next(err); }
};

module.exports = {
  listQueryValidator,
  createServiceValidator,
  updateServiceValidator,
  getServices,
  createService,
  updateService,
  deleteService,
};
