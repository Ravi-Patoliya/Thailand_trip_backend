'use strict';
const { Category } = require('../models');

class CategoryRepository {
  async findAll({ filter = {}, sort = { order: 1 } } = {}) {
    return Category.find(filter).sort(sort).lean();
  }

  async findAllPaginated({ filter = {}, skip = 0, limit = 20 }) {
    return Category.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(filter = {}) {
    return Category.countDocuments(filter);
  }

  async findById(id) {
    return Category.findOne({ _id: id, isDeleted: false });
  }

  async findBySlug(slug) {
    return Category.findOne({ slug, isDeleted: false });
  }

  async existsByName(name, excludeId = null) {
    const filter = { name: new RegExp(`^${name}$`, 'i'), isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId };
    return Category.exists(filter);
  }

  // Find a soft-deleted category by exact (case-insensitive) name, so a create
  // with the same name can revive it instead of leaving a duplicate tombstone.
  async findDeletedByName(name) {
    return Category.findOne({ name: new RegExp(`^${name}$`, 'i'), isDeleted: true });
  }

  async getMaxOrder(parent = null) {
    const last = await Category.findOne({ parent, isDeleted: false }).sort({ order: -1 }).select('order').lean();
    return last?.order ?? 0;
  }

  // Returns top-level categories with their subcategories nested under `children`
  async findAllWithChildren(filter = {}) {
    const all = await Category.find(filter).sort({ order: 1 }).lean();
    const map  = {};
    all.forEach(c => { map[c._id] = { ...c, children: [] }; });

    const roots = [];
    all.forEach(c => {
      if (c.parent) {
        if (map[c.parent]) map[c.parent].children.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });
    return roots;
  }

  async findChildren(parentId) {
    return Category.find({ parent: parentId, isDeleted: false }).sort({ order: 1 }).lean();
  }

  async countChildren(parentId) {
    return Category.countDocuments({ parent: parentId, isDeleted: false });
  }

  async create(data) {
    return Category.create(data);
  }

  async updateById(id, update) {
    return Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Category.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
  }

  async bulkReorder(items) {
    const ops = items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    }));
    return Category.bulkWrite(ops);
  }
}

module.exports = new CategoryRepository();
