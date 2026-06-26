'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/inquiry.controller');
const { requireUser, requireAdmin } = require('../middlewares/auth.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');

// GET  /api/inquiries       — user: own list | admin: all with filters  (?id= for single)
// POST /api/inquiries       — authenticated user submits inquiry
router.get ('/', ...requireUser, ctrl.listQueryValidator, ctrl.getInquiries);
router.post('/', ...requireUser, ctrl.createInquiryValidator, ctrl.createInquiry);

// User — cancel own inquiry
router.patch('/:id/cancel', ...requireUser, ctrl.idParamValidator, ctrl.cancelInquiryValidator, ctrl.cancelInquiry);

// Admin — action routes on a specific inquiry
router.get  ('/stats',           ...requireAdmin, ctrl.statsQueryValidator,  ctrl.getDashboardStats);
router.patch('/:id/status',      ...requireAdmin, ctrl.idParamValidator, ctrl.updateStatusValidator, ctrl.updateStatus);
router.patch('/:id/assign',      ...requireAdmin, ctrl.idParamValidator, ctrl.assignValidator,       ctrl.assignInquiry);
router.post ('/:id/notes',       ...requireAdmin, ctrl.idParamValidator, ctrl.addNoteValidator,      ctrl.addNote);
router.post ('/:id/payment',     ...requireAdmin, ctrl.idParamValidator, uploadImage, ctrl.logPaymentValidator, ctrl.logPayment);
router.post ('/:id/call',        ...requireAdmin, ctrl.idParamValidator, ctrl.recordCallValidator,  ctrl.recordCall);

module.exports = router;
