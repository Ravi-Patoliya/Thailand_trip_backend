const dotenv = require('dotenv');
dotenv.config();

/* ─── Shared design tokens (mirrors the client-side CSS palette) ──────────── */
const T = {
    brandDark:    '#0D2618',
    brandPrimary: '#1C3D2E',
    brandMid:     '#2E6B4A',
    brandLight:   '#4A9E70',
    brandSurface: '#EAF4EE',
    gold:         '#F0BE5C',
    goldDark:     '#D4A017',
    goldSurface:  '#FFF9EE',
    bgPage:       '#F7F3ED',
    bgWarm:       '#EFE9E0',
    bgCard:       '#FFFFFF',
    surface2:     '#F1ECE3',
    textPrimary:  '#1A1A1A',
    textSecondary:'#4A3F35',
    textMuted:    '#9B8B79',
    border:       '#E8E0D4',
    borderStrong: '#D4C9BE',
};

/* ─── Reusable partial builders ───────────────────────────────────────────── */
const baseStyles = () => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background-color:${T.bgPage};font-family:'Inter',Helvetica,Arial,sans-serif;color:${T.textPrimary};-webkit-font-smoothing:antialiased;}
    .wrap{max-width:620px;margin:32px auto;background:${T.bgCard};border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(13,38,24,0.13);}
    /* header */
    .hdr{background:linear-gradient(145deg,${T.brandDark} 0%,${T.brandPrimary} 55%,${T.brandMid} 100%);padding:40px 32px 32px;text-align:center;position:relative;}
    .hdr::after{content:'';display:block;position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${T.gold},${T.goldDark},${T.gold});}
    .hdr-logo{display:inline-block;font-family:'Playfair Display','Georgia',serif;font-size:26px;font-weight:700;color:${T.gold};letter-spacing:2px;margin-bottom:6px;}
    .hdr-sub{font-size:13px;color:rgba(234,244,238,0.75);letter-spacing:1.5px;text-transform:uppercase;}
    .hdr-title{font-size:22px;font-weight:600;color:#FFFFFF;margin-top:18px;line-height:1.3;}
    /* body */
    .body{padding:40px 36px;}
    .greeting{font-size:17px;color:${T.brandPrimary};font-weight:600;margin-bottom:14px;}
    .lead{font-size:15px;color:${T.textSecondary};line-height:1.75;margin-bottom:28px;}
    /* OTP box */
    .otp-wrap{text-align:center;margin:32px 0;}
    .otp-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};margin-bottom:14px;}
    .otp-box{display:inline-block;background:linear-gradient(145deg,${T.brandSurface},${T.bgWarm});border:2px solid ${T.gold};border-radius:14px;padding:28px 40px;min-width:260px;}
    .otp-code{font-family:'Courier New',Courier,monospace;font-size:42px;font-weight:700;color:${T.brandPrimary};letter-spacing:10px;line-height:1;}
    .otp-expiry{margin-top:14px;font-size:12px;color:${T.goldDark};font-weight:600;letter-spacing:0.5px;}
    /* info card */
    .card{background:${T.brandSurface};border:1px solid ${T.border};border-radius:10px;padding:22px 24px;margin:24px 0;}
    .card-title{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${T.brandMid};font-weight:600;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid ${T.border};}
    .row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:1px solid ${T.border};}
    .row:last-child{border-bottom:none;}
    .row-label{font-size:13px;color:${T.textMuted};font-weight:500;flex:0 0 42%;}
    .row-value{font-size:13px;color:${T.textPrimary};font-weight:600;text-align:right;flex:1;}
    /* security notice */
    .notice{background:${T.goldSurface};border-left:4px solid ${T.gold};border-radius:0 8px 8px 0;padding:18px 20px;margin:24px 0;}
    .notice-title{font-size:13px;font-weight:700;color:${T.brandPrimary};margin-bottom:10px;letter-spacing:0.5px;}
    .notice ul{padding-left:18px;margin:0;}
    .notice li{font-size:13px;color:${T.textSecondary};margin-bottom:7px;line-height:1.6;}
    /* alert badge */
    .badge{display:inline-block;background:${T.gold};color:${T.brandDark};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;margin-bottom:20px;}
    .badge-red{background:#FEE2E2;color:#991B1B;}
    .badge-amber{background:${T.goldSurface};color:${T.goldDark};}
    /* stat row */
    .stats{display:table;width:100%;border-collapse:separate;border-spacing:10px;margin:20px 0;}
    .stat{display:table-cell;background:${T.bgCard};border:1px solid ${T.border};border-radius:10px;padding:16px;text-align:center;width:33%;}
    .stat-num{font-size:28px;font-weight:700;color:${T.brandMid};font-family:'Playfair Display',serif;}
    .stat-lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${T.textMuted};margin-top:4px;}
    /* buttons */
    .btn-wrap{text-align:center;margin:32px 0;}
    .btn{display:inline-block;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.5px;margin:6px;}
    .btn-approve{background:${T.brandMid};color:#FFFFFF !important;}
    .btn-reject{background:transparent;color:${T.textSecondary} !important;border:2px solid ${T.borderStrong};}
    /* divider */
    .divider{border:none;border-top:1px solid ${T.border};margin:28px 0;}
    /* footer */
    .ftr{background:${T.brandDark};padding:28px 32px;text-align:center;}
    .ftr-brand{font-family:'Playfair Display',serif;font-size:16px;color:${T.gold};letter-spacing:2px;margin-bottom:8px;}
    .ftr-text{font-size:11px;color:rgba(234,244,238,0.5);line-height:1.8;}
    .ftr-gold-line{width:48px;height:2px;background:${T.gold};margin:12px auto;}
    @media(max-width:600px){
      .wrap{margin:0;border-radius:0;}
      .body{padding:28px 20px;}
      .otp-code{font-size:32px;letter-spacing:6px;}
      .stats{display:block;}
      .stat{display:block;margin-bottom:10px;width:100%;}
      .row{flex-direction:column;}
      .row-value{text-align:left;margin-top:3px;}
    }
  </style>`;

const header = (subtitle, title) => `
  <div class="hdr">
    <div class="hdr-logo">Thai Tour</div>
    <div class="hdr-sub">${subtitle}</div>
    ${title ? `<div class="hdr-title">${title}</div>` : ''}
  </div>`;

const footer = () => `
  <div class="ftr">
    <div class="ftr-brand">Thai Tour</div>
    <div class="ftr-gold-line"></div>
    <div class="ftr-text">
      This is an automated message — please do not reply.<br>
      &copy; ${new Date().getFullYear()} Thai Tour &nbsp;&middot;&nbsp; Crafting Unforgettable Journeys
    </div>
  </div>`;

const html = (head, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  ${head}
  ${baseStyles()}
</head>
<body>
  <div class="wrap">
    ${body}
    ${footer()}
  </div>
</body>
</html>`;

/* ─── Email config ────────────────────────────────────────────────────────── */
const emailConfig = {
    smtp: {
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    },

    sender: {
        name:    'Thai Tour',
        email:   process.env.EMAIL_SENDER || 'no-reply@thaitour.com',
        company: 'Thai Tour Co., Ltd.',
    },

    templates: {

        /* ── 1. Login OTP ─────────────────────────────────────────────────── */
        employee_login_otp: {
            subject: (d) => `${d.otp} — Your Thai Tour Login Code`,
            html: (d) => html(
                '<title>Thai Tour Login OTP</title>',
                `${header('Secure Account Access', 'Verify Your Login')}
                <div class="body">
                  <p class="greeting">Hello, ${d.user_name || 'Traveller'}</p>
                  <p class="lead">
                    We received a login request for your <strong>${d.company_name || 'Thai Tour'}</strong> account.
                    Use the one-time code below to complete your sign-in.
                  </p>
                  <div class="otp-wrap">
                    <div class="otp-label">Your secure login code</div>
                    <div class="otp-box">
                      <div class="otp-code">${d.otp}</div>
                      <div class="otp-expiry">Expires in ${d.expires_in || '10 minutes'}</div>
                    </div>
                  </div>
                  <div class="notice">
                    <div class="notice-title">Security Notice</div>
                    <ul>
                      <li>This code is valid for <strong>${d.expires_in || '10 minutes'}</strong> only.</li>
                      <li>Never share this code with anyone, including Thai Tour staff.</li>
                      <li>If you did not request this, please ignore this email and notify your administrator.</li>
                    </ul>
                  </div>
                  <div class="card">
                    <div class="card-title">Login Details</div>
                    <div class="row">
                      <span class="row-label">Account</span>
                      <span class="row-value">${d.identifier || '—'}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Requested</span>
                      <span class="row-value">${new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>`
            ),
            text: (d) => `Thai Tour — Login OTP\n\nHello ${d.user_name || 'Traveller'},\n\nYour Login OTP: ${d.otp}\nValid for: ${d.expires_in || '10 minutes'}\n\nAccount: ${d.identifier || '—'}\n\nNever share this OTP with anyone.\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 2. Forgot Password OTP ───────────────────────────────────────── */
        employee_forgot_password_otp: {
            subject: (d) => `Reset Your Thai Tour Password`,
            html: (d) => html(
                '<title>Password Reset OTP</title>',
                `${header('Account Security', 'Password Reset Request')}
                <div class="body">
                  <p class="greeting">Hello, ${d.user_name || 'Traveller'}</p>
                  <p class="lead">
                    We received a request to reset the password for your
                    <strong>${d.company_name || 'Thai Tour'}</strong> account.
                    Enter the code below to proceed.
                  </p>
                  <div class="otp-wrap">
                    <div class="otp-label">Password reset code</div>
                    <div class="otp-box">
                      <div class="otp-code">${d.otp}</div>
                      <div class="otp-expiry">Expires in ${d.expires_in || '10 minutes'}</div>
                    </div>
                  </div>
                  <div class="notice">
                    <div class="notice-title">Security Notice</div>
                    <ul>
                      <li>This code expires in <strong>${d.expires_in || '10 minutes'}</strong>.</li>
                      <li>Never share this code — Thai Tour staff will never ask for it.</li>
                      <li>If you did not request a password reset, please contact your administrator immediately.</li>
                    </ul>
                  </div>
                  <div class="card">
                    <div class="card-title">Request Details</div>
                    <div class="row">
                      <span class="row-label">Account</span>
                      <span class="row-value">${d.identifier || '—'}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Requested at</span>
                      <span class="row-value">${new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>`
            ),
            text: (d) => `Thai Tour — Password Reset OTP\n\nHello ${d.user_name || 'Traveller'},\n\nYour Password Reset OTP: ${d.otp}\nValid for: ${d.expires_in || '10 minutes'}\n\nAccount: ${d.identifier || '—'}\n\nIf you did not request this, contact your administrator.\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 3. Password Reset (link-based legacy) ────────────────────────── */
        password_reset: {
            subject: () => `Thai Tour — Password Reset`,
            html: (d) => html(
                '<title>Password Reset</title>',
                `${header('Account Security', 'Reset Your Password')}
                <div class="body">
                  <p class="greeting">Hello, ${d.employee_name || 'Traveller'}</p>
                  <p class="lead">Use the code below to reset your Thai Tour account password.</p>
                  <div class="otp-wrap">
                    <div class="otp-label">Reset code</div>
                    <div class="otp-box">
                      <div class="otp-code">${d.reset_code}</div>
                      <div class="otp-expiry">Expires in ${d.expires_in || '15 minutes'}</div>
                    </div>
                  </div>
                  <p class="lead" style="font-size:13px;margin-top:0;">
                    If you did not request this, please contact your administrator immediately.
                  </p>
                </div>`
            ),
            text: (d) => `Thai Tour — Password Reset\n\nHello ${d.employee_name || 'Traveller'},\n\nReset Code: ${d.reset_code}\nValid for: ${d.expires_in || '15 minutes'}\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 4. Welcome ───────────────────────────────────────────────────── */
        welcome: {
            subject: (d) => `Welcome to Thai Tour${d.company_name ? ` — ${d.company_name}` : ''}`,
            html: (d) => html(
                '<title>Welcome to Thai Tour</title>',
                `${header('Welcome Aboard', 'Your Journey Begins Here')}
                <div class="body">
                  <p class="greeting">Hello, ${d.employee_name || 'Traveller'}</p>
                  <p class="lead">
                    Welcome to <strong>${d.company_name || 'Thai Tour'}</strong>!
                    Your account is now active and ready to use. We're delighted to have you on board.
                  </p>
                  <div class="card" style="background:linear-gradient(145deg,${T.brandSurface},${T.bgWarm});border-color:${T.gold};">
                    <div class="card-title" style="color:${T.goldDark};">What You Can Do Now</div>
                    <div class="row">
                      <span class="row-label">Browse Tours</span>
                      <span class="row-value" style="color:${T.brandMid};">Explore Thailand's finest destinations</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Manage Bookings</span>
                      <span class="row-value" style="color:${T.brandMid};">Track and update your reservations</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Get Support</span>
                      <span class="row-value" style="color:${T.brandMid};">Our team is always here to help</span>
                    </div>
                  </div>
                  <p class="lead" style="font-size:13px;">
                    If you have any questions or need assistance, please reach out to your administrator.
                  </p>
                </div>`
            ),
            text: (d) => `Welcome to Thai Tour!\n\nHello ${d.employee_name || 'Traveller'},\n\nYour account with ${d.company_name || 'Thai Tour'} is now active.\n\nIf you have questions, contact your administrator.\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 5. Vehicle Shortage Alert ────────────────────────────────────── */
        vehicle_shortage: {
            subject: (d) => `Vehicle Shortage Alert — ${d.ride_date}`,
            html: (d) => html(
                '<title>Vehicle Shortage Alert</title>',
                `${header('Fleet Operations', 'Vehicle Shortage Alert')}
                <div class="body">
                  <span class="badge badge-red">Action Required</span>
                  <p class="lead">
                    There are <strong>no vehicles available</strong> for ride grouping on the date below.
                    Immediate attention is required to prevent service disruptions.
                  </p>
                  <div class="card">
                    <div class="card-title">Shortage Details</div>
                    <div class="row">
                      <span class="row-label">Date</span>
                      <span class="row-value">${d.ride_date}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Batch Time</span>
                      <span class="row-value">${d.batch_time}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Pending Rides</span>
                      <span class="row-value" style="color:#991B1B;font-weight:700;">${d.ride_count}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Cities</span>
                      <span class="row-value">${d.cities || '—'}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">States</span>
                      <span class="row-value">${d.states || '—'}</span>
                    </div>
                  </div>
                  <div class="notice">
                    <div class="notice-title">Next Steps</div>
                    <ul>
                      <li>Check vehicle availability in the listed locations.</li>
                      <li>Assign drivers or procure additional vehicles.</li>
                      <li>Notify the operations team if rides cannot be fulfilled.</li>
                    </ul>
                  </div>
                </div>`
            ),
            text: (d) => `Vehicle Shortage Alert\n\nDate: ${d.ride_date}\nTime: ${d.batch_time}\nPending Rides: ${d.ride_count}\nCities: ${d.cities || '—'}\nStates: ${d.states || '—'}\n\nPlease check vehicle availability immediately.\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 6. Partial Scheduling ────────────────────────────────────────── */
        partial_scheduling: {
            subject: (d) => `Partial Ride Scheduling — ${d.ride_date}`,
            html: (d) => html(
                '<title>Partial Ride Scheduling</title>',
                `${header('Fleet Operations', 'Partial Ride Scheduling')}
                <div class="body">
                  <span class="badge badge-amber">Capacity Warning</span>
                  <p class="lead">
                    Some rides could not be scheduled due to limited vehicle capacity.
                    Please review the summary below and take corrective action.
                  </p>
                  <table class="stats" role="presentation" width="100%" cellpadding="0" cellspacing="10">
                    <tr>
                      <td class="stat">
                        <div class="stat-num" style="color:${T.brandMid};">${d.scheduled_count}</div>
                        <div class="stat-lbl">Scheduled</div>
                      </td>
                      <td class="stat">
                        <div class="stat-num" style="color:#991B1B;">${d.pending_count}</div>
                        <div class="stat-lbl">Pending</div>
                      </td>
                      <td class="stat">
                        <div class="stat-num" style="color:${T.goldDark};">${d.available_capacity}</div>
                        <div class="stat-lbl">Available Seats</div>
                      </td>
                    </tr>
                  </table>
                  <div class="card">
                    <div class="card-title">Scheduling Details</div>
                    <div class="row">
                      <span class="row-label">Date</span>
                      <span class="row-value">${d.ride_date}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Batch Time</span>
                      <span class="row-value">${d.batch_time}</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Total Requested</span>
                      <span class="row-value">${d.total_requested} rides</span>
                    </div>
                    <div class="row">
                      <span class="row-label">Locations</span>
                      <span class="row-value">${d.cities}, ${d.states}</span>
                    </div>
                  </div>
                  <div class="notice">
                    <div class="notice-title">Recommended Actions</div>
                    <ul>
                      <li>Add more vehicles to cover the pending rides.</li>
                      <li>Reschedule pending rides to an available slot.</li>
                      <li>Notify affected employees of any delays.</li>
                    </ul>
                  </div>
                </div>`
            ),
            text: (d) => `Partial Ride Scheduling — ${d.ride_date}\n\nScheduled: ${d.scheduled_count}\nPending: ${d.pending_count}\nAvailable Seats: ${d.available_capacity}\n\nDate: ${d.ride_date} | Time: ${d.batch_time}\nTotal Requested: ${d.total_requested} rides\nLocations: ${d.cities}, ${d.states}\n\nPlease add vehicles or reschedule pending rides.\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 7. Ride Manager Approval ─────────────────────────────────────── */
        ride_manager_approval: {
            subject: (d) => `Ride Approval Required — ${d.employee_name}`,
            html: (d) => {
                const isMulti = d.ride_dates && d.ride_dates.length > 1;
                const fmt = (v) => typeof v === 'string' ? v : new Date(v).toISOString().split('T')[0];
                const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                return html(
                    '<title>Ride Approval Required</title>',
                    `${header('Tour Operations', 'Ride Approval Required')}
                    <div class="body">
                      <span class="badge">Action Required</span>
                      <p class="lead">
                        A new ride request has been submitted and requires your approval.
                        Please review the details and respond promptly.
                      </p>
                      <div class="card">
                        <div class="card-title">Ride Details</div>
                        <div class="row">
                          <span class="row-label">Employee</span>
                          <span class="row-value">${d.employee_name}</span>
                        </div>
                        ${isMulti ? `
                        <div class="row">
                          <span class="row-label">Period</span>
                          <span class="row-value">${fmt(d.start_date)} &rarr; ${fmt(d.end_date)}</span>
                        </div>` : `
                        <div class="row">
                          <span class="row-label">Date</span>
                          <span class="row-value">${d.ride_date}</span>
                        </div>`}
                        <div class="row">
                          <span class="row-label">Pickup Time</span>
                          <span class="row-value">${d.pickup_time || '—'}</span>
                        </div>
                        <div class="row">
                          <span class="row-label">Pickup Address</span>
                          <span class="row-value">${d.pickup_address}</span>
                        </div>
                        <div class="row">
                          <span class="row-label">Drop Address</span>
                          <span class="row-value">${d.drop_address}</span>
                        </div>
                        <div class="row">
                          <span class="row-label">Ride Type</span>
                          <span class="row-value">${d.ride_type}</span>
                        </div>
                      </div>
                      ${isMulti ? `
                      <div class="card">
                        <div class="card-title">Scheduled Dates (${d.ride_dates.length} days)</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                          <thead>
                            <tr style="background:${T.brandPrimary};color:#fff;">
                              <th style="padding:10px 14px;text-align:left;font-weight:600;">#</th>
                              <th style="padding:10px 14px;text-align:left;font-weight:600;">Date</th>
                              <th style="padding:10px 14px;text-align:left;font-weight:600;">Day</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${d.ride_dates.map((date, i) => {
                                const obj = new Date(date);
                                return `<tr style="background:${i % 2 === 0 ? T.brandSurface : T.bgCard};">
                                  <td style="padding:9px 14px;border-bottom:1px solid ${T.border};color:${T.textMuted};">${i + 1}</td>
                                  <td style="padding:9px 14px;border-bottom:1px solid ${T.border};color:${T.textPrimary};font-weight:600;">${date}</td>
                                  <td style="padding:9px 14px;border-bottom:1px solid ${T.border};color:${T.brandMid};">${dayNames[obj.getDay()]}</td>
                                </tr>`;
                            }).join('')}
                          </tbody>
                        </table>
                      </div>` : ''}
                      <div class="notice">
                        <div class="notice-title">Action Required</div>
                        <ul>
                          <li>Review the ride details carefully before approving.</li>
                          <li>Approval/rejection links expire after use for security.</li>
                        </ul>
                      </div>
                      <div class="btn-wrap">
                        <a href="${d.approve_url}" class="btn btn-approve" style="color:#FFFFFF !important;">Approve Ride</a>
                        <a href="${d.reject_url}" class="btn btn-reject" style="color:${T.textSecondary} !important;">Reject Ride</a>
                      </div>
                    </div>`
                );
            },
            text: (d) => {
                const isMulti = d.ride_dates && d.ride_dates.length > 1;
                const fmt = (v) => typeof v === 'string' ? v : new Date(v).toISOString().split('T')[0];
                const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                return `Ride Approval Required\n\nHello Manager,\n\nEmployee: ${d.employee_name}\n${isMulti ? `Period: ${fmt(d.start_date)} to ${fmt(d.end_date)}` : `Date: ${d.ride_date}`}\nPickup Time: ${d.pickup_time || '—'}\nPickup: ${d.pickup_address}\nDrop: ${d.drop_address}\nRide Type: ${d.ride_type}\n${isMulti ? `\nScheduled Dates:\n${d.ride_dates.map((date, i) => `${i+1}. ${date} (${dayNames[new Date(date).getDay()]})`).join('\n')}` : ''}\n\nApprove: ${d.approve_url}\nReject: ${d.reject_url}\n\n© ${new Date().getFullYear()} Thai Tour`;
            },
        },

        /* ── 8. VIP Vendor Assignment ─────────────────────────────────────── */
        vip_vendor_assignment: {
            subject: (d) => `New VIP Ride Assignment${d.ride_id ? ` — #${d.ride_id}` : ''}`,
            html: (d) => html(
                '<title>VIP Ride Assignment</title>',
                `${header('VIP Services', 'New Ride Assignment')}
                <div class="body">
                  ${d.ride_id ? `<div style="background:linear-gradient(135deg,${T.brandPrimary},${T.brandMid});color:#fff;text-align:center;padding:14px 24px;border-radius:10px;margin-bottom:24px;font-family:'Playfair Display',serif;font-size:18px;letter-spacing:2px;">Ride #${d.ride_id}</div>` : ''}
                  <p class="greeting">Hello, ${d.vendor_name || 'Partner'}</p>
                  <p class="lead">
                    You have been assigned a new VIP ride. Please review the details carefully
                    and ensure premium, on-time service for your guest.
                  </p>
                  <div class="card">
                    <div class="card-title">Ride Information</div>
                    <div class="row">
                      <span class="row-label">Ride Date</span>
                      <span class="row-value">${d.start_date ? new Date(d.start_date).toLocaleDateString('en-US', {weekday:'short',year:'numeric',month:'short',day:'numeric'}) : '—'}</span>
                    </div>
                    ${d.start_time ? `<div class="row"><span class="row-label">Start Time</span><span class="row-value">${d.start_time}</span></div>` : ''}
                    ${d.end_time   ? `<div class="row"><span class="row-label">End Time</span><span class="row-value">${d.end_time}</span></div>` : ''}
                    ${d.report_time? `<div class="row"><span class="row-label">Report Time</span><span class="row-value">${d.report_time}</span></div>` : ''}
                    ${d.vehicle_type ? `<div class="row"><span class="row-label">Vehicle Type</span><span class="row-value">${d.vehicle_type}</span></div>` : ''}
                    ${d.guest_count  ? `<div class="row"><span class="row-label">Guests</span><span class="row-value">${d.guest_count}</span></div>` : ''}
                    ${d.customer_name? `<div class="row"><span class="row-label">Customer</span><span class="row-value">${d.customer_name}</span></div>` : ''}
                    ${d.company_name ? `<div class="row"><span class="row-label">Company</span><span class="row-value">${d.company_name}</span></div>` : ''}
                  </div>
                  ${(d.pickup_address || d.reporting_address) ? `
                  <div class="card" style="border-left:4px solid ${T.brandLight};">
                    <div class="card-title">Pickup Location</div>
                    <p style="font-size:14px;color:${T.textSecondary};margin:0;">${d.pickup_address || d.reporting_address}</p>
                  </div>` : ''}
                  ${d.drop_address ? `
                  <div class="card" style="border-left:4px solid ${T.gold};">
                    <div class="card-title">Drop Location</div>
                    <p style="font-size:14px;color:${T.textSecondary};margin:0;">${d.drop_address}</p>
                  </div>` : ''}
                  ${(d.from_city || d.to_city) ? `
                  <div class="card">
                    <div class="card-title">Route</div>
                    ${d.from_city ? `<div class="row"><span class="row-label">From</span><span class="row-value">${d.from_city}</span></div>` : ''}
                    ${d.to_city   ? `<div class="row"><span class="row-label">To</span><span class="row-value">${d.to_city}</span></div>` : ''}
                  </div>` : ''}
                  ${(d.remarks || d.operator_notes) ? `
                  <div class="notice">
                    <div class="notice-title">Special Notes</div>
                    <p style="font-size:13px;color:${T.textSecondary};margin:0;">${d.remarks || d.operator_notes}</p>
                  </div>` : ''}
                  <div class="notice" style="background:${T.brandSurface};border-color:${T.brandLight};">
                    <div class="notice-title" style="color:${T.brandPrimary};">Next Steps</div>
                    <ul>
                      <li>Review all ride details before confirming.</li>
                      <li>Assign a suitable vehicle and professional driver.</li>
                      <li>Ensure punctual pickup and courteous service.</li>
                      <li>Contact the customer if any clarification is needed.</li>
                    </ul>
                  </div>
                </div>`
            ),
            text: (d) => `Thai Tour — VIP Ride Assignment${d.ride_id ? ` #${d.ride_id}` : ''}\n\nHello ${d.vendor_name || 'Partner'},\n\nDate: ${d.start_date ? new Date(d.start_date).toLocaleDateString() : '—'}\n${d.start_time ? `Start: ${d.start_time}` : ''}\n${d.end_time ? `End: ${d.end_time}` : ''}\n${d.vehicle_type ? `Vehicle: ${d.vehicle_type}` : ''}\n${d.customer_name ? `Customer: ${d.customer_name}` : ''}\nPickup: ${d.pickup_address || d.reporting_address || '—'}\nDrop: ${d.drop_address || '—'}\n${d.from_city ? `Route: ${d.from_city} → ${d.to_city || '—'}` : ''}\n${d.remarks || d.operator_notes ? `Notes: ${d.remarks || d.operator_notes}` : ''}\n\n© ${new Date().getFullYear()} Thai Tour`,
        },

        /* ── 9. VIP Ride Start / End OTP ──────────────────────────────────── */
        vip_ride_start_otp: {
            subject: (d) => `Your Ride ${d.otp_type === 'start' ? 'Start' : 'End'} OTP — Thai Tour`,
            html: (d) => {
                const action = d.otp_type === 'start' ? 'start' : 'complete';
                const label  = d.otp_type === 'start' ? 'Ride Start' : 'Ride End';
                return html(
                    `<title>${label} OTP</title>`,
                    `${header('VIP Services', `${label} Verification`)}
                    <div class="body">
                      <p class="greeting">Hello, ${d.customer_name || 'Valued Guest'}</p>
                      <p class="lead">
                        Your ride is ready to <strong>${action}</strong>. Share the OTP below with
                        your driver to ${action} your journey.
                      </p>
                      <div class="card">
                        <div class="card-title">Booking Details</div>
                        <div class="row">
                          <span class="row-label">Booking ID</span>
                          <span class="row-value">#${d.booking_id || '—'}</span>
                        </div>
                        <div class="row">
                          <span class="row-label">Customer</span>
                          <span class="row-value">${d.customer_name || '—'}</span>
                        </div>
                        ${d.customer_mobile ? `<div class="row"><span class="row-label">Contact</span><span class="row-value">${d.customer_mobile}</span></div>` : ''}
                        <div class="row">
                          <span class="row-label">Ride Date</span>
                          <span class="row-value">${d.start_date ? new Date(d.start_date).toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'}) : '—'}</span>
                        </div>
                        <div class="row">
                          <span class="row-label">Pickup Time</span>
                          <span class="row-value">${d.start_time || '—'}</span>
                        </div>
                        ${d.end_time ? `<div class="row"><span class="row-label">Drop Time</span><span class="row-value">${d.end_time}</span></div>` : ''}
                        ${(d.from_city || d.to_city) ? `<div class="row"><span class="row-label">Route</span><span class="row-value">${d.from_city || '—'} &rarr; ${d.to_city || '—'}</span></div>` : ''}
                        ${d.pickup_address ? `<div class="row"><span class="row-label">Pickup</span><span class="row-value">${d.pickup_address}</span></div>` : ''}
                        ${d.drop_address   ? `<div class="row"><span class="row-label">Drop</span><span class="row-value">${d.drop_address}</span></div>` : ''}
                        ${d.vehicle_number ? `<div class="row"><span class="row-label">Vehicle</span><span class="row-value">${d.vehicle_number}${d.vehicle_model ? ` — ${d.vehicle_model}` : ''}</span></div>` : ''}
                        ${d.driver_name    ? `<div class="row"><span class="row-label">Driver</span><span class="row-value">${d.driver_name}${d.driver_mobile ? ` (${d.driver_mobile})` : ''}</span></div>` : ''}
                      </div>
                      <div class="otp-wrap">
                        <div class="otp-label">Share this code with your driver</div>
                        <div class="otp-box">
                          <div class="otp-code">${d.otp}</div>
                          <div class="otp-expiry">${label} verification code</div>
                        </div>
                      </div>
                      <div class="notice">
                        <div class="notice-title">Important</div>
                        <ul>
                          <li>Share this OTP <strong>only</strong> with your assigned driver.</li>
                          <li>Verify driver details before sharing.</li>
                          <li>This code is required to ${action} your ride.</li>
                        </ul>
                      </div>
                    </div>`
                );
            },
            text: (d) => {
                const action = d.otp_type === 'start' ? 'start' : 'complete';
                return `Thai Tour — Ride ${d.otp_type === 'start' ? 'Start' : 'End'} OTP\n\nHello ${d.customer_name || 'Guest'},\n\nYour ride is ready to ${action}.\n\nBooking: #${d.booking_id || '—'}\nDate: ${d.start_date ? new Date(d.start_date).toLocaleDateString() : '—'}\nPickup: ${d.start_time || '—'}\n${d.from_city ? `Route: ${d.from_city} → ${d.to_city || '—'}` : ''}\n${d.driver_name ? `Driver: ${d.driver_name}` : ''}\n\nYour OTP: ${d.otp}\n\nShare only with your assigned driver.\n\n© ${new Date().getFullYear()} Thai Tour`;
            },
        },

        /* ── 10. Default / Generic ────────────────────────────────────────── */
        default: {
            subject: (d) => d.subject || 'Notification from Thai Tour',
            html: (d) => html(
                '<title>Thai Tour Notification</title>',
                `${header('Notification', '')}
                <div class="body">
                  <p class="greeting">Hello, ${d.employee_name || 'Traveller'}</p>
                  <p class="lead">${d.message || 'You have received a notification from Thai Tour.'}</p>
                  ${d.additional_content ? `<div class="card"><p style="font-size:14px;color:${T.textSecondary};margin:0;">${d.additional_content}</p></div>` : ''}
                </div>`
            ),
            text: (d) => `Thai Tour Notification\n\nHello ${d.employee_name || 'Traveller'},\n\n${d.message || 'You have received a notification from Thai Tour.'}\n\n${d.additional_content || ''}\n\n© ${new Date().getFullYear()} Thai Tour`,
        },
    },

    settings: {
        defaultTimeout: 30000,
        retryAttempts:  3,
        retryDelay:     2000,
        enableLogging:  true,
        logLevel:       'info',
    },
};

module.exports = emailConfig;
