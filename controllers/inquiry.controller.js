'use strict';
const { z }            = require('zod');
const inquiryService   = require('../services/inquiry.service');
const { validate, validateParams, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { INQUIRY_STATUS, PAYMENT_STATUS, PAYMENT_METHOD, ROLE } = require('../constants/enums');
const MSG              = require('../constants/message');

const idParamValidator = validateParams(z.object({ id: zv.mongoId }));

const serviceItemSchema = z.object({
  serviceId:   zv.mongoId,
  priceTierId: zv.mongoId.optional(),
  quantity:    zv.positiveInt.default(1),
});

const createInquirySchema = z.object({
  services:        z.array(serviceItemSchema).min(1, 'Select at least one service.').max(10),
  travelDate:      z.coerce.date().refine(d => d > new Date(), { message: 'Travel date must be in the future.' }),
  returnDate:      z.coerce.date().optional(),
  adults:          z.coerce.number().int().min(1).max(50),
  children:        z.coerce.number().int().min(0).max(20).default(0),
  specialRequests: z.string().trim().max(1000).optional(),
  couponCode:      z.string().trim().toUpperCase().max(20).optional(),
  // Optional contact overrides — if not provided, auto-filled from user profile
  contactName:     z.string().trim().min(1).max(100).optional(),
  contactMobile:   zv.mobile.optional(),
  contactWhatsapp: zv.mobile.optional(),
  contactEmail:    zv.email.optional(),
}).refine(d => !d.returnDate || d.returnDate > d.travelDate, {
  message: 'Return date must be after travel date.',
  path:    ['returnDate'],
});

// Shared query schema — admin-only fields ignored for user role
const listQuerySchema = z.object({
  id:            zv.mongoId.optional(),                                                           // fetch single
  page:          zv.positiveInt.optional(),
  limit:         zv.positiveInt.optional(),
  // admin-only filters
  status:        z.enum(Object.values(INQUIRY_STATUS)).optional(),
  paymentStatus: z.enum(Object.values(PAYMENT_STATUS)).optional(),
  assignedTo:    zv.mongoId.optional(),
  search:        z.string().trim().max(100).optional(),
  from:          z.string().optional(),
  to:            z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(Object.values(INQUIRY_STATUS).filter(s => s !== INQUIRY_STATUS.NEW)),
  note:   z.string().trim().max(500).optional(),
});

const addNoteSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

const logPaymentSchema = z.object({
  amount:    z.coerce.number().positive(),
  method:    z.enum(Object.values(PAYMENT_METHOD)),
  reference: z.string().trim().max(100).optional(),
  note:      z.string().trim().max(300).optional(),
});

const cancelInquirySchema = z.object({
  reason: z.string().trim().min(5, 'Please provide a reason (min 5 characters).').max(500),
});

const recordCallSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const assignSchema = z.object({
  adminId: zv.mongoId,
});

const statsQuerySchema = z.object({
  from: z.string().optional(),
  to:   z.string().optional(),
});

const createInquiryValidator = validate(createInquirySchema);
const listQueryValidator      = validateQuery(listQuerySchema);
const updateStatusValidator   = validate(updateStatusSchema);
const addNoteValidator        = validate(addNoteSchema);
const logPaymentValidator     = validate(logPaymentSchema);
const cancelInquiryValidator  = validate(cancelInquirySchema);
const recordCallValidator     = validate(recordCallSchema);
const assignValidator         = validate(assignSchema);
const statsQueryValidator     = validateQuery(statsQuerySchema);

const isAdmin = (req) => req.user && [ROLE.ADMIN, ROLE.SUPERADMIN].includes(req.user.role);

// POST /api/inquiries  — authenticated user submits an inquiry
const createInquiry = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.createInquiry(req.body, req.user);
    API_response.CREATED({ res, message: MSG.INQUIRY_CREATED, payload: inquiry });
  } catch (err) { next(err); }
};

// GET /api/inquiries
// ?id=<mongoId>  → single inquiry  (admin: any | user: own only)
// no id          → list            (admin: all with filters | user: own only)
const getInquiries = async (req, res, next) => {
  try {
    const admin      = isAdmin(req);
    const { ...rest } = req.query;

    // if (id) {
    //   const inquiry = admin
    //     ? await inquiryService.getInquiryById(id)
    //     : await inquiryService.getUserInquiryById(id, req.user._id,rest);
    //   return API_response.OK({ res, message: MSG.INQUIRY_FETCHED, payload: inquiry });
    // }

    if (admin) {
      const { data, page, limit, total } = await inquiryService.listAdminInquiries(rest);
      return API_response.OK({ res, message: MSG.INQUIRIES_FETCHED, payload: { data, page, limit, total } });
    }

    const { data, page, limit, total } = await inquiryService.getUserInquiries(req.user._id, rest);
    API_response.OK({ res, message: MSG.INQUIRIES_FETCHED, payload: { data, page, limit, total } });
  } catch (err) { next(err); }
};

// PATCH /api/inquiries/:id/status  — admin only
const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const inquiry = await inquiryService.updateStatus(req.params.id, status, note, req.user._id);
    API_response.OK({ res, message: `Inquiry status updated to "${status}".`, payload: inquiry }); // dynamic status kept inline
  } catch (err) { next(err); }
};

// POST /api/inquiries/:id/notes  — admin only
const addNote = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.addNote(req.params.id, req.body.text, req.user._id);
    API_response.OK({ res, message: MSG.INQUIRY_NOTE_ADDED, payload: inquiry });
  } catch (err) { next(err); }
};

// POST /api/inquiries/:id/payment  — admin only
const logPayment = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.logPayment(req.params.id, req.body, req.user._id, req.file || null);
    API_response.OK({ res, message: MSG.INQUIRY_PAYMENT_LOGGED, payload: inquiry });
  } catch (err) { next(err); }
};

// PATCH /api/inquiries/:id/cancel  — authenticated user only
const cancelInquiry = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.cancelByUser(req.params.id, req.user._id, req.body.reason);
    API_response.OK({ res, message: MSG.INQUIRY_CANCELLED, payload: inquiry });
  } catch (err) { next(err); }
};

// POST /api/inquiries/:id/call  — admin only
const recordCall = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.recordCall(req.params.id, req.user._id, req.body.note);
    API_response.OK({ res, message: MSG.INQUIRY_CALL_RECORDED, payload: inquiry });
  } catch (err) { next(err); }
};

// PATCH /api/inquiries/:id/assign  — admin only
const assignInquiry = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.assignInquiry(req.params.id, req.body.adminId);
    API_response.OK({ res, message: MSG.INQUIRY_ASSIGNED, payload: inquiry });
  } catch (err) { next(err); }
};

// GET /api/inquiries/stats  — admin only
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await inquiryService.getDashboardStats(req.query.from, req.query.to);
    API_response.OK({ res, message: MSG.STATS_FETCHED, payload: stats });
  } catch (err) { next(err); }
};

module.exports = {
  idParamValidator,
  createInquiryValidator,
  listQueryValidator,
  updateStatusValidator,
  addNoteValidator,
  logPaymentValidator,
  cancelInquiryValidator,
  recordCallValidator,
  assignValidator,
  statsQueryValidator,
  createInquiry,
  getInquiries,
  cancelInquiry,
  updateStatus,
  addNote,
  logPayment,
  recordCall,
  assignInquiry,
  getDashboardStats,
};
