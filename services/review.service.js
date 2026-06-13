'use strict';
const reviewRepository   = require('../repositories/review.repository');
const inquiryRepository  = require('../repositories/inquiry.repository');
const serviceRepository  = require('../repositories/service.repository');
const notificationService = require('./notification.service');
const AppError           = require('../utils/AppError');
const MSG                = require('../constants/message');
const { deleteObject, deleteObjects } = require('../helpers/s3.helper');
const { paginate }       = require('../utils/paginate');

class ReviewService {
  async getServiceReviews(serviceId, query) {
    const service = await serviceRepository.findById(serviceId);
    if (!service) throw AppError.notFound('Service');

    const { page, limit, skip, sort } = paginate(query, { limit: 10 });

    const [data, total, distribution] = await Promise.all([
      reviewRepository.findByService({ serviceId, skip, limit, sort }),
      reviewRepository.countByService(serviceId),
      reviewRepository.getRatingDistribution(serviceId),
    ]);

    return { data, page, limit, total, distribution };
  }

  async getReviewById(id, { adminView = false } = {}) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');
    if (!adminView && review.status !== 'approved') throw AppError.notFound('Review');
    return review;
  }

  async createReview(body, user) {
    const { serviceId, inquiryId, rating, title, bodyText, travelType, images = [], video = null } = body;

    const service = await serviceRepository.findById(serviceId);
    if (!service) throw AppError.notFound('Service');

    const inquiry = await inquiryRepository.findById(inquiryId);
    if (!inquiry) throw AppError.notFound('Inquiry');
    if (inquiry.user._id.toString() !== user._id.toString()) {
      throw AppError.forbidden(MSG.FORBIDDEN_INQUIRY_OWN);
    }
    if (inquiry.status !== 'completed') {
      throw AppError.badRequest(MSG.FORBIDDEN_REVIEW_OWN);
    }

    const bookedService = inquiry.services.find(s => s.service._id.toString() === serviceId);
    if (!bookedService) {
      throw AppError.badRequest(MSG.REVIEW_SERVICE_NOT_BOOKED);
    }

    const alreadyReviewed = await reviewRepository.existsForInquiryService(user._id, inquiryId, serviceId);
    if (alreadyReviewed) {
      throw AppError.conflict(MSG.REVIEW_ALREADY_EXISTS);
    }

    if (images.length > 5) throw AppError.badRequest(MSG.REVIEW_MAX_IMAGES);

    return reviewRepository.create({
      service:    serviceId,
      user:       user._id,
      inquiry:    inquiryId,
      rating,
      title,
      body:       bodyText,
      travelType,
      travelDate: inquiry.travelDate,
      images,
      video,
    });
  }

  async listAdminReviews(query) {
    const { page, limit, skip, sort } = paginate(query, { limit: 20 });
    const filter = {};
    if (query.status)    filter.status    = query.status;
    if (query.serviceId) filter.service   = query.serviceId;
    if (query.rating)    filter.rating    = Number(query.rating);
    if (query.isFlagged) filter.isFlagged = query.isFlagged === 'true';
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or  = [
        { title: regex },
        { body:  regex },
      ];
    }

    const [data, total] = await Promise.all([
      reviewRepository.findAllAdmin({ filter, skip, limit, sort }),
      reviewRepository.countAllAdmin(filter),
    ]);
    return { data, page, limit, total };
  }

  async moderateReview(id, status, adminId, rejectionReason) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');
    if (review.status !== 'pending') {
      throw AppError.badRequest(`Review is already "${review.status}". ${MSG.REVIEW_NOT_PENDING}`);
    }
    if (status === 'rejected' && !rejectionReason) {
      throw AppError.badRequest(MSG.REVIEW_REJECT_REASON);
    }

    const updated = await reviewRepository.moderate(id, status, adminId, rejectionReason);

    // update rating cache incrementally — no aggregation query
    if (status === 'approved') {
      serviceRepository.addRating(review.service._id, review.rating).catch(() => {});
    } else if (status === 'rejected' && review.status === 'approved') {
      // was previously approved, now rejected — remove it from the cache
      serviceRepository.removeRating(review.service._id, review.rating).catch(() => {});
    }

    const serviceName = review.service?.title || 'your booked service';
    if (status === 'approved') {
      notificationService.notifyReviewApproved(review, serviceName).catch(() => {});
    } else {
      notificationService.notifyReviewRejected(review, serviceName, rejectionReason).catch(() => {});
    }

    return updated;
  }

  async addAdminReply(id, text, adminId) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');
    if (review.status !== 'approved') {
      throw AppError.badRequest(MSG.REVIEW_REPLY_APPROVED_ONLY);
    }

    const updated = await reviewRepository.addAdminReply(id, text, adminId);

    const serviceName = review.service?.title || 'your booked service';
    notificationService.notifyAdminReviewReply(review, serviceName).catch(() => {});

    return updated;
  }

  async markHelpful(id, userId) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');
    if (review.user._id.toString() === userId.toString()) {
      throw AppError.badRequest(MSG.REVIEW_OWN_HELPFUL);
    }
    if (review.helpfulVotes.some(v => v.toString() === userId.toString())) {
      throw AppError.conflict(MSG.REVIEW_ALREADY_HELPFUL);
    }
    return reviewRepository.addHelpfulVote(id, userId);
  }

  async deleteReview(id) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');

    // remove from rating cache only if it was counted
    if (review.status === 'approved') {
      serviceRepository.removeRating(review.service._id, review.rating).catch(() => {});
    }

    const imageKeys = (review.images || []).map(i => i.key).filter(Boolean);
    const videoKey  = review.video?.key;
    await deleteObjects([...imageKeys, ...(videoKey ? [videoKey] : [])]);
    return reviewRepository.deleteById(id);
  }

  async getPendingCount() {
    return reviewRepository.getPendingCount();
  }
}

module.exports = new ReviewService();
