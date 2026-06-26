'use strict';
const { Banner } = require('../models');

class BannerRepository {
  async findAll({ filter = {}, skip = 0, limit = 50, sort = { order: 1, createdAt: -1 } } = {}) {
    return Banner.find(filter).sort(sort).skip(skip).limit(limit).lean();
  }

  async countAll(filter = {}) {
    return Banner.countDocuments(filter);
  }

  async findById(id) {
    return Banner.findOne({ _id: id, isDeleted: false });
  }

  async getMaxOrder(target) {
    const doc = await Banner.findOne({ target, isDeleted: false }).sort({ order: -1 }).select('order').lean();
    return doc ? doc.order : 0;
  }

  async create(data) {
    return Banner.create(data);
  }

  async updateById(id, update) {
    return Banner.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Banner.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } }, { new: true });
  }

  // Reorder: update each banner's `order` field in bulk
  async bulkUpdateOrder(items) {
    const ops = items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    }));
    return Banner.bulkWrite(ops);
  }
}

module.exports = new BannerRepository();
