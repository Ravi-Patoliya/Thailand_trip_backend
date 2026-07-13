'use strict';
const inquiryRepository  = require('../repositories/inquiry.repository');
const serviceRepository  = require('../repositories/service.repository');
const couponRepository   = require('../repositories/coupon.repository');
const userRepository     = require('../repositories/user.repository');
const notificationService = require('./notification.service');
const { uploadObject }   = require('../helpers/s3.helper');
const { sendInquiryAdminAlert } = require('../helpers/email.helper');
const AppError           = require('../utils/AppError');
const MSG                = require('../constants/message');
const { paginate }       = require('../utils/paginate');
const escapeRegex        = require('../utils/escapeRegex');
const logger             = require('../helpers/logger.helper');

// One-way conveyor belt: new → contacted → confirmed → payment_pending → payment_received → in_progress → completed
// Cancelled is the emergency exit reachable from any state except in_progress and completed.
const STATUS_TRANSITIONS = {
  new:              ['contacted', 'cancelled'],
  contacted:        ['confirmed', 'cancelled'],
  confirmed:        ['payment_pending', 'cancelled'],
  payment_pending:  ['payment_received', 'cancelled'],
  payment_received: ['in_progress', 'cancelled'],
  in_progress:      ['completed'],
  completed:        [],
  cancelled:        [],
};

class InquiryService {
  async createInquiry(body, user) {
    const {
      services: serviceItems, travelDate, returnDate, adults, children, specialRequests, couponCode,
      contactName, contactMobile, contactWhatsapp, contactEmail,
    } = body;

    const serviceIds  = serviceItems.map(i => i.serviceId);
    const dbServices  = await serviceRepository.findByIdsLean(serviceIds);
    const servicesById = new Map(dbServices.map(svc => [svc._id.toString(), svc]));

    const resolvedItems = [];
    let subtotal = 0;

    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const svc  = servicesById.get(item.serviceId.toString());

      if (!svc)          throw AppError.badRequest(`Service "${item.serviceId}" not found.`);
      if (!svc.isActive) throw AppError.badRequest(`Service "${svc.title}" is currently unavailable.`);
      if (svc.availability === 'unavailable') {
        throw AppError.badRequest(`Service "${svc.title}" is not available for booking.`);
      }

      const tier     = svc.pricing.find(p => p._id.toString() === item.priceTierId) || svc.pricing.find(p => p.isBase) || svc.pricing[0];
      if (!tier) throw AppError.badRequest(`No valid pricing found for "${svc.title}".`);

      const qty     = item.quantity || 1;
      const lineSub = tier.amount * qty;
      subtotal     += lineSub;

      resolvedItems.push({
        service:             svc._id,
        serviceTitle:        svc.title,
        priceSnapshot:       tier.amount,
        strikePriceSnapshot: tier.strikePrice || null,
        priceTierLabel:      tier.label,
        quantity:            qty,
        subtotal:            lineSub,
      });
    }

    let discountAmount = 0;
    let couponId       = null;

    if (couponCode) {
      // Single fetch: findByCode returns the Mongoose doc so we can call calculateDiscount()
      // without a second round-trip (validateForUser would fetch it again internally).
      const coupon = await couponRepository.findByCode(couponCode);
      const result = coupon
        ? await couponRepository.validateForUser(couponCode, user._id, subtotal)
        : { valid: false, reason: 'Coupon code not found' };
      if (!result.valid) throw AppError.badRequest(result.reason);

      discountAmount = result.discount;
      couponId       = coupon._id;
    }

    const totalAmount = subtotal - discountAmount;

    const inquiry = await inquiryRepository.create({
      user:            user._id,
      contactSnapshot: {
        name:     contactName     || user.name,
        mobile:   contactMobile   || user.mobile   || null,
        whatsapp: contactWhatsapp || user.mobile   || null,
        email:    contactEmail    || user.email     || null,
      },
      services:        resolvedItems,
      travelDate:      new Date(travelDate),
      returnDate:      returnDate ? new Date(returnDate) : null,
      adults,
      children:        children || 0,
      specialRequests,
      subtotal,
      discountAmount,
      totalAmount,
      coupon:          couponId,
      couponCode:      couponCode || null,
      statusHistory:   [{ status: 'new', note: 'Inquiry submitted by user' }],
    });

    if (couponId) {
      await couponRepository.recordUsage(couponId);
    }

    notificationService.notifyInquirySubmitted(inquiry).catch(err =>
      logger.error(`Failed to notify inquiry submitted (inquiry ${inquiry._id}): ${err?.message || err}`)
    );

    userRepository.findAdminEmails()
      .then(admins => sendInquiryAdminAlert(admins, inquiry))
      .catch(err =>
        logger.error(`Failed to send inquiry admin alert (inquiry ${inquiry._id}): ${err?.message || err}`)
      );

    return inquiry;
  }

  async getUserInquiries(userId, query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 10 });
    const [data, total] = await Promise.all([
      inquiryRepository.findByUser(userId, { skip, limit, sort },query),
      inquiryRepository.countByUser(userId,query),
    ]);
    return { data, page, limit, total };
  }

  async getUserInquiryById(inquiryId, userId) {
    const inquiry = await inquiryRepository.findById(inquiryId);
    if (!inquiry) throw AppError.notFound('Inquiry');
    if (inquiry.user._id.toString() !== userId.toString()) {
      throw AppError.forbidden(MSG.FORBIDDEN_INQUIRY_VIEW);
    }
    return inquiry;
  }

  async listAdminInquiries(query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 20 });
    const filter = {};

    if (query.status)        filter.status        = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.assignedTo) {
      const admin = await userRepository.findById(query.assignedTo);
      if (!admin || !['admin', 'superadmin'].includes(admin.role_id?.name)) {
        throw AppError.badRequest(MSG.INQUIRY_INVALID_ASSIGN);
      }
      filter.assignedTo = query.assignedTo;
    }
    if (query.id) {
      filter._id = query.id;
    }
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or  = [
        { referenceNumber:           regex },
        { 'contactSnapshot.name':    regex },
        { 'contactSnapshot.mobile':  regex },
        { 'contactSnapshot.email':   regex },
        { 'services.serviceTitle':   regex },
      ];
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to)   filter.createdAt.$lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      inquiryRepository.findAll({ filter, skip, limit, sort }),
      inquiryRepository.countAll(filter),
    ]);
    return { data, page, limit, total };
  }

  async getInquiryById(id) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');
    return inquiry;
  }

  async updateStatus(id, newStatus, note, adminId) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');

    const allowed = STATUS_TRANSITIONS[inquiry.status];
    if (!allowed.includes(newStatus)) {
      throw AppError.badRequest(
        `Cannot move inquiry from "${inquiry.status}" to "${newStatus}". ` +
        `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`
      );
    }

    const now = new Date();

    // in_progress is only valid once the travel date has actually arrived
    if (newStatus === 'in_progress') {
      if (!inquiry.travelDate || inquiry.travelDate > now) {
        throw AppError.badRequest(MSG.INQUIRY_IN_PROGRESS_EARLY);
      }
    }

    // completed is only valid once the return date has passed
    if (newStatus === 'completed') {
      const endDate = inquiry.returnDate || inquiry.travelDate;
      if (!endDate || endDate > now) {
        throw AppError.badRequest(MSG.INQUIRY_COMPLETED_EARLY);
      }
    }

    const updated = await inquiryRepository.updateStatus(id, newStatus, note, adminId);
    notificationService.notifyInquiryStatusUpdate(updated).catch(() => {});
    return updated;
  }

  async cancelByUser(id, userId, reason) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');

    if (inquiry.user._id.toString() !== userId.toString()) {
      throw AppError.forbidden(MSG.INQUIRY_CANCEL_FORBIDDEN);
    }
    if (inquiry.status === 'cancelled') {
      throw AppError.badRequest(MSG.INQUIRY_ALREADY_CANCELLED);
    }
    if (['in_progress', 'completed'].includes(inquiry.status)) {
      throw AppError.badRequest(MSG.INQUIRY_CANCEL_NOT_ALLOWED);
    }

    const updated = await inquiryRepository.updateStatus(id, 'cancelled', `User cancelled: ${reason}`, userId);
    notificationService.notifyInquiryStatusUpdate(updated).catch(() => {});
    return updated;
  }

  async addNote(id, text, adminId) {
    // Existence check only — no need for the full 7-populate detail fetch here.
    const exists = await inquiryRepository.existsById(id);
    if (!exists) throw AppError.notFound('Inquiry');
    return inquiryRepository.addNote(id, text, adminId);
  }

  async logPayment(id, paymentData, adminId, screenshotFile = null) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');

    // Payment can only be logged once we're actively collecting it (payment_pending or payment_received)
    // or while the trip is running (in_progress — partial payments / balance collection)
    const paymentAllowedStatuses = ['payment_pending', 'payment_received', 'in_progress'];
    if (inquiry.status === 'cancelled') {
      throw AppError.badRequest(MSG.INQUIRY_PAYMENT_CANCELLED);
    }
    if (!paymentAllowedStatuses.includes(inquiry.status)) {
      throw AppError.badRequest(MSG.INQUIRY_PAYMENT_UNCONFIRMED);
    }

    const newTotal = inquiry.totalPaid + paymentData.amount;
    if (newTotal > inquiry.totalAmount * 1.1) {
      throw AppError.badRequest(
        `Payment amount ₹${paymentData.amount} would exceed total ₹${inquiry.totalAmount}. ` +
        'Check the amount and try again.'
      );
    }

    let screenshotUrl = null;
    let screenshotKey = null;
    if (screenshotFile) {
      const uploaded = await uploadObject(screenshotFile, 'payments');
      screenshotUrl  = uploaded.url;
      screenshotKey  = uploaded.key;
    }

    const updated = await inquiryRepository.logPayment(id, {
      ...paymentData,
      screenshotUrl,
      screenshotKey,
      recordedBy: adminId,
    });
    notificationService.notifyPaymentReceived(updated, paymentData.amount).catch(() => {});
    return updated;
  }

  async recordCall(id, adminId, note) {
    // Lean fetch: we only need status to decide whether to auto-advance it.
    const inquiry = await inquiryRepository.findStatusById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');
    if (inquiry.status === 'new') {
      await inquiryRepository.updateStatus(id, 'contacted', 'Admin called user', adminId);
    }
    return inquiryRepository.recordCallAttempt(id, adminId, note);
  }

  async assignInquiry(id, adminId) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');

    const admin = await userRepository.findById(adminId);
    if (!admin || !['admin', 'superadmin'].includes(admin.role_id?.name)) {
      throw AppError.badRequest(MSG.INQUIRY_INVALID_ASSIGN);
    }

    return inquiryRepository.assignTo(id, adminId);
  }

  async getDashboardStats(from, to) {
    const dateFrom = from ? new Date(from) : new Date(new Date().setDate(1));
    const dateTo   = to   ? new Date(to)   : new Date();

    const [statusCounts, revenue] = await Promise.all([
      inquiryRepository.getStatusCounts(),
      inquiryRepository.getRevenueSummary(dateFrom, dateTo),
    ]);
    return { statusCounts, revenue: revenue[0] || { totalRevenue: 0, totalInquiries: 0, avgOrderValue: 0 } };
  }
}

module.exports = new InquiryService();
