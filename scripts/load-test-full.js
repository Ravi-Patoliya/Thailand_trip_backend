'use strict';
/**
 * Full API Load Test — all routes
 * Usage: node scripts/load-test-full.js
 */

const autocannon = require('autocannon');

const BASE         = 'http://localhost:5000';
// Provide fresh tokens via env vars — do not hardcode credentials in this file.
const USER_TOKEN   = process.env.LOAD_TEST_USER_TOKEN;
const ADMIN_TOKEN  = process.env.LOAD_TEST_ADMIN_TOKEN;

if (!USER_TOKEN || !ADMIN_TOKEN) {
  console.error('Set LOAD_TEST_USER_TOKEN and LOAD_TEST_ADMIN_TOKEN env vars before running this script.');
  process.exit(1);
}

// Real IDs discovered from the DB
const SVC_ID      = '6a3384909fad55b3ae7407ff';
const CAT_ID      = '6a1ebda4d58c0a4d3234cae7';
const COUPON_ID   = '6a36df899241e35dd9b10b26';
const REVIEW_ID   = '6a3e3e54dc0c9b7e7392ceea';
const INQ_ID      = '6a3d3d33fea153c3ca083055';
const NOTIF_ID    = '6a3d3d33fea153c3ca08305b';
const ROLE_ID     = '6a2d1de6e884fdb4bfc8af0d';
const USER_ID     = '6a3bac8c3778a7171e20acd7';

const H_JSON      = { 'content-type': 'application/json', accept: 'application/json' };
const H_USER      = { ...H_JSON, authorization: `Bearer ${USER_TOKEN}` };
const H_ADMIN     = { ...H_JSON, authorization: `Bearer ${ADMIN_TOKEN}` };

// ── Helpers ──────────────────────────────────────────────────────────────────

function run({ label, url, method = 'GET', headers = {}, body, connections = 30, duration = 15 }) {
  return new Promise((resolve) => {
    const opts = { url, method, connections, duration, headers, pipelining: 1 };
    if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const inst = autocannon(opts, (_err, result) => resolve({ label, result }));
    process.stdout.write(`\n  Running: ${label} ...`);
    inst.on('done', () => process.stdout.write(' done\n'));
  });
}

function fmt(n, pad = 7) { return String(n ?? '—').padStart(pad); }

function row(r) {
  if (!r) return null;
  const { label, result } = r;
  const rps    = result.requests.average.toFixed(1);
  const p50    = result.latency.p50;
  const p99    = result.latency.p99;
  const p999   = result.latency.p99_9;
  const total  = result.requests.total;
  const ok2xx  = result['2xx'] || 0;
  const nonOk  = total - ok2xx;
  const errPct = total > 0 ? ((nonOk / total) * 100).toFixed(1) + '%' : '0.0%';
  const codes  = result.statusCodeStats || {};
  const codeStr = Object.entries(codes).map(([c, v]) => `${c}:${v.count}`).join(' ');
  return { label, rps, p50, p99, p999, total, errPct, codeStr };
}

function printTable(rows) {
  const COL = [42, 8, 7, 7, 7, 8, 22];
  const sep = '+' + COL.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const hdr = (cells) => '| ' + cells.map((c, i) => String(c).padEnd(COL[i])).join(' | ') + ' |';

  console.log('\n' + sep);
  console.log(hdr(['Endpoint', 'req/s', 'p50ms', 'p99ms', 'p999ms', 'err%', 'Status codes']));
  console.log(sep);
  rows.filter(Boolean).forEach(r => {
    console.log(hdr([r.label, r.rps, r.p50, r.p99, r.p999, r.errPct, r.codeStr]));
  });
  console.log(sep);
  console.log('  p99 used as p95 proxy (autocannon does not expose p95 natively)');
  console.log('  All tests: 30 connections, 15s duration unless noted\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Thailand Tour API — Full Load Test                ║');
  console.log('║  30 connections · 15s per endpoint                 ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // ── GROUP 1: Public / optional-auth GET endpoints ─────────────────────────
  console.log('\n── Group 1: Public GET endpoints ─────────────────────');
  const g1 = await Promise.all([
    run({ label: 'GET /health',                    url: `${BASE}/health` }),
    run({ label: 'GET /api/cities',                url: `${BASE}/api/cities` }),
    run({ label: 'GET /api/roles',                 url: `${BASE}/api/roles`, headers: H_JSON }),
    run({ label: 'GET /api/categories',            url: `${BASE}/api/categories`, headers: H_JSON }),
    run({ label: 'GET /api/services (list)',        url: `${BASE}/api/services`, headers: H_JSON }),
    run({ label: 'GET /api/services?id (detail)',  url: `${BASE}/api/services?id=${SVC_ID}`, headers: H_JSON }),
    run({ label: 'GET /api/reviews (by service)',  url: `${BASE}/api/reviews?serviceId=${SVC_ID}`, headers: H_JSON }),
    run({ label: 'GET /api/coupons (public)',       url: `${BASE}/api/coupons`, headers: H_JSON }),
    run({ label: 'GET /api/banners',               url: `${BASE}/api/banners`, headers: H_JSON }),
  ]);

  // ── GROUP 2: Authenticated user endpoints ────────────────────────────────
  console.log('\n── Group 2: Authenticated user endpoints ──────────────');
  const g2 = await Promise.all([
    run({ label: 'GET /api/auth/me',               url: `${BASE}/api/auth/me`, headers: H_USER }),
    run({ label: 'GET /api/users/me',              url: `${BASE}/api/users/me`, headers: H_USER }),
    run({ label: 'GET /api/inquiries (user)',       url: `${BASE}/api/inquiries`, headers: H_USER }),
    run({ label: 'GET /api/notifications',         url: `${BASE}/api/notifications`, headers: H_USER }),
    run({ label: 'GET /api/notifications/unread',  url: `${BASE}/api/notifications/unread-count`, headers: H_USER }),
    run({ label: 'GET /api/notifications/prefs',   url: `${BASE}/api/notifications/preferences`, headers: H_USER }),
  ]);

  // ── GROUP 3: Admin GET endpoints ─────────────────────────────────────────
  console.log('\n── Group 3: Admin GET endpoints ───────────────────────');
  const g3 = await Promise.all([
    run({ label: 'GET /api/users (admin list)',     url: `${BASE}/api/users`, headers: H_ADMIN }),
    run({ label: 'GET /api/users/:id',             url: `${BASE}/api/users/${USER_ID}`, headers: H_ADMIN }),
    run({ label: 'GET /api/users/stats',           url: `${BASE}/api/users/stats`, headers: H_ADMIN }),
    run({ label: 'GET /api/inquiries (admin)',      url: `${BASE}/api/inquiries`, headers: H_ADMIN }),
    run({ label: 'GET /api/inquiries/stats',       url: `${BASE}/api/inquiries/stats`, headers: H_ADMIN }),
    run({ label: 'GET /api/reviews (admin)',        url: `${BASE}/api/reviews`, headers: H_ADMIN }),
    run({ label: 'GET /api/reviews/pending-count', url: `${BASE}/api/reviews/pending-count`, headers: H_ADMIN }),
    run({ label: 'GET /api/coupons (admin)',        url: `${BASE}/api/coupons`, headers: H_ADMIN }),
    run({ label: 'GET /api/coupons/:id',           url: `${BASE}/api/coupons?id=${COUPON_ID}`, headers: H_ADMIN }),
    run({ label: 'GET /api/notifications/admin',   url: `${BASE}/api/notifications/admin/all`, headers: H_ADMIN }),
    run({ label: 'GET /api/roles/:id',             url: `${BASE}/api/roles/${ROLE_ID}`, headers: H_ADMIN }),
  ]);

  // ── GROUP 4: Write / mutation endpoints (lower concurrency) ──────────────
  console.log('\n── Group 4: Write endpoints (10 connections) ──────────');
  const g4 = [];

  g4.push(await run({
    label: 'POST /api/notifications/fcm-token',
    url: `${BASE}/api/notifications/fcm-token`,
    method: 'POST', headers: H_USER, connections: 10,
    body: JSON.stringify({ fcmToken: 'test_dummy_token_load_test_12345678901234567890', platform: 'android' }),
  }));

  g4.push(await run({
    label: 'PATCH /api/notifications/preferences',
    url: `${BASE}/api/notifications/preferences`,
    method: 'PATCH', headers: H_USER, connections: 10,
    body: JSON.stringify({ booking: true, reviews: true, offers: true }),
  }));

  g4.push(await run({
    label: 'PATCH /api/notifications/read-all',
    url: `${BASE}/api/notifications/read-all`,
    method: 'PATCH', headers: H_USER, connections: 10,
    body: '{}',
  }));

  g4.push(await run({
    label: 'POST /api/coupons/validate',
    url: `${BASE}/api/coupons/validate`,
    method: 'POST', headers: H_JSON, connections: 10,
    body: JSON.stringify({ code: 'WELCOME10', orderAmount: 5000 }),
  }));

  // POST inquiry — real write to DB + notification
  g4.push(await run({
    label: 'POST /api/inquiries (write + notify)',
    url: `${BASE}/api/inquiries`,
    method: 'POST', headers: H_USER, connections: 5,
    body: JSON.stringify({
      services: [{ serviceId: SVC_ID, quantity: 1 }],
      travelDate: '2027-03-15',
      adults: 2,
      children: 0,
      specialRequests: 'Load test - please ignore',
    }),
  }));

  // ── GROUP 5: Rate limiter probes ─────────────────────────────────────────
  console.log('\n── Group 5: Rate limiter probes (20 connections, 10s) ─');
  const g5 = [];

  g5.push(await run({
    label: 'POST /api/auth/send-otp (OTP limiter)',
    url: `${BASE}/api/auth/send-otp`,
    method: 'POST', headers: H_JSON, connections: 20, duration: 10,
    body: JSON.stringify({ mobile: '9000000001' }),
  }));

  // ── Print results ─────────────────────────────────────────────────────────
  const all = [...g1, ...g2, ...g3, ...g4, ...g5].map(row);

  console.log('\n\n══════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  FULL LOAD TEST RESULTS — Thailand Tour API');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════════════');

  const groups = [
    { title: 'Group 1 — Public / optional-auth GET endpoints', rows: g1.map(row) },
    { title: 'Group 2 — Authenticated user GET endpoints',     rows: g2.map(row) },
    { title: 'Group 3 — Admin GET endpoints',                  rows: g3.map(row) },
    { title: 'Group 4 — Write / mutation endpoints',           rows: g4.map(row) },
    { title: 'Group 5 — Rate limiter probes',                  rows: g5.map(row) },
  ];

  groups.forEach(g => {
    console.log(`\n  ${g.title}`);
    printTable(g.rows);
  });

  // ── Summary findings ──────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  FINDINGS SUMMARY');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════════════\n');

  const THRESHOLD = 200;
  const findings = [];
  all.filter(Boolean).forEach(r => {
    if (r.p99 > THRESHOLD) {
      findings.push(`  ⚠  ${r.label.padEnd(44)} p99=${r.p99}ms  (>${THRESHOLD}ms threshold)`);
    }
  });

  const otpRow = all.find(r => r?.label?.includes('send-otp'));
  if (otpRow) {
    const codes = g5[0]?.result?.statusCodeStats || {};
    const got429 = codes['429']?.count || 0;
    const got200 = codes['200']?.count || 0;
    if (got429 > 0) {
      console.log(`  ✓  Rate limiter active: ${got200} × 200,  ${got429} × 429\n`);
    } else {
      console.log(`  ✗  Rate limiter did NOT engage — ${otpRow.total} requests, 0 × 429\n`);
    }
  }

  if (findings.length === 0) {
    console.log('  ✓  All endpoints within 200ms p99 threshold\n');
  } else {
    console.log('  Endpoints exceeding p99 > 200ms at 30 concurrent connections:');
    findings.forEach(f => console.log(f));
    console.log();
  }

  // Raw JSON for report generation
  const jsonOut = JSON.stringify(groups.map(g => ({ title: g.title, rows: g.rows })), null, 2);
  require('fs').writeFileSync('scripts/load-test-results.json', jsonOut);
  console.log('  Raw results saved → scripts/load-test-results.json\n');
})();
