'use strict';
/**
 * Load test — critical API paths
 *
 * Usage:
 *   node scripts/load-test.js [BASE_URL] [AUTH_TOKEN]
 *
 * Defaults:
 *   BASE_URL   = http://localhost:5000
 *   AUTH_TOKEN = set LOAD_TEST_TOKEN env var or pass as 2nd arg
 *
 * The server must be running before you execute this script.
 * Obtain a valid JWT with:
 *   curl -s -X POST http://localhost:5000/api/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@example.com","password":"secret"}' | jq -r .payload.accessToken
 */

const autocannon = require('autocannon');

const BASE       = process.argv[2] || process.env.LOAD_TEST_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.argv[3] || process.env.LOAD_TEST_TOKEN    || '';

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(result, p) {
  // autocannon latency object has p50, p75, p90, p99, p99_9
  const map = { 50: 'p50', 95: 'p99', 99: 'p99_9' }; // best available approximations
  // use p99 as stand-in for p95 (autocannon does not expose p95 natively)
  const key = { 50: 'p50', 95: 'p99', 99: 'p99_9' }[p];
  return result.latency[key] ?? '—';
}

function errorRate(result) {
  const total  = result.requests.total || 0;
  const errors = (result.errors || 0) + (result['2xx'] ? (total - result['2xx']) : 0);
  // use non-2xx responses + network errors as error count
  const nonOk = total - (result['2xx'] || 0);
  if (total === 0) return '0.00%';
  return ((nonOk / total) * 100).toFixed(2) + '%';
}

function statusBreakdown(result) {
  const codes = result.statusCodeStats || {};
  return Object.entries(codes)
    .map(([code, v]) => `${code}:${v.count}`)
    .join(' ');
}

function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon({ ...opts, setupClient: undefined }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

// ── Index discovery: fetch one real service ID and category ID before tests ──

async function discover() {
  const http = require('http');

  function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`${BASE}${path}`, { headers: { Accept: 'application/json' } }, (res) => {
        let body = '';
        res.on('data', d => (body += d));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error(`Non-JSON from ${path}: ${body.slice(0, 120)}`)); }
        });
      }).on('error', reject);
    });
  }

  let serviceId  = null;
  let categoryId = null;
  let inquiryBody = null;

  try {
    const svcResp = await get('/api/services?limit=1');
    const svc = svcResp?.payload?.data?.[0];
    if (svc) {
      serviceId  = svc._id;
      categoryId = svc.category?._id || svc.category;
      inquiryBody = JSON.stringify({
        service:  serviceId,
        adults:   2,
        children: 0,
        travelDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message:  'Load test inquiry — please ignore',
        contactSnapshot: {
          name:  'LoadTest User',
          email: 'loadtest@example.com',
          phone: '9000000000',
        },
      });
    }
  } catch (err) {
    console.warn('⚠️  Discovery fetch failed:', err.message);
    console.warn('   Inquiry test will be skipped. Service/category tests will use no filter.\n');
  }

  return { serviceId, categoryId, inquiryBody };
}

// ── Individual test runners ────────────────────────────────────────────────

async function testServiceList() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. GET /api/services  (50 conn, 30s, public listing)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return run({
    url:         `${BASE}/api/services`,
    connections: 50,
    duration:    30,
    title:       'GET /api/services',
    headers:     { accept: 'application/json' },
    // Default sort = { order:1, createdAt:-1 } — relies on compound index that does NOT exist
  });
}

async function testServiceById(serviceId) {
  const path = serviceId
    ? `/api/services?id=${serviceId}`
    : '/api/services?limit=1';  // fallback: still a DB hit but no ?id scan

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`2. GET /api/services?id=<id>  (50 conn, 30s, detail)`);
  console.log(`   Path: ${path}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return run({
    url:         `${BASE}${path}`,
    connections: 50,
    duration:    30,
    title:       'GET /api/services?id=<id>',
    headers:     { accept: 'application/json' },
    // Hits Service.findOne({ _id, isDeleted:false }) — _id is always indexed (PK)
  });
}

async function testCategories() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. GET /api/categories  (50 conn, 30s, active nav list)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return run({
    url:         `${BASE}/api/categories`,
    connections: 50,
    duration:    30,
    title:       'GET /api/categories',
    headers:     { accept: 'application/json' },
    // Hits { isActive:1, order:1 } — compound index exists. No Redis cache.
    // p95 should be notably lower than service listing if index is effective.
  });
}

async function testInquiryPost(inquiryBody) {
  if (!AUTH_TOKEN) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4. POST /api/inquiries  — SKIPPED (no AUTH_TOKEN)');
    console.log('   Set LOAD_TEST_TOKEN env var or pass as 3rd arg.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return null;
  }
  if (!inquiryBody) {
    console.log('\n4. POST /api/inquiries  — SKIPPED (no valid serviceId discovered)');
    return null;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4. POST /api/inquiries  (10 conn, 30s, write + notify)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return run({
    url:         `${BASE}/api/inquiries`,
    method:      'POST',
    connections: 10,
    duration:    30,
    title:       'POST /api/inquiries',
    headers: {
      'content-type':  'application/json',
      'authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: inquiryBody,
  });
}

async function testOtpRateLimit() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5. POST /api/auth/send-otp  (20 conn, 15s, rate-limit probe)');
  console.log('   Expect: first 5 requests → 200, remainder → 429');
  console.log('   Rate limiter: 5 req / 5-min window, in-memory Map, keyed by IP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return run({
    url:         `${BASE}/api/auth/send-otp`,
    method:      'POST',
    connections: 20,
    duration:    15,
    title:       'POST /api/auth/send-otp (rate-limit probe)',
    headers:     { 'content-type': 'application/json' },
    body:        JSON.stringify({ mobile: '9876543210' }),
  });
}

// ── Results table ──────────────────────────────────────────────────────────

function formatRow(label, result, note = '') {
  if (!result) {
    return `| ${label.padEnd(38)} | ${'SKIPPED'.padStart(10)} | ${'—'.padStart(7)} | ${'—'.padStart(7)} | ${'—'.padStart(7)} | ${'—'.padStart(10)} |${note ? ' ' + note : ''}`;
  }
  const rps    = result.requests.average.toFixed(1).padStart(10);
  const p50    = String(result.latency.p50).padStart(7);
  // autocannon doesn't expose p95; p99 is the next available bucket — noted in header
  const p99    = String(result.latency.p99).padStart(7);
  const p999   = String(result.latency.p99_9).padStart(7);
  const errPct = errorRate(result).padStart(10);
  return `| ${label.padEnd(38)} | ${rps} | ${p50} | ${p99} | ${p999} | ${errPct} |${note ? ' ' + note : ''}`;
}

function printTable(rows) {
  const header = `| ${'Endpoint'.padEnd(38)} | ${'req/s'.padStart(10)} | ${'p50ms'.padStart(7)} | ${'p99ms*'.padStart(7)} | ${'p999ms'.padStart(7)} | ${'error%'.padStart(10)} |`;
  const sep    = '-'.repeat(header.length);
  console.log('\n' + sep);
  console.log(header);
  console.log(sep);
  rows.forEach(r => console.log(r));
  console.log(sep);
  console.log('* autocannon does not expose p95; p99 is the next available bucket.');
}

function printFindings(results, { serviceList, serviceById, categories, inquiry, otp }) {
  const findings = [];

  // ── Threshold checks ──
  const P99_THRESHOLD_GET = 200; // ms — treat as a finding if p99 exceeds this at 50 conn

  if (serviceList) {
    if (serviceList.latency.p99 > P99_THRESHOLD_GET) {
      findings.push(
        `[PERF] GET /api/services p99=${serviceList.latency.p99}ms exceeds ${P99_THRESHOLD_GET}ms threshold.\n` +
        `  Hypothesis: default sort is { order:1, createdAt:-1 } but the Service model has NO compound\n` +
        `  index covering { order, createdAt }. MongoDB does a collection scan sort on every request.\n` +
        `  Fix candidate: serviceSchema.index({ isDeleted:1, isActive:1, order:1, createdAt:-1 }).`
      );
    }
    // Check that the service list is slower than categories (Redis cache false-positive check)
    if (categories && serviceList.latency.p99 < categories.latency.p99) {
      findings.push(
        `[CACHE] GET /api/categories is SLOWER than GET /api/services (${categories.latency.p99}ms vs ${serviceList.latency.p99}ms p99).\n` +
        `  Hypothesis: Neither endpoint has Redis caching. Both hit MongoDB directly. The category\n` +
        `  query uses { isActive:1, order:1 } index; the service query may benefit from a missing\n` +
        `  composite sort index. Compare absolute values after adding the index.`
      );
    }
  }

  if (categories && categories.latency.p99 > P99_THRESHOLD_GET) {
    findings.push(
      `[PERF] GET /api/categories p99=${categories.latency.p99}ms exceeds ${P99_THRESHOLD_GET}ms.\n` +
      `  Hypothesis: findAllWithChildren populates children in a second query per parent (N+1 risk).\n` +
      `  Verify category.repository.findAllWithChildren — if it loops populate calls, switch to\n` +
      `  a single aggregation with $graphLookup or $lookup.`
    );
  }

  if (serviceById && serviceById.latency.p99 > P99_THRESHOLD_GET) {
    findings.push(
      `[PERF] GET /api/services?id p99=${serviceById.latency.p99}ms exceeds ${P99_THRESHOLD_GET}ms.\n` +
      `  Hypothesis: findOne by _id (PK scan) + populate('category') causes a second DB round-trip.\n` +
      `  This endpoint returns a full Mongoose document (no .lean()) which adds serialisation overhead.`
    );
  }

  // ── Rate limiter analysis ──
  if (otp) {
    const codes   = otp.statusCodeStats || {};
    const ok200   = codes['200']?.count || codes['201']?.count || 0;
    const got429  = codes['429']?.count || 0;
    const got500  = codes['500']?.count || 0;
    const total   = otp.requests.total;

    if (got429 === 0 && total > 5) {
      findings.push(
        `[RATELIMIT-BLOCKER] POST /api/auth/send-otp fired ${total} requests with 0 × 429.\n` +
        `  The rate limiter DID NOT engage. Root cause: the in-memory Map store is keyed by req.ip.\n` +
        `  Under autocannon all requests share the same loopback IP (127.0.0.1), so the window\n` +
        `  resets between connections (each connection is a new TCP socket — the Map key collision\n` +
        `  should actually work, but verify the IP is not undefined/null in your env).\n` +
        `  Alternatively the OTP endpoint may be returning non-200 for another reason — check 4xx/5xx counts.`
      );
    } else if (got429 > 0 && got500 > 0) {
      findings.push(
        `[RATELIMIT-DEGRADED] Rate limiter triggered ${got429} × 429 BUT also ${got500} × 500.\n` +
        `  The limiter is running but something below it is throwing unhandled errors under load.\n` +
        `  Check Redis connection health and OTP store error handling.`
      );
    } else if (got429 > 0) {
      console.log(`\n✅ Rate limiter confirmed active: ${got429} × 429 across ${total} requests.`);
      if (ok200 > 10) {
        findings.push(
          `[RATELIMIT-WINDOW] ${ok200} requests returned 200 before hitting the cap.\n` +
          `  Expected ≤5 per IP per 5-min window. If connections share the same IP this is correct;\n` +
          `  if you ran from multiple IPs each got its own 5-request budget (correct behaviour).`
        );
      }
    }

    if (got500 > 0) {
      findings.push(
        `[ERROR] ${got500} × 500 on POST /api/auth/send-otp.\n` +
        `  Possible causes: Redis not running (OTP store), missing env var, or unhandled exception.\n` +
        `  Check server logs for stack traces during the test window.`
      );
    }
  }

  // ── Inquiry write degradation check ──
  if (inquiry) {
    const codes  = inquiry.statusCodeStats || {};
    const nonOk  = inquiry.requests.total - (inquiry['2xx'] || 0);
    if (nonOk > 0 && codes['401']?.count > 0) {
      findings.push(
        `[AUTH] POST /api/inquiries returned ${codes['401'].count} × 401.\n` +
        `  Token may have expired mid-test or was not provided. Re-run with a fresh JWT.`
      );
    }
    if (nonOk > 0 && codes['500']?.count > 0) {
      findings.push(
        `[ERROR] POST /api/inquiries returned ${codes['500'].count} × 500 under load.\n` +
        `  Writes are degrading under concurrency — check MongoDB connection pool saturation\n` +
        `  and whether FCM notification dispatch is blocking the response.`
      );
    }
    if (inquiry.latency.p99 > 500) {
      findings.push(
        `[PERF] POST /api/inquiries p99=${inquiry.latency.p99}ms.\n` +
        `  Write path: auth middleware → Zod validation → DB write → FCM notification dispatch.\n` +
        `  FCM dispatch is async (fire-and-forget) so should not block the response. If p99 is\n` +
        `  high, the bottleneck is likely MongoDB write concern or connection pool exhaustion.`
      );
    }
  }

  // ── Index cross-reference summary (static, from code review) ──
  console.log('\n── Index cross-reference ──────────────────────────────────────────────────');
  console.log('GET /api/services (list)');
  console.log('  Query filter : { isDeleted:false, isActive:true }');
  console.log('  Sort         : { order:1, createdAt:-1 }  ← DEFAULT');
  console.log('  Index used   : { category:1, isActive:1 } — PARTIAL MATCH (no order field)');
  console.log('  MISSING      : compound { isDeleted:1, isActive:1, order:1, createdAt:-1 }');
  console.log('  Fallback     : MongoDB in-memory sort on every request → latency risk\n');

  console.log('GET /api/services?id=<mongoId> (detail)');
  console.log('  Query filter : { _id, isDeleted:false }');
  console.log('  Index used   : _id (primary key) — always indexed, optimal\n');

  console.log('GET /api/categories (active nav list)');
  console.log('  Query filter : { isActive:true, isDeleted:false }');
  console.log('  Sort         : { order:1 } (inside findAllWithChildren)');
  console.log('  Index used   : { isActive:1, order:1 } — EXISTS, covers this query\n');

  console.log('POST /api/inquiries (write)');
  console.log('  Reads        : Service._id (PK), User._id (PK)');
  console.log('  Writes       : Inquiry collection (no relevant missing index on write path)');
  console.log('  Post-write   : FCM notification → async, non-blocking\n');

  console.log('POST /api/auth/send-otp (rate-limited)');
  console.log('  Rate limiter : in-memory Map, 5 req / 5-min, keyed by req.ip');
  console.log('  WARNING      : Map resets on process restart; no Redis backing.');
  console.log('  Under PM2 cluster mode: each worker has its own Map → 5×N requests allowed.\n');

  // ── Print findings ──
  if (findings.length === 0) {
    console.log('✅ No findings — all endpoints within thresholds.\n');
  } else {
    console.log('\n── Findings ───────────────────────────────────────────────────────────────');
    findings.forEach((f, i) => console.log(`\n[${i + 1}] ${f}`));
    console.log();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Thailand Tour API — Load Test                   ║');
  console.log(`║  Target : ${BASE.padEnd(38)} ║`);
  console.log(`║  Auth   : ${(AUTH_TOKEN ? '✓ token provided' : '✗ no token — inquiry test skipped').padEnd(38)} ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  // First verify the server is up
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      http.get(`${BASE}/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`/health returned ${res.statusCode}`));
      }).on('error', reject);
    });
    console.log(`\n✅ Server is up at ${BASE}`);
  } catch (err) {
    console.error(`\n❌ Server not reachable at ${BASE}: ${err.message}`);
    console.error('   Start the server first: npm run dev\n');
    process.exit(1);
  }

  const { serviceId, categoryId, inquiryBody } = await discover();

  if (serviceId) {
    console.log(`\n   Discovered serviceId  : ${serviceId}`);
    console.log(`   Discovered categoryId : ${categoryId}`);
  }

  const [serviceList, serviceById, categories, inquiry, otp] = await Promise.all([]).then(async () => {
    // Run sequentially to avoid saturating local loopback for all tests at once
    const r1 = await testServiceList();
    const r2 = await testServiceById(serviceId);
    const r3 = await testCategories();
    const r4 = await testInquiryPost(inquiryBody);
    const r5 = await testOtpRateLimit();
    return [r1, r2, r3, r4, r5];
  });

  // ── Print results table ──
  printTable([
    formatRow('GET /api/services (list, 50 conn)',     serviceList),
    formatRow('GET /api/services?id=<id> (50 conn)',   serviceById),
    formatRow('GET /api/categories (50 conn)',          categories),
    formatRow('POST /api/inquiries (10 conn)',          inquiry,
      AUTH_TOKEN ? '' : '← needs LOAD_TEST_TOKEN'),
    formatRow('POST /api/auth/send-otp (20 conn)',     otp),
  ]);

  // ── Status code breakdown (important for rate-limit test) ──
  console.log('\n── Status code breakdown ───────────────────────────────────────────────────');
  if (serviceList) console.log(`  GET  /api/services (list)   : ${statusBreakdown(serviceList)}`);
  if (serviceById) console.log(`  GET  /api/services?id       : ${statusBreakdown(serviceById)}`);
  if (categories)  console.log(`  GET  /api/categories        : ${statusBreakdown(categories)}`);
  if (inquiry)     console.log(`  POST /api/inquiries         : ${statusBreakdown(inquiry)}`);
  if (otp)         console.log(`  POST /api/auth/send-otp     : ${statusBreakdown(otp)}`);

  printFindings({}, { serviceList, serviceById, categories, inquiry, otp });
})();
