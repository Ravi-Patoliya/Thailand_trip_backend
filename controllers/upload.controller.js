'use strict';
const { uploadObject, deleteObject } = require('../helpers/s3.helper');
const { API_response }               = require('../helpers');
const AppError                       = require('../utils/AppError');
const MSG                            = require('../constants/message');

// folder map — keeps S3 keys organised by entity
const FOLDER = {
  service:  'services',
  category: 'categories',
  review:   'reviews',
  avatar:   'avatars',
};

// POST /api/upload/image?folder=service|category|review|avatar
// body: multipart/form-data, field: "image"
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest(MSG.UPLOAD_NO_IMAGE);

    const folder = FOLDER[req.query.folder] || 'general';
    const { url, key } = await uploadObject(req.file, folder);

    API_response.OK({ res, message: MSG.UPLOAD_IMAGE_SUCCESS, payload: { url, key, mimeType: req.file.mimetype, sizeBytes: req.file.size } });
  } catch (err) { next(err); }
};

// POST /api/upload/images?folder=service|category|review
// body: multipart/form-data, field: "images" (up to 5)
const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) throw AppError.badRequest(MSG.UPLOAD_NO_IMAGES);

    const folder  = FOLDER[req.query.folder] || 'general';
    const uploads = await Promise.all(
      req.files.map(f => uploadObject(f, folder).then(({ url, key }) => ({ url, key, mimeType: f.mimetype, sizeBytes: f.size })))
    );

    API_response.OK({ res, message: `${uploads.length} image(s) uploaded successfully.`, payload: uploads }); // dynamic count kept inline
  } catch (err) { next(err); }
};

// POST /api/upload/media?folder=review
// body: multipart/form-data, fields: "images" (up to 5) + "video" (1)
const uploadMedia = async (req, res, next) => {
  try {
    const folder      = FOLDER[req.query.folder] || 'general';
    const imageFiles  = req.files?.images || [];
    const videoFiles  = req.files?.video  || [];

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      throw AppError.badRequest(MSG.UPLOAD_NO_MEDIA);
    }

    const [images, videos] = await Promise.all([
      Promise.all(imageFiles.map(f => uploadObject(f, folder).then(({ url, key }) => ({ url, key, mimeType: f.mimetype, sizeBytes: f.size })))),
      Promise.all(videoFiles.map(f => uploadObject(f, folder).then(({ url, key }) => ({ url, key, mimeType: f.mimetype, sizeBytes: f.size })))),
    ]);

    API_response.OK({
      res,
      message: MSG.UPLOAD_MEDIA_SUCCESS,
      payload: { images, video: videos[0] || null },
    });
  } catch (err) { next(err); }
};

// DELETE /api/upload
// body: { key: "services/uuid.jpg" }
const deleteFile = async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key) throw AppError.badRequest(MSG.UPLOAD_KEY_REQUIRED);
    await deleteObject(key);
    API_response.OK({ res, message: MSG.UPLOAD_DELETED, payload: null });
  } catch (err) { next(err); }
};

module.exports = { uploadImage, uploadImages, uploadMedia, deleteFile };
