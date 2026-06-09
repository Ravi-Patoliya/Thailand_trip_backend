'use strict';
const { Review } = require('../models');

class ReviewRepository {
  async findByService({ serviceId, skip = 0, limit = 10, sort = { createdAt: -1 } }) {
    return Review.find({ service: serviceId, status: 'approved' })
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByService(serviceId) {
    return Review.countDocuments({ service: serviceId, status: 'approved' });
  }

  async getRatingDistribution(serviceId) {
    return Review.getRatingDistribution(serviceId);
  }

  async findById(id) {
    return Review.findById(id)
      .populate('user',        'name avatar')
      .populate('service',     'title slug')
      .populate('moderatedBy', 'name');
  }

  async existsForInquiryService(userId, inquiryId, serviceId) {
    return Review.exists({ user: userId, inquiry: inquiryId, service: serviceId });
  }

  async create(data) {
    return Review.create(data);
  }

  async findAllAdmin({ filter = {}, skip = 0, limit = 20, sort = { createdAt: -1 } }) {
    return Review.find(filter)
      .populate('user',    'name mobile email')
      .populate('service', 'title slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAllAdmin(filter = {}) {
    return Review.countDocuments(filter);
  }

  async moderate(id, status, adminId, rejectionReason) {
    return Review.findByIdAndUpdate(
      id,
      { $set: { status, moderatedBy: adminId, moderatedAt: new Date(), rejectionReason: rejectionReason || null } },
      { new: true }
    );
  }

  async addAdminReply(id, text, adminId) {
    return Review.findByIdAndUpdate(
      id,
      { $set: { adminReply: { text, repliedBy: adminId, repliedAt: new Date() } } },
      { new: true }
    );
  }

  async addHelpfulVote(id, userId) {
    return Review.findByIdAndUpdate(
      id,
      { $addToSet: { helpfulVotes: userId }, $inc: { helpfulCount: 1 } },
      { new: true }
    );
  }

  async deleteById(id) {
    return Review.findByIdAndDelete(id);
  }

  async getPendingCount() {
    return Review.getPendingCount();
  }
}

module.exports = new ReviewRepository();
