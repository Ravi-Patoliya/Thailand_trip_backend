'use strict';
/**
 * Migration: assign role_id to existing users
 *
 * Reads each user's old `role` string ("user" / "admin" / "superadmin"),
 * looks up the matching Role document, and sets `role_id` on the user.
 *
 * Safe to run multiple times — skips users that already have role_id set.
 *
 * Usage:
 *   node scripts/migrate-role-ids.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db.config');

// Import models so mongoose registers the schemas
require('../models');
const { Role, User } = require('../models');

const DEFAULT_ROLES = [
  { name: 'user',       label: 'User' },
  { name: 'admin',      label: 'Admin' },
  { name: 'superadmin', label: 'Superadmin' },
];

const run = async () => {
  await connectDB();

  // 1. Seed default roles if missing
  console.log('\n[1/3] Seeding default roles...');
  for (const r of DEFAULT_ROLES) {
    const exists = await Role.findOne({ name: r.name });
    if (!exists) {
      await Role.create(r);
      console.log(`  Created role: ${r.name}`);
    } else {
      console.log(`  Role already exists: ${r.name}`);
    }
  }

  // 2. Build name -> _id map
  const roles = await Role.find().lean();
  const roleMap = {};
  for (const r of roles) roleMap[r.name] = r._id;

  console.log('\n[2/3] Role map:', Object.fromEntries(
    Object.entries(roleMap).map(([k, v]) => [k, v.toString()])
  ));

  // 3. Update users that still have old `role` string and no role_id
  console.log('\n[3/3] Migrating users...');

  const users = await User.find({ role_id: { $exists: false } }).lean();
  console.log(`  Found ${users.length} user(s) without role_id`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const roleName = user.role || 'user';
    const roleId   = roleMap[roleName];

    if (!roleId) {
      console.warn(`  SKIP user ${user._id} — unknown role "${roleName}"`);
      skipped++;
      continue;
    }

    await User.updateOne({ _id: user._id }, { $set: { role_id: roleId } });
    console.log(`  Updated user ${user._id} (${user.email || user.mobile}) → role: ${roleName}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
