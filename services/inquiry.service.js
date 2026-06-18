'use strict';
const inquiryRepository  = require('../repositories/inquiry.repository');
const serviceRepository  = require('../repositories/service.repository');
const couponRepository   = require('../repositories/coupon.repository');
const userRepository     = require('../repositories/user.repository');
const notificationService = require('./notification.service');
const AppError           = require('../utils/AppError');
const MSG                = require('../constants/message');
const { paginate }       = require('../utils/paginate');

const STATUS_TRANSITIONS = {
  new:             ['contacted', 'cancelled'],
  contacted:       ['confirmed', 'cancelled'],
  confirmed:       ['payment_pending', 'cancelled'],
  payment_pending: ['completed', 'cancelled'],
  completed:       [],
  cancelled:       [],
};

class InquiryService {
  async createInquiry(body, user) {
    const { services: serviceItems, travelDate, returnDate, adults, children, specialRequests, couponCode } = body;

    const serviceIds = serviceItems.map(i => i.serviceId);
    const dbServices = await Promise.all(serviceIds.map(id => serviceRepository.findById(id)));

    const resolvedItems = [];
    let subtotal = 0;

    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const svc  = dbServices[i];

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
        service:        svc._id,
        serviceTitle:   svc.title,
        priceSnapshot:  tier.amount,
        priceTierLabel: tier.label,
        quantity:       qty,
        subtotal:       lineSub,
      });
    }

    let discountAmount = 0;
    let couponId       = null;

    if (couponCode) {
      const result = await couponRepository.validateForUser(couponCode, user._id, subtotal);
      if (!result.valid) throw AppError.badRequest(result.reason);

      discountAmount = result.discount;
      const coupon   = await couponRepository.findByCode(couponCode);
      couponId = coupon._id;
    }

    const totalAmount = subtotal - discountAmount;

    const inquiry = await inquiryRepository.create({
      user:            user._id,
      contactSnapshot: { name: user.name, mobile: user.mobile || null, email: user.email },
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
      await couponRepository.recordUsage(couponId, user._id, inquiry._id, discountAmount);
    }

    notificationService.notifyInquirySubmitted(inquiry).catch(() => {});

    return inquiry;
  }

  async getUserInquiries(userId, query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 10 });
    const [data, total] = await Promise.all([
      inquiryRepository.findByUser(userId, { skip, limit, sort }),
      inquiryRepository.countByUser(userId),
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
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
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

    const updated = await inquiryRepository.updateStatus(id, newStatus, note, adminId);
    notificationService.notifyInquiryStatusUpdate(updated).catch(() => {});
    return updated;
  }

  async addNote(id, text, adminId) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');
    return inquiryRepository.addNote(id, text, adminId);
  }

  async logPayment(id, paymentData, adminId) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');

    if (['new', 'contacted'].includes(inquiry.status)) {
      throw AppError.badRequest(MSG.INQUIRY_PAYMENT_UNCONFIRMED);
    }
    if (inquiry.status === 'cancelled') {
      throw AppError.badRequest(MSG.INQUIRY_PAYMENT_CANCELLED);
    }

    const newTotal = inquiry.totalPaid + paymentData.amount;
    if (newTotal > inquiry.totalAmount * 1.1) {
      throw AppError.badRequest(
        `Payment amount ₹${paymentData.amount} would exceed total ₹${inquiry.totalAmount}. ` +
        'Check the amount and try again.'
      );
    }

    const updated = await inquiryRepository.logPayment(id, { ...paymentData, recordedBy: adminId });
    notificationService.notifyPaymentReceived(updated, paymentData.amount).catch(() => {});
    return updated;
  }

  async recordCall(id, adminId) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) throw AppError.notFound('Inquiry');
    if (inquiry.status === 'new') {
      await inquiryRepository.updateStatus(id, 'contacted', 'Admin called user', adminId);
    }
    return inquiryRepository.recordCallAttempt(id);
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
