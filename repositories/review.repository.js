'use strict';
const { Review } = require('../models');

class ReviewRepository {
  async findByService({ serviceId, skip = 0, limit = 10, sort = { createdAt: -1 } }) {
    return Review.find({ service: serviceId, status: 'approved', isDeleted: false })
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countByService(serviceId) {
    return Review.countDocuments({ service: serviceId, status: 'approved', isDeleted: false });
  }

  async getRatingDistribution(serviceId) {
    return Review.getRatingDistribution(serviceId);
  }

  async findById(id) {
    return Review.findOne({ _id: id, isDeleted: false })
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

  async softDeleteById(id) {
    return Review.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
  }

  async getPendingCount() {
    return Review.getPendingCount();
  }
}

module.exports = new ReviewRepository();
