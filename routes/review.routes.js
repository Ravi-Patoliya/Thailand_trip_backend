'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/review.controller');
const { optionalAuth, requireUser, requireAdmin } = require('../middlewares/auth.middleware');

// GET  /api/reviews                — public: by serviceId | admin: full list with filters (?id= for single)
// POST /api/reviews                — authenticated user submits review
router.get ('/',                  optionalAuth,   ctrl.listQueryValidator,  ctrl.getReviews);
router.post('/',                  ...requireUser, ctrl.createReviewValidator, ctrl.createReview);

// User action
router.post('/:id/helpful',       ...requireUser, ctrl.idParamValidator, ctrl.markHelpful);

// Admin actions
router.get   ('/pending-count',   ...requireAdmin, ctrl.getPendingCount);
router.patch ('/:id/moderate',    ...requireAdmin, ctrl.idParamValidator, ctrl.moderateValidator, ctrl.moderateReview);
router.post  ('/:id/reply',       ...requireAdmin, ctrl.idParamValidator, ctrl.replyValidator,    ctrl.addAdminReply);
router.delete('/:id',             ...requireAdmin, ctrl.idParamValidator, ctrl.deleteReview);

module.exports = router;
