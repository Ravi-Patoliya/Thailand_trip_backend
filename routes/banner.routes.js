'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/banner.controller');
const { optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { validateParams, zod: zv }    = require('../middlewares/validate.middleware');
const { z }                          = require('zod');
const multer                         = require('multer');
const AppError                       = require('../utils/AppError');

// ── Upload middleware (image + optional mobileImage, max 5 MB each) ──
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;

const bannerUpload = multer({
  storage:    multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      return cb(AppError.badRequest(`Only image files are allowed (JPEG, PNG, WebP). Got: ${file.mimetype}`));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_SIZE, files: 2 },
}).fields([
  { name: 'image',       maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
]);

const uploadBanner = (req, res, next) => {
  bannerUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')  return next(AppError.badRequest('File size exceeds 5 MB.'));
    if (err.code === 'LIMIT_FILE_COUNT') return next(AppError.badRequest('Too many files uploaded at once.'));
    return next(err);
  });
};

const idParam = validateParams(z.object({ id: zv.mongoId }));

// ── Public ────────────────────────────────────────────────────────
// GET /api/banners          — returns active banners (or all for admins)
router.get('/', optionalAuth, ctrl.listQueryValidator, ctrl.getBanners);

// ── Admin ─────────────────────────────────────────────────────────
// POST   /api/banners             — create
// PATCH  /api/banners/reorder     — bulk reorder (must be before /:id)
// PATCH  /api/banners/:id         — update
// DELETE /api/banners/:id         — soft delete

router.post  ('/',         ...requireAdmin, uploadBanner, ctrl.createBanner);
router.patch ('/reorder',  ...requireAdmin, ctrl.reorderValidator, ctrl.reorderBanners);
router.patch ('/:id',      ...requireAdmin, uploadBanner, idParam, ctrl.updateBanner);
router.delete('/:id',      ...requireAdmin, idParam, ctrl.deleteBanner);

module.exports = router;
