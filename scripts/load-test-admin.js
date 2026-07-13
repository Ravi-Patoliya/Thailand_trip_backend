'use strict';
const autocannon = require('autocannon');
const fs = require('fs');

const BASE  = 'http://localhost:5000';
// Provide fresh tokens via env vars — do not hardcode credentials in this file.
const ADMIN = process.env.LOAD_TEST_ADMIN_TOKEN;
const USER  = process.env.LOAD_TEST_USER_TOKEN;

if (!ADMIN || !USER) {
  console.error('Set LOAD_TEST_ADMIN_TOKEN and LOAD_TEST_USER_TOKEN env vars before running this script.');
  process.exit(1);
}

const HA = { 'content-type': 'application/json', authorization: 'Bearer ' + ADMIN };
const HU = { 'content-type': 'application/json', authorization: 'Bearer ' + USER };
const HP = { 'content-type': 'application/json' };

const USER_ID   = '6a3bac8c3778a7171e20acd7';
const COUPON_ID = '6a36df899241e35dd9b10b26';
const ROLE_ID   = '6a2d1de6e884fdb4bfc8af0d';

function run(label, url, method, headers, body, conn) {
  return new Promise(resolve => {
    const opts = { url, method: method || 'GET', connections: conn || 30, duration: 15, headers, pipelining: 1 };
    if (body) opts.body = body;
    autocannon(opts, (_err, r) => {
      const codes   = r.statusCodeStats || {};
      const codeStr = Object.entries(codes).map(([c, v]) => `${c}:${v.count}`).join(' ');
      const total   = r.requests.total;
      const ok      = r['2xx'] || 0;
      const errPct  = total > 0 ? ((total - ok) / total * 100).toFixed(1) + '%' : '0.0%';
      const result  = { label, rps: r.requests.average.toFixed(1), p50: r.latency.p50, p99: r.latency.p99, p999: r.latency.p99_9, total, errPct, codeStr };
      resolve(result);
    });
    process.stdout.write(`  ${label} ...`);
  });
}

async function main() {
  const results = [];

  const tests = [
    ['GET /api/users (admin list)',       BASE + '/api/users',                        'GET',  HA,  null,  30],
    ['GET /api/users/:id',               BASE + '/api/users/' + USER_ID,             'GET',  HA,  null,  30],
    ['GET /api/users/stats',             BASE + '/api/users/stats',                  'GET',  HA,  null,  30],
    ['GET /api/inquiries (admin)',        BASE + '/api/inquiries',                    'GET',  HA,  null,  30],
    ['GET /api/inquiries/stats',         BASE + '/api/inquiries/stats',              'GET',  HA,  null,  30],
    ['GET /api/reviews (admin)',          BASE + '/api/reviews',                      'GET',  HA,  null,  30],
    ['GET /api/reviews/pending-count',   BASE + '/api/reviews/pending-count',        'GET',  HA,  null,  30],
    ['GET /api/coupons (admin)',          BASE + '/api/coupons',                      'GET',  HA,  null,  30],
    ['GET /api/coupons/?id',             BASE + '/api/coupons?id=' + COUPON_ID,      'GET',  HA,  null,  30],
    ['GET /api/notifications/admin/all', BASE + '/api/notifications/admin/all',      'GET',  HA,  null,  30],
    ['GET /api/roles/:id',               BASE + '/api/roles/' + ROLE_ID,             'GET',  HP,  null,  30],
    ['POST /api/notifications/fcm-token',BASE + '/api/notifications/fcm-token',      'POST', HU,  JSON.stringify({ fcmToken: 'load_test_token_abcdefghijklmnopqrstuvwxyz_123456', platform: 'android' }), 10],
  ];

  for (const [label, url, method, headers, body, conn] of tests) {
    const r = await run(label, url, method, headers, body, conn);
    process.stdout.write(` ${r.rps} req/s  p50=${r.p50}ms  p99=${r.p99}ms  ${r.codeStr}\n`);
    results.push(r);
  }

  fs.writeFileSync('scripts/load-test-group3.json', JSON.stringify(results, null, 2));
  console.log('\nSaved → scripts/load-test-group3.json');
}

main();
