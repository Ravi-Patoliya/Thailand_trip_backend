'use strict';
const bannerRepository = require('../repositories/banner.repository');
const AppError         = require('../utils/AppError');
const MSG              = require('../constants/message');

class BannerService {
  async getBanners(query, adminView = false) {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, parseInt(query.limit) || 50);
    const skip  = (page - 1) * limit;

    const filter = { isDeleted: false };

    if (!adminView) {
      filter.isActive = true;
    } else {
      if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    }

    if (query.target) filter.target = query.target;
    if (query.type)   filter.type   = query.type;

    const sort = { order: 1, createdAt: -1 };

    const [data, total] = await Promise.all([
      bannerRepository.findAll({ filter, skip, limit, sort }),
      bannerRepository.countAll(filter),
    ]);

    return { data, page, limit, total };
  }

  async getBannerById(id) {
    const banner = await bannerRepository.findById(id);
    if (!banner) throw AppError.notFound('Banner');
    return banner;
  }

  async createBanner(body, adminId) {
    const maxOrder = await bannerRepository.getMaxOrder(body.target || 'home');
    return bannerRepository.create({
      ...body,
      order:     body.order !== undefined ? body.order : maxOrder + 1,
      createdBy: adminId,
    });
  }

  async updateBanner(id, body, adminId) {
    const banner = await bannerRepository.findById(id);
    if (!banner) throw AppError.notFound('Banner');

    if (body.validFrom && body.validUntil && new Date(body.validFrom) >= new Date(body.validUntil)) {
      throw AppError.badRequest(MSG.BANNER_INVALID_DATES);
    }

    const allowed = [
      'title', 'subtitle', 'description', 'image', 'mobileImage',
      'ctaLabel', 'ctaLink', 'type', 'target', 'order',
      'isActive', 'validFrom', 'validUntil',
    ];
    const update = {};
    allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });
    update.updatedBy = adminId;

    return bannerRepository.updateById(id, update);
  }

  async deleteBanner(id) {
    const banner = await bannerRepository.findById(id);
    if (!banner) throw AppError.notFound('Banner');
    return bannerRepository.softDeleteById(id);
  }

  async reorderBanners(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest(MSG.BANNER_REORDER_EMPTY);
    }
    const orders = items.map(i => i.order);
    if (new Set(orders).size !== orders.length) {
      throw AppError.badRequest(MSG.BANNER_REORDER_DUPES);
    }
    await bannerRepository.bulkUpdateOrder(items);
  }
}

module.exports = new BannerService();
