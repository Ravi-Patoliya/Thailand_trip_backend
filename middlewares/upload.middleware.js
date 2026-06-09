'use strict';
const multer   = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime'];

const MAX_IMAGE_SIZE = 5  * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const multerFilter = (allowed) => (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_MIME.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_MIME.includes(file.mimetype);

  if (allowed === 'image' && !isImage) {
    return cb(AppError.badRequest(`Only image files are allowed (JPEG, PNG, WebP). Got: ${file.mimetype}`));
  }
  if (allowed === 'video' && !isVideo) {
    return cb(AppError.badRequest(`Only video files are allowed (MP4, MOV). Got: ${file.mimetype}`));
  }
  if (allowed === 'any' && !isImage && !isVideo) {
    return cb(AppError.badRequest(`File type "${file.mimetype}" is not allowed.`));
  }

  cb(null, true);
};

const memoryStorage = multer.memoryStorage();

const uploadImage = multer({
  storage:    memoryStorage,
  fileFilter: multerFilter('image'),
  limits:     { fileSize: MAX_IMAGE_SIZE, files: 1 },
}).single('image');

const uploadImages = multer({
  storage:    memoryStorage,
  fileFilter: multerFilter('image'),
  limits:     { fileSize: MAX_IMAGE_SIZE, files: 5 },
}).array('images', 5);

const uploadVideo = multer({
  storage:    memoryStorage,
  fileFilter: multerFilter('video'),
  limits:     { fileSize: MAX_VIDEO_SIZE, files: 1 },
}).single('video');

const uploadMedia = multer({
  storage:    memoryStorage,
  fileFilter: multerFilter('any'),
  limits:     { fileSize: MAX_VIDEO_SIZE, files: 6 },
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'video',  maxCount: 1 },
]);

const wrapMulter = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')       return next(AppError.badRequest('File size exceeds the allowed limit.'));
    if (err.code === 'LIMIT_FILE_COUNT')      return next(AppError.badRequest('Too many files uploaded at once.'));
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return next(AppError.badRequest(`Unexpected file field: "${err.field}".`));
    return next(err);
  });
};

module.exports = {
  uploadImage:  wrapMulter(uploadImage),
  uploadImages: wrapMulter(uploadImages),
  uploadVideo:  wrapMulter(uploadVideo),
  uploadMedia:  wrapMulter(uploadMedia),
};
