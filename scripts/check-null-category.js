'use strict';
/**
 * Diagnostic (READ-ONLY): find Service documents with a missing/null category,
 * or a category pointing at a Category that no longer exists (orphaned ref).
 *
 * Why:
 *   `category` is required in the Service schema, but legacy/raw-written docs may
 *   have category: null. That makes updateService crash (null.toString) and means
 *   the service can't render on a category page. This reports them so you can
 *   decide per-service whether to reassign a category or delete the orphan.
 *
 * This script does NOT modify anything.
 *
 * Usage:
 *   node scripts/check-null-category.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db.config');

require('../models');
const { Service, Category } = require('../models');

const run = async () => {
  await connectDB();
  console.log('\nScanning Service.category integrity...\n');

  // 1. Missing or explicitly-null category.
  const nullCat = await Service.find(
    { $or: [{ category: null }, { category: { $exists: false } }] }
  ).select('_id title slug isDeleted createdAt').lean();

  // 2. Non-null category that points at a Category that no longer exists.
  const withCat = await Service.find(
    { category: { $ne: null, $exists: true } }
  ).select('_id title category isDeleted').lean();

  const existingIds = new Set(
    (await Category.find({}).select('_id').lean()).map(c => c._id.toString())
  );
  const orphaned = withCat.filter(s => !existingIds.has(s.category.toString()));

  // ── Report ──────────────────────────────────────────────────
  console.log(`Null / missing category : ${nullCat.length}`);
  nullCat.forEach(s =>
    console.log(`   - ${s._id}  "${s.title}"  (isDeleted: ${s.isDeleted})`)
  );

  console.log(`\nOrphaned category ref   : ${orphaned.length}`);
  orphaned.forEach(s =>
    console.log(`   - ${s._id}  "${s.title}"  -> missing category ${s.category}`)
  );

  if (nullCat.length === 0 && orphaned.length === 0) {
    console.log('\n✅ All services have a valid category.');
  } else {
    console.log('\n⚠️  Fix these manually: reassign a valid category, or soft-delete the service.');
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
