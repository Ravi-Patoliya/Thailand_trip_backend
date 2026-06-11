'use strict';
const { z }            = require('zod');
const serviceService   = require('../services/service.service');
const { validate, validateQuery, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');
const { SERVICE_AVAILABILITY, DURATION_UNIT, ROLE, THAILAND_CITY } = require('../constants/enums');
const MSG              = require('../constants/message');

const priceTierSchema = z.object({
  label:    z.string().trim().min(1),
  amount:   z.coerce.number().min(0),
  currency: z.string().trim().default('INR'),
  isBase:   z.boolean().default(false),
});

const listQuerySchema = z.object({
  id:           zv.mongoId.optional(),
  page:         zv.positiveInt.optional(),
  limit:        zv.positiveInt.optional(),
  category:     zv.mongoId.optional(),
  city:         z.enum(Object.values(THAILAND_CITY)).optional(),
  availability: z.enum(Object.values(SERVICE_AVAILABILITY)).optional(),
  minPrice:     z.coerce.number().min(0).optional(),
  maxPrice:     z.coerce.number().min(0).optional(),
  tags:         z.string().trim().optional(),
  sort:         z.enum(['price_asc', 'price_desc', 'rating', 'newest']).optional(),
  // admin-only
  isActive:     z.enum(['true', 'false']).optional(),
  isFeatured:   z.enum(['true', 'false']).optional(),
});

const createServiceSchema = z.object({
  title:            z.string().trim().min(1).max(150),
  category:         zv.mongoId,
  description:      z.string().trim().min(1),
  shortDescription: z.string().trim().max(300).optional(),
  pricing: z.array(priceTierSchema).min(1, 'At least one pricing tier is required.'),
  duration: z.object({
    value: z.coerce.number().positive().optional(),
    unit:  z.enum(Object.values(DURATION_UNIT)).optional(),
  }).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  availability: z.enum(Object.values(SERVICE_AVAILABILITY)).optional(),
  inclusions:   z.array(z.string().trim()).optional(),
  exclusions:   z.array(z.string().trim()).optional(),
  highlights:   z.array(z.string().trim()).optional(),
  location: z.object({
    city:   z.enum(Object.values(THAILAND_CITY)).optional(),
    region: z.string().trim().optional(),
  }).optional(),
  isActive:        z.boolean().optional(),
  isFeatured:      z.boolean().optional(),
  metaTitle:       z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  tags:            z.array(z.string().trim().toLowerCase()).optional(),
});

const updateServiceSchema = createServiceSchema
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required.' });

const listQueryValidator   = validateQuery(listQuerySchema);
const createServiceValidator = validate(createServiceSchema);
const updateServiceValidator = validate(updateServiceSchema);

const isAdmin = (req) => req.user && [ROLE.ADMIN, ROLE.SUPERADMIN].includes(req.user.role);

// GET /api/services
// ?id=<mongoId>  → single service
// no id          → paginated list
// admin extras   : isActive, isFeatured filters
const getServices = async (req, res, next) => {
  try {
    const admin      = isAdmin(req);
    const { id, ...rest } = req.query;

    if (id) {
      const service = await serviceService.getServiceById(id, admin);
      return API_response.OK({ res, message: MSG.SERVICE_FETCHED, payload: service });
    }

    const { data, page, limit, total } = await serviceService.getServices(rest, admin);
    API_response.OK({ res, message: MSG.SERVICES_FETCHED, payload: { data, page, limit, total } });
  } catch (err) { next(err); }
};

const createService = async (req, res, next) => {
  try {
    const service = await serviceService.createService(req.body, req.user._id);
    API_response.CREATED({ res, message: MSG.SERVICE_CREATED, payload: service });
  } catch (err) { next(err); }
};

const updateService = async (req, res, next) => {
  try {
    const service = await serviceService.updateService(req.params.id, req.body, req.user._id);
    API_response.OK({ res, message: MSG.SERVICE_UPDATED, payload: service });
  } catch (err) { next(err); }
};

const deleteService = async (req, res, next) => {
  try {
    await serviceService.deleteService(req.params.id);
    API_response.OK({ res, message: MSG.SERVICE_DELETED, payload: null });
  } catch (err) { next(err); }
};

module.exports = {
  listQueryValidator,
  createServiceValidator,
  updateServiceValidator,
  getServices,
  createService,
  updateService,
  deleteService,
};
