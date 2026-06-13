'use strict';
const { Role } = require('../models');

class RoleRepository {
  findAll()            { return Role.find().sort({ createdAt: 1 }).lean(); }
  findById(id)         { return Role.findById(id).lean(); }
  findByName(name)     { return Role.findOne({ name: name.toLowerCase() }).lean(); }
  create(data)         { return Role.create(data); }
  updateById(id, data) {
    return Role.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  }
  setActive(id, isActive) {
    return Role.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).lean();
  }
}

module.exports = new RoleRepository();
