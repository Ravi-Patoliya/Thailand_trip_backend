'use strict';
const { z }            = require('zod');
const roleService      = require('../services/role.service');
const { validate, validateParams, zod: zv } = require('../middlewares/validate.middleware');
const { API_response } = require('../helpers');

const idParam       = z.object({ id: zv.mongoId });
const createSchema  = z.object({
  name:  z.string().trim().min(2).max(50),
  label: z.string().trim().min(2).max(50),
});
const updateSchema  = createSchema.partial()
  .refine(o => Object.keys(o).length > 0, { message: 'At least one field is required.' });
const activeSchema  = z.object({ isActive: z.boolean() });

const idValidator     = validateParams(idParam);
const createValidator = validate(createSchema);
const updateValidator = validate(updateSchema);
const activeValidator = validate(activeSchema);

const getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getRoles();
    API_response.OK({ res, message: 'Roles fetched.', payload: roles });
  } catch (err) { next(err); }
};

const getRoleById = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    API_response.OK({ res, message: 'Role fetched.', payload: role });
  } catch (err) { next(err); }
};

const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole(req.body);
    API_response.CREATED({ res, message: 'Role created.', payload: role });
  } catch (err) { next(err); }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    API_response.OK({ res, message: 'Role updated.', payload: role });
  } catch (err) { next(err); }
};

const setRoleActive = async (req, res, next) => {
  try {
    const role = await roleService.setRoleActive(req.params.id, req.body.isActive);
    const message = req.body.isActive ? 'Role activated.' : 'Role deactivated.';
    API_response.OK({ res, message, payload: role });
  } catch (err) { next(err); }
};

module.exports = {
  idValidator, createValidator, updateValidator, activeValidator,
  getRoles, getRoleById, createRole, updateRole, setRoleActive,
};
