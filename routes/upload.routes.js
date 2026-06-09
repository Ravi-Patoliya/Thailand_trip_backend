'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/upload.controller');
const { requireAdmin }                       = require('../middlewares/auth.middleware');
const { uploadImage, uploadImages, uploadMedia } = require('../middlewares/upload.middleware');

// All upload routes require admin
router.post  ('/image',  ...requireAdmin, uploadImage,  ctrl.uploadImage);
router.post  ('/images', ...requireAdmin, uploadImages, ctrl.uploadImages);
router.post  ('/media',  ...requireAdmin, uploadMedia,  ctrl.uploadMedia);
router.delete('/',       ...requireAdmin, ctrl.deleteFile);

module.exports = router;
