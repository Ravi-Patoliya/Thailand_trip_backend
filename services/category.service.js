'use strict';
const categoryRepository  = require('../repositories/category.repository');
const serviceRepository   = require('../repositories/service.repository');
const notificationService = require('./notification.service');
const AppError            = require('../utils/AppError');
const { deleteObject }    = require('../helpers/s3.helper');
const MSG                 = require('../constants/message');
const escapeRegex         = require('../utils/escapeRegex');

class CategoryService {
  async getActiveCategories(query = {}) {
    const filter = { isActive: true, isDeleted: false };
    if (query.parent === 'null') {
      filter.parent = null;
    } else if (query.parent) {
      const parentCat = await categoryRepository.findById(query.parent);
      if (!parentCat) throw AppError.notFound('Parent Category');
      filter.parent = query.parent;
    }
    if (query.search) filter.name = { $regex: new RegExp(escapeRegex(query.search), 'i') };
    return categoryRepository.findAllWithChildren(filter);
  }

  async getAllCategories(query = {}) {
    const page  = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.search)  filter.name = { $regex: new RegExp(escapeRegex(query.search), 'i') };
    if (query.parent === 'null') {
      filter.parent = null;
    } else if (query.parent) {
      const parentCat = await categoryRepository.findById(query.parent);
      if (!parentCat) throw AppError.notFound('Parent Category');
      filter.parent = query.parent;
    }

    const [data, total] = await Promise.all([
      categoryRepository.findAllPaginated({ filter, skip, limit }),
      categoryRepository.countAll(filter),
    ]);

    return { data, page, limit, total };
  }

  async getCategoryById(id, { adminView = false } = {}) {
    const cat = await categoryRepository.findById(id);
    if (!cat) throw AppError.notFound('Category');
    if (!adminView && !cat.isActive) throw AppError.notFound('Category');
    return cat;
  }

  async getSubCategories(parentId) {
    const parent = await categoryRepository.findById(parentId);
    if (!parent) throw AppError.notFound('Category');
    return categoryRepository.findChildren(parentId);
  }

  async getCategoryBySlug(slug) {
    const cat = await categoryRepository.findBySlug(slug);
    if (!cat || !cat.isActive) throw AppError.notFound('Category');
    return cat;
  }

  async createCategory(body, adminId) {
    const { name, description, icon, metaTitle, metaDescription, parent = null } = body;

    if (parent) {
      const parentCat = await categoryRepository.findById(parent);
      if (!parentCat) throw AppError.notFound('Parent Category');
      if (parentCat.parent) throw AppError.badRequest(MSG.CATEGORY_NO_DEEP_NEST);
    }

    const exists = await categoryRepository.existsByName(name);
    if (exists) throw AppError.conflict(`Category "${name}" already exists.`);

    // If a soft-deleted category already holds this name, revive it (and refresh
    // its data) instead of creating a duplicate tombstone.
    const deleted = await categoryRepository.findDeletedByName(name);
    if (deleted) {
      return categoryRepository.updateById(deleted._id, {
        name,
        description,
        icon,
        metaTitle,
        metaDescription,
        parent,
        isActive:  true,
        isDeleted: false,
        updatedBy: adminId,
      });
    }

    const maxOrder = await categoryRepository.getMaxOrder(parent);

    return categoryRepository.create({
      name,
      description,
      icon,
      metaTitle,
      metaDescription,
      parent,
      order:    maxOrder + 1,
      isActive: true,
    });
  }

  async updateCategory(id, body, adminId) {
    const cat = await categoryRepository.findById(id);
    if (!cat) throw AppError.notFound('Category');

    if (body.name && body.name !== cat.name) {
      const exists = await categoryRepository.existsByName(body.name, id);
      if (exists) throw AppError.conflict(`Category "${body.name}" already exists.`);
    }

    const allowed = ['name', 'description', 'icon', 'isActive', 'order', 'metaTitle', 'metaDescription'];
    const update  = {};
    allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
    update.updatedBy = adminId;

    return categoryRepository.updateById(id, update);
  }

  async updateCoverImage(id, { url, key }) {
    const cat = await categoryRepository.findById(id);
    if (!cat) throw AppError.notFound('Category');

    if (cat.coverImage?.key) await deleteObject(cat.coverImage.key);

    return categoryRepository.updateById(id, { coverImage: { url, key } });
  }

  async deleteCategory(id) {
    const cat = await categoryRepository.findById(id);
    if (!cat) throw AppError.notFound('Category');
    return categoryRepository.softDeleteById(id);
  }

  async reorderCategories(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest(MSG.CATEGORY_REORDER_EMPTY);
    }
    const orders   = items.map(i => i.order);
    const hasDupes = new Set(orders).size !== orders.length;
    if (hasDupes) throw AppError.badRequest(MSG.CATEGORY_REORDER_DUPES);

    return categoryRepository.bulkReorder(items);
  }
}

module.exports = new CategoryService();
