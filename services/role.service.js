'use strict';
const roleRepository = require('../repositories/role.repository');
const AppError       = require('../utils/AppError');

const DEFAULT_ROLES = [
  { name: 'user',       label: 'User' },
  { name: 'admin',      label: 'Admin' },
  { name: 'superadmin', label: 'Superadmin' },
];

class RoleService {
  async seedDefaults() {
    for (const r of DEFAULT_ROLES) {
      const exists = await roleRepository.findByName(r.name);
      if (!exists) await roleRepository.create(r);
    }
  }

  async getRoles() {
    return roleRepository.findAll();
  }

  async getRoleById(id) {
    const role = await roleRepository.findById(id);
    if (!role) throw AppError.notFound('Role');
    return role;
  }

  async createRole(body) {
    const exists = await roleRepository.findByName(body.name);
    if (exists) throw AppError.conflict(`Role "${body.name}" already exists.`);
    return roleRepository.create({ name: body.name.toLowerCase(), label: body.label });
  }

  async updateRole(id, body) {
    const role = await roleRepository.findById(id);
    if (!role) throw AppError.notFound('Role');
    if (DEFAULT_ROLES.map(r => r.name).includes(role.name)) {
      throw AppError.forbidden('Default roles cannot be modified.');
    }
    if (body.name) {
      const conflict = await roleRepository.findByName(body.name);
      if (conflict && conflict._id.toString() !== id) {
        throw AppError.conflict(`Role "${body.name}" already exists.`);
      }
    }
    return roleRepository.updateById(id, {
      ...(body.name  && { name: body.name.toLowerCase() }),
      ...(body.label && { label: body.label }),
    });
  }

  async setRoleActive(id, isActive) {
    const role = await roleRepository.findById(id);
    if (!role) throw AppError.notFound('Role');
    if (DEFAULT_ROLES.map(r => r.name).includes(role.name)) {
      throw AppError.forbidden('Default roles cannot be deactivated.');
    }
    return roleRepository.setActive(id, isActive);
  }

  // Used internally — resolves a role name like "user" → its _id
  async getIdByName(name) {
    const role = await roleRepository.findByName(name);
    if (!role) throw AppError.notFound(`Role "${name}"`);
    return role._id;
  }
}

module.exports = new RoleService();
