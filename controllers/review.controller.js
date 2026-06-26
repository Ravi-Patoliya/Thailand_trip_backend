'use strict';
const { z }            = require('zod');
const reviewService    = require('../services/review.service');
const { validate, validateParams, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { uploadObject, deleteObjects } = require('../helpers/s3.helper');
const AppError         = require('../utils/AppError');
const { REVIEW_STATUS, TRAVEL_TYPE, ROLE } = require('../constants/enums');
const MSG              = require('../constants/message');

const idParamValidator = validateParams(z.object({ id: zv.mongoId }));

const createReviewSchema = z.object({
  serviceId:  zv.mongoId.refine(v => !!v, { message: 'serviceId is required.' }),
  inquiryId:  zv.mongoId.refine(v => !!v, { message: 'inquiryId is required.' }),
  rating:     z.coerce.number({ required_error: 'rating is required.' }).int().min(1, 'Rating must be at least 1.').max(5, 'Rating cannot exceed 5.'),
  title:      z.string().trim().max(150).optional(),
  bodyText:   z.string().trim().max(2000).optional(),
  travelType: z.enum(Object.values(TRAVEL_TYPE)).optional(),
});

const moderateSchema = z.object({
  status:          z.enum([REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED]),
  rejectionReason: z.string().trim().max(300).optional(),
});

const replySchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

// Shared query schema — admin-only fields ignored for public/user callers
const listQuerySchema = z.object({
  id:        zv.mongoId.optional(),                                              // fetch single
  serviceId: zv.mongoId.optional(),                                              // filter by service
  page:      zv.positiveInt.optional(),
  limit:     zv.positiveInt.optional(),
  sort:      z.enum(['newest', 'rating_high', 'rating_low', 'helpful']).optional(),
  // admin-only filters
  status:    z.enum(Object.values(REVIEW_STATUS)).optional(),
  rating:    z.coerce.number().int().min(1).max(5).optional(),
  isFlagged: z.enum(['true', 'false']).optional(),
  search:    z.string().trim().max(100).optional(),
});

const moderateValidator  = validate(moderateSchema);
const replyValidator     = validate(replySchema);
const listQueryValidator = validateQuery(listQuerySchema);

const isAdmin = (req) => req.user && [ROLE.ADMIN, ROLE.SUPERADMIN].includes(req.user.role);

// GET /api/reviews
// ?id=<mongoId>              → single review  (admin: any | public: approved only)
// ?serviceId=<mongoId>       → reviews for a service (public: approved | admin: all statuses)
// no serviceId               → admin: full list with filters
const getReviews = async (req, res, next) => {
  try {
    const admin      = isAdmin(req);
    const { id, ...rest } = req.query;

    if (id) {
      const review = await reviewService.getReviewById(id, { adminView: admin });
      return API_response.OK({ res, message: MSG.REVIEW_FETCHED, payload: review });
    }

    if (admin) {
      const { data, page, limit, total } = await reviewService.listAdminReviews(rest);
      return API_response.OK({ res, message: MSG.REVIEWS_FETCHED, payload: { data, page, limit, total } });
    }

    // public — serviceId required for listing
    if (!rest.serviceId) {
      return API_response.OK({ res, message: MSG.REVIEWS_FETCHED, payload: { data: [], page: 1, limit: 20, total: 0 } });
    }

    const result = await reviewService.getServiceReviews(rest.serviceId, rest);
    API_response.OK({ res, message: MSG.REVIEWS_FETCHED, payload: result });
  } catch (err) { next(err); }
};

// POST /api/reviews  — multipart/form-data
//   text field "data" → JSON string of review payload
//   file fields: "images" (up to 5), "video" (1) — both optional
// Files are uploaded to S3 first; if validation or DB write fails, they are rolled back.
const createReview = async (req, res, next) => {
  const uploadedKeys = [];
  try {
    if (!req.body.data) throw AppError.badRequest(MSG.UPLOAD_DATA_REQUIRED);

    let parsed;
    try {
      parsed = JSON.parse(req.body.data);
    } catch {
      throw AppError.badRequest(MSG.UPLOAD_DATA_INVALID);
    }

    const result = createReviewSchema.safeParse(parsed);
    if (!result.success) {
      throw AppError.badRequest(result.error.issues[0]?.message || 'Validation error');
    }
    const data = result.data;

    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video  || [];

    const [images, videos] = await Promise.all([
      Promise.all(imageFiles.map(f =>
        uploadObject(f, 'reviews').then(({ url, key }) => {
          uploadedKeys.push(key);
          return { url, key, mimeType: f.mimetype, sizeBytes: f.size };
        })
      )),
      Promise.all(videoFiles.map(f =>
        uploadObject(f, 'reviews').then(({ url, key }) => {
          uploadedKeys.push(key);
          return { url, key, mimeType: f.mimetype, sizeBytes: f.size };
        })
      )),
    ]);

    data.images = images;
    data.video  = videos[0] || null;

    const review = await reviewService.createReview(data, req.user);
    API_response.CREATED({ res, message: MSG.REVIEW_CREATED, payload: review });
  } catch (err) {
    if (uploadedKeys.length) await deleteObjects(uploadedKeys);
    next(err);
  }
};

// PATCH /api/reviews/:id/moderate  — admin only
const moderateReview = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const review = await reviewService.moderateReview(req.params.id, status, req.user._id, rejectionReason);
    API_response.OK({ res, message: `Review ${status}.`, payload: review }); // dynamic status kept inline
  } catch (err) { next(err); }
};

// POST /api/reviews/:id/reply  — admin only
const addAdminReply = async (req, res, next) => {
  try {
    const review = await reviewService.addAdminReply(req.params.id, req.body.text, req.user._id);
    API_response.OK({ res, message: MSG.REVIEW_REPLY_ADDED, payload: review });
  } catch (err) { next(err); }
};

// POST /api/reviews/:id/helpful  — authenticated user
const markHelpful = async (req, res, next) => {
  try {
    const review = await reviewService.markHelpful(req.params.id, req.user._id);
    API_response.OK({ res, message: MSG.REVIEW_HELPFUL, payload: review });
  } catch (err) { next(err); }
};

// DELETE /api/reviews/:id  — admin only (soft delete)
const deleteReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id);
    API_response.OK({ res, message: MSG.REVIEW_DELETED, payload: null });
  } catch (err) { next(err); }
};

// GET /api/reviews/pending-count  — admin only
const getPendingCount = async (req, res, next) => {
  try {
    const count = await reviewService.getPendingCount();
    API_response.OK({ res, message: MSG.REVIEW_PENDING_COUNT, payload: { pending: count } });
  } catch (err) { next(err); }
};

module.exports = {
  idParamValidator,
  listQueryValidator,
  moderateValidator,
  replyValidator,
  getReviews,
  createReview,
  moderateReview,
  addAdminReply,
  markHelpful,
  deleteReview,
  getPendingCount,
};
