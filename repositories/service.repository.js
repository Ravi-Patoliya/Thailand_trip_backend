'use strict';
const { Service } = require('../models');

class ServiceRepository {
  async findById(id) {
    return Service.findById(id).populate('category', 'name slug');
  }

  async findAll({ filter = {}, skip = 0, limit = 20, sort = { createdAt: -1 } } = {}) {
    return Service.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return Service.countDocuments(filter);
  }

  async countByCategory(categoryId) {
    return Service.countDocuments({ category: categoryId });
  }

  async existsByTitle(title, excludeId = null) {
    const filter = { title: new RegExp(`^${title}$`, 'i') };
    if (excludeId) filter._id = { $ne: excludeId };
    return Service.exists(filter);
  }

  async getMaxOrder(categoryId) {
    const last = await Service.findOne({ category: categoryId }).sort({ order: -1 }).select('order').lean();
    return last?.order ?? 0;
  }

  async create(data) {
    return Service.create(data);
  }

  async updateById(id, update) {
    return Service.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return Service.findByIdAndDelete(id);
  }

  // Incrementally add a new rating without querying all reviews
  async addRating(serviceId, newRating) {
    return Service.findByIdAndUpdate(
      serviceId,
      [
        {
          $set: {
            'rating.count':   { $add: ['$rating.count', 1] },
            'rating.average': {
              $round: [
                { $divide: [
                  { $add: [{ $multiply: ['$rating.average', '$rating.count'] }, newRating] },
                  { $add: ['$rating.count', 1] },
                ]},
                1,
              ],
            },
          },
        },
      ],
      { new: true }
    );
  }

  // Incrementally remove an old rating (review deleted or rejected)
  async removeRating(serviceId, oldRating) {
    return Service.findByIdAndUpdate(
      serviceId,
      [
        {
          $set: {
            'rating.count': { $max: [{ $subtract: ['$rating.count', 1] }, 0] },
            'rating.average': {
              $cond: {
                if:   { $lte: ['$rating.count', 1] },
                then: 0,
                else: {
                  $round: [
                    { $divide: [
                      { $subtract: [{ $multiply: ['$rating.average', '$rating.count'] }, oldRating] },
                      { $subtract: ['$rating.count', 1] },
                    ]},
                    1,
                  ],
                },
              },
            },
          },
        },
      ],
      { new: true }
    );
  }

  // Incrementally swap old rating for new rating (review edited)
  async updateRating(serviceId, oldRating, newRating) {
    return Service.findByIdAndUpdate(
      serviceId,
      [
        {
          $set: {
            'rating.average': {
              $cond: {
                if:   { $eq: ['$rating.count', 0] },
                then: 0,
                else: {
                  $round: [
                    { $divide: [
                      { $add: [
                        { $subtract: [{ $multiply: ['$rating.average', '$rating.count'] }, oldRating] },
                        newRating,
                      ]},
                      '$rating.count',
                    ]},
                    1,
                  ],
                },
              },
            },
          },
        },
      ],
      { new: true }
    );
  }
}

module.exports = new ServiceRepository();
