'use strict';
const serviceRepository  = require('../repositories/service.repository');
const categoryRepository = require('../repositories/category.repository');
const AppError           = require('../utils/AppError');
const MSG                = require('../constants/message');

class ServiceService {
  async getServices(query, adminView = false) {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};

    if (!adminView) {
      filter.isActive = true;
    } else {
      if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
      if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === 'true';
    }

    if (query.category) {
      const cat = await categoryRepository.findById(query.category);
      if (!cat) throw AppError.notFound('Category');
      filter.category = query.category;
    }
    if (query.city)         filter['location.city']  = query.city;
    if (query.availability) filter.availability      = query.availability;
    if (query.minPrice)     filter.basePrice         = { ...filter.basePrice, $gte: Number(query.minPrice) };
    if (query.maxPrice)     filter.basePrice         = { ...filter.basePrice, $lte: Number(query.maxPrice) };
    if (query.tags)         filter.tags              = { $in: query.tags.split(',').map(t => t.trim().toLowerCase()) };
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or  = [
        { title:            regex },
        { shortDescription: regex },
        { tags:             regex },
        { 'location.city':  regex },
      ];
    }

    let sort = { order: 1, createdAt: -1 };
    if (query.sort === 'price_asc')    sort = { basePrice: 1 };
    if (query.sort === 'price_desc')   sort = { basePrice: -1 };
    if (query.sort === 'rating')       sort = { 'rating.average': -1 };
    if (query.sort === 'newest')       sort = { createdAt: -1 };

    const [data, total] = await Promise.all([
      serviceRepository.findAll({ filter, skip, limit, sort }),
      serviceRepository.countAll(filter),
    ]);

    return { data, page, limit, total };
  }

  async getServiceById(id, adminView = false) {
    const service = await serviceRepository.findById(id);
    if (!service) throw AppError.notFound('Service');
    if (!adminView && !service.isActive) throw AppError.notFound('Service');
    return service;
  }

  async createService(body, adminId) {
    const {
      title, category, description, shortDescription,
      pricing = [], duration, maxGroupSize, availability,
      inclusions, exclusions, highlights, location,
      isActive, isFeatured, metaTitle, metaDescription, tags,
    } = body;

    const cat = await categoryRepository.findById(category);
    if (!cat) throw AppError.notFound('Category');

    const exists = await serviceRepository.existsByTitle(title);
    if (exists) throw AppError.conflict(`Service "${title}" already exists.`);

    const maxOrder = await serviceRepository.getMaxOrder(category);

    return serviceRepository.create({
      title, category, description, shortDescription,
      pricing, duration, maxGroupSize,
      availability: availability || 'available',
      inclusions:   inclusions  || [],
      exclusions:   exclusions  || [],
      highlights:   highlights  || [],
      location:     location    || {},
      isActive:     isActive !== undefined ? isActive : true,
      isFeatured:   isFeatured || false,
      metaTitle, metaDescription,
      tags:      tags || [],
      order:     maxOrder + 1,
      createdBy: adminId,
    });
  }

  async updateService(id, body, adminId) {
    const service = await serviceRepository.findById(id);
    if (!service) throw AppError.notFound('Service');

    if (body.title && body.title !== service.title) {
      const exists = await serviceRepository.existsByTitle(body.title, id);
      if (exists) throw AppError.conflict(`Service "${body.title}" already exists.`);
    }

    if (body.category && body.category !== service.category.toString()) {
      const cat = await categoryRepository.findById(body.category);
      if (!cat) throw AppError.notFound('Category');
    }

    const allowed = [
      'title', 'category', 'description', 'shortDescription',
      'pricing', 'duration', 'maxGroupSize', 'availability',
      'inclusions', 'exclusions', 'highlights', 'location',
      'isActive', 'isFeatured', 'metaTitle', 'metaDescription', 'tags',
    ];
    const update = {};
    allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
    update.updatedBy = adminId;

    return serviceRepository.updateById(id, update);
  }

  async deleteService(id) {
    const service = await serviceRepository.findById(id);
    if (!service) throw AppError.notFound('Service');
    if (!service.isActive) throw AppError.badRequest(MSG.SERVICE_ALREADY_INACTIVE);
    return serviceRepository.updateById(id, { isActive: false });
  }
}

module.exports = new ServiceService();
