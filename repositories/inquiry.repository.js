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
      .populate('adminNotes.addedBy',      'name')
      .populate('callLog.calledBy',        'name');
  }

  async findByRef(referenceNumber) {
    return Inquiry.findOne({ referenceNumber });
  }

  async findByUser(userId, { skip = 0, limit = 10, sort = { createdAt: -1 } } = {},query) {
    return Inquiry.find({ user: userId ,  ...(query.status && { status: query.status }),
    ...(query.search && { $or: [
      { referenceNumber:           new RegExp(query.search, 'i') },
      { 'contactSnapshot.name':    new RegExp(query.search, 'i') },
      { 'contactSnapshot.mobile':  new RegExp(query.search, 'i') },
      { 'contactSnapshot.email':   new RegExp(query.search, 'i') },
      { 'services.serviceTitle':   new RegExp(query.search, 'i') },
    ] }),
      ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
      ...(query.from || query.to ? { createdAt: {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to) }),
        ...(query.id && { _id: query.id }),
        
      } } : {})})
      .populate('services.service', 'title slug images')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByUser(userId,query) {
    return Inquiry.countDocuments({ user: userId,
      ...(query.status && { status: query.status }),
      ...(query.search && { $or: [
      { referenceNumber:           new RegExp(query.search, 'i') },
      { 'contactSnapshot.name':    new RegExp(query.search, 'i') },
      { 'contactSnapshot.mobile':  new RegExp(query.search, 'i') },
      { 'contactSnapshot.email':   new RegExp(query.search, 'i') },
      { 'services.serviceTitle':   new RegExp(query.search, 'i') },
    ] }),
      ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
      ...(query.from || query.to ? { createdAt: {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to) }),
        ...(query.id && { _id: query.id }),
      } } : {}),
     });
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

  async recordCallAttempt(id, adminId, note) {
    const now = new Date();
    return Inquiry.findByIdAndUpdate(
      id,
      {
        $inc:  { callAttempts: 1 },
        $set:  { lastCalledAt: now },
        $push: { callLog: { calledBy: adminId, calledAt: now, note: note || undefined } },
      },
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
