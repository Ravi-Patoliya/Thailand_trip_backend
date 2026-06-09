/**
 * Schema Validation Script
 * Run: node src/config/validateSchemas.js
 * Validates all models load without errors and prints index summary.
 */
const mongoose = require('mongoose');

async function validateSchemas() {
  console.log('\n🔍 Thailand Tour Platform — Schema Validation\n');
  console.log('═'.repeat(60));

  const models = require('../models/index');

  let allPassed = true;

  for (const [modelName, Model] of Object.entries(models)) {
    try {
      const schema = Model.schema;
      const paths = Object.keys(schema.paths).filter(p => !p.startsWith('_'));
      const indexes = schema.indexes();

      console.log(`\n✅ ${modelName}`);
      console.log(`   Fields  : ${paths.length} (${paths.slice(0, 5).join(', ')}${paths.length > 5 ? '...' : ''})`);
      console.log(`   Indexes : ${indexes.length}`);
      indexes.forEach(([fields, opts]) => {
        const fieldStr = Object.entries(fields).map(([k, v]) => `${k}:${v}`).join(', ');
        const flags = [opts.unique && 'unique', opts.sparse && 'sparse'].filter(Boolean).join(', ');
        console.log(`     → { ${fieldStr} }${flags ? ' [' + flags + ']' : ''}`);
      });

      // Check virtuals
      const virtuals = Object.keys(schema.virtuals).filter(v => v !== 'id');
      if (virtuals.length) {
        console.log(`   Virtuals: ${virtuals.join(', ')}`);
      }

      // Check methods
      const methods = Object.keys(schema.methods);
      if (methods.length) {
        console.log(`   Methods : ${methods.join(', ')}`);
      }

      // Check statics
      const statics = Object.keys(schema.statics);
      if (statics.length) {
        console.log(`   Statics : ${statics.join(', ')}`);
      }

    } catch (err) {
      console.error(`\n❌ ${modelName} — ERROR: ${err.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '═'.repeat(60));

  // Print relationship map
  console.log('\n📊 Collection Relationships\n');
  const relations = [
    'User         ←── Inquiry (user)',
    'Category     ←── Service (category)',
    'Service      ←── Inquiry.services[].service',
    'Service      ←── Review (service)',
    'Inquiry      ←── Review (inquiry) [1:1 per service]',
    'Coupon       ←── Inquiry (coupon)',
    'User(admin)  ←── Inquiry (assignedTo, paymentLog.recordedBy)',
    'User(admin)  ←── Review (moderatedBy, adminReply.repliedBy)',
  ];
  relations.forEach(r => console.log(`  ${r}`));

  console.log('\n📦 Status Machines\n');
  console.log('  Inquiry  : new → contacted → confirmed → payment_pending → completed | cancelled');
  console.log('  Review   : pending → approved | rejected');
  console.log('  Contact  : unread → read → replied | archived');
  console.log('  Service  : isActive toggle (no status machine)');

  console.log('\n' + '═'.repeat(60));
  console.log(allPassed
    ? '\n✅ All schemas validated successfully!\n'
    : '\n❌ Some schemas have errors. Check above.\n'
  );
}

// Run standalone (no DB needed for schema validation)
validateSchemas().catch(console.error);
