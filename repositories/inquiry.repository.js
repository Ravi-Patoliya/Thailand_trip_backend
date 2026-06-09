'use strict';
const { Inquiry } = require('../models');

class InquiryRepository {
  async findAll({ filter = {}, skip = 0, limit = 20, sort = { createdAt: -1 } }) {
    return Inquiry.find(filter)
      .populate('user',             'name mobile email')
      .populate('services.service', 'title slug')
      .populate('coupon',           'code type value')
      .populate('assignedTo',       'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return Inquiry.countDocuments(filter);
  }

  async findById(id) {
    return Inquiry.findById(id)
      .populate('user',                    'name mobile email avatar')
      .populate('services.service',        'title slug basePrice images')
      .populate('coupon',                  'code type value')
      .populate('assignedTo',              'name email mobile')
      .populate('statusHistory.changedBy', 'name')
      .populate('paymentLog.recordedBy',   'name')
      .populate('adminNotes.addedBy',      'name');
  }

  async findByRef(referenceNumber) {
    return Inquiry.findOne({ referenceNumber });
  }

  async findByUser(userId, { skip = 0, limit = 10, sort = { createdAt: -1 } } = {}) {
    return Inquiry.find({ user: userId })
      .populate('services.service', 'title slug images')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByUser(userId) {
    return Inquiry.countDocuments({ user: userId });
  }

  async create(data) {
    return Inquiry.create(data);
  }

  async updateStatus(id, status, note, changedById) {
    return Inquiry.findByIdAndUpdate(
      id,
      {
        $set:  { status },
        $push: { statusHistory: { status, note, changedBy: changedById, changedAt: new Date() } },
      },
      { new: true }
    );
  }

  async addNote(id, text, adminId) {
    return Inquiry.findByIdAndUpdate(
      id,
      { $push: { adminNotes: { text, addedBy: adminId, addedAt: new Date() } } },
      { new: true }
    );
  }

  async logPayment(id, paymentData) {
    return Inquiry.findByIdAndUpdate(
      id,
      { $push: { paymentLog: paymentData } },
      { new: true, runValidators: true }
    );
  }

  async assignTo(id, adminId) {
    return Inquiry.findByIdAndUpdate(id, { $set: { assignedTo: adminId } }, { new: true });
  }

  async recordCallAttempt(id) {
    return Inquiry.findByIdAndUpdate(
      id,
      { $inc: { callAttempts: 1 }, $set: { lastCalledAt: new Date() } },
      { new: true }
    );
  }

  async setVoucher(id, voucherUrl, voucherKey) {
    return Inquiry.findByIdAndUpdate(id, { $set: { voucherUrl, voucherKey } }, { new: true });
  }

  async getStatusCounts() {
    return Inquiry.getStatusCounts();
  }

  async getRevenueSummary(from, to) {
    return Inquiry.getRevenueSummary(from, to);
  }
}

module.exports = new InquiryRepository();
