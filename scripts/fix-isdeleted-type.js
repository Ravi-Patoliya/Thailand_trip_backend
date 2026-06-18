'use strict';
/**
 * One-time fix: normalize `isDeleted` to a real boolean on existing documents.
 *
 * Why:
 *   The soft-delete queries match exactly `{ isDeleted: false }` (boolean).
 *   Legacy docs either (a) have no isDeleted field, or (b) had it written as the
 *   STRING "false"/"true" via a raw DB write — neither matches a boolean, so those
 *   docs become invisible (e.g. /auth/refresh 401, empty category/service lists).
 *
 * What it does, per collection (Category, Service, User, Coupon, Review, Contact):
 *   - isDeleted missing        -> false  (boolean)
 *   - isDeleted === "false"    -> false  (boolean)
 *   - isDeleted === "true"     -> true   (boolean)
 *   - real booleans            -> left untouched
 *
 * Safe to run multiple times (idempotent — already-boolean docs are skipped).
 *
 * Usage:
 *   node scripts/fix-isdeleted-type.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db.config');

require('../models');
const { Category, Service, User, Coupon, Review, Contact } = require('../models');

const MODELS = [
  ['Category', Category],
  ['Service',  Service],
  ['User',     User],
  ['Coupon',   Coupon],
  ['Review',   Review],
  ['Contact',  Contact],
];

const run = async () => {
  await connectDB();
  console.log('\nNormalizing isDeleted to boolean...\n');

  let grandTotal = 0;

  for (const [name, Model] of MODELS) {
    const col = Model.collection;

    // missing -> false
    const r1 = await col.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    // string "false" -> false
    const r2 = await col.updateMany(
      { isDeleted: 'false' },
      { $set: { isDeleted: false } }
    );
    // string "true" -> true
    const r3 = await col.updateMany(
      { isDeleted: 'true' },
      { $set: { isDeleted: true } }
    );

    const fixed = r1.modifiedCount + r2.modifiedCount + r3.modifiedCount;
    grandTotal += fixed;
    console.log(
      `  ${name.padEnd(9)} fixed ${fixed}  ` +
      `(missing:${r1.modifiedCount}, "false":${r2.modifiedCount}, "true":${r3.modifiedCount})`
    );
  }

  console.log(`\nDone. Total documents normalized: ${grandTotal}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
