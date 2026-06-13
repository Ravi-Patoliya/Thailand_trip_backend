'use strict';
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Role name is required'],
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    label: {
      type:  String,
      required: [true, 'Role label is required'],
      trim:  true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
