'use strict';
const { Inquiry } = require('../models');
const escapeRegex  = require('../utils/escapeRegex');

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

  async findByUser(userId, { skip = 0, limit = 10, sort = { createdAt: -1 } } = {}, query) {
    const filter = this._buildUserFilter(userId, query);
    return Inquiry.find(filter)
      .populate('services.service', 'title slug images')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByUser(userId, query) {
    return Inquiry.countDocuments(this._buildUserFilter(userId, query));
  }

  /** Shared filter builder for findByUser / countByUser — keeps the two in sync. */
  _buildUserFilter(userId, query = {}) {
    const filter = { user: userId };
    if (query.status)        filter.status        = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.id)            filter._id           = query.id;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { referenceNumber:          re },
        { 'contactSnapshot.name':   re },
        { 'contactSnapshot.mobile': re },
        { 'contactSnapshot.email':  re },
        { 'services.serviceTitle':  re },
      ];
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to)   filter.createdAt.$lte = new Date(query.to);
    }
    return filter;
  }

  /** Cheap existence check — no populate, no document allocation. */
  async existsById(id) {
    return Inquiry.exists({ _id: id });
  }

  /** Returns only the status field for decision logic — avoids the full 7-populate fetch. */
  async findStatusById(id) {
    return Inquiry.findById(id).select('status').lean();
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
    // pre('save') never fires on findByIdAndUpdate, so totalPaid and paymentStatus
    // must be recomputed atomically here via an aggregation pipeline update.
    const PAID    = 'paid';
    const PARTIAL = 'partial';
    const UNPAID  = 'unpaid';
    return Inquiry.findByIdAndUpdate(
      id,
      [
        { $set: { paymentLog: { $concatArrays: ['$paymentLog', [paymentData]] } } },
        {
          $set: {
            totalPaid: { $sum: '$paymentLog.amount' },
          },
        },
        {
          $set: {
            paymentStatus: {
              $switch: {
                branches: [
                  { case: { $lte: ['$totalPaid', 0] },                        then: UNPAID  },
                  { case: { $lt:  ['$totalPaid', '$totalAmount'] },            then: PARTIAL },
                ],
                default: PAID,
              },
            },
          },
        },
      ],
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
