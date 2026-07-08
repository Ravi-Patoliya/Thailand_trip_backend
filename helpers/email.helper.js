'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp, opts = {}) => {
  const subject = opts.subject || 'Your Thai Tour OTP Code';
  const purpose = opts.purpose || 'verification';
  await transporter.sendMail({
    from:    `Thai Tour <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    text:    `Your Thai Tour OTP for ${purpose}: ${otp}\nExpires in 5 minutes.\n\nDo not share this code with anyone.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#F7F3ED;font-family:Inter,Helvetica,Arial,sans-serif;}
  .w{max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 32px rgba(13,38,24,0.12);}
  .h{background:linear-gradient(145deg,#0D2618,#1C3D2E 55%,#2E6B4A);padding:36px 28px 28px;text-align:center;position:relative;}
  .h::after{content:'';display:block;position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#F0BE5C,#D4A017,#F0BE5C);}
  .logo{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0BE5C;letter-spacing:2px;}
  .sub{font-size:11px;color:rgba(234,244,238,0.7);letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;}
  .b{padding:36px 32px;}
  .otp-box{background:linear-gradient(145deg,#EAF4EE,#EFE9E0);border:2px solid #F0BE5C;border-radius:12px;text-align:center;padding:26px 36px;margin:28px 0;}
  .otp{font-family:'Courier New',monospace;font-size:40px;font-weight:700;color:#1C3D2E;letter-spacing:10px;line-height:1;}
  .exp{font-size:12px;color:#D4A017;font-weight:600;margin-top:12px;}
  .lead{font-size:14px;color:#4A3F35;line-height:1.75;}
  .ftr{background:#0D2618;padding:24px;text-align:center;font-size:11px;color:rgba(234,244,238,0.5);}
  .ftr-brand{font-family:Georgia,serif;font-size:14px;color:#F0BE5C;letter-spacing:2px;margin-bottom:6px;}
</style></head>
<body>
<div class="w">
  <div class="h"><div class="logo">Thai Tour</div><div class="sub">Account Security</div></div>
  <div class="b">
    <p class="lead">Your one-time code for <strong>${purpose}</strong>:</p>
    <div class="otp-box">
      <div class="otp">${otp}</div>
      <div class="exp">Expires in 5 minutes</div>
    </div>
    <p class="lead" style="font-size:12px;color:#9B8B79;">Do not share this code with anyone. Thai Tour staff will never ask for your OTP.</p>
  </div>
  <div class="ftr"><div class="ftr-brand">Thai Tour</div>&copy; ${new Date().getFullYear()} Thai Tour &middot; Automated message, do not reply.</div>
</div>
</body></html>`,
  });
};

const sendInquiryAdminAlert = async (adminRecipients, inquiry) => {
  if (!adminRecipients || adminRecipients.length === 0) return;

  const contact  = inquiry.contactSnapshot || {};
  const services = inquiry.services || [];
  const fmt      = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const serviceRows = services.map((s, i) =>
    `<tr style="background:${i % 2 === 0 ? '#EAF4EE' : '#FFFFFF'};">
      <td style="padding:9px 14px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#1A1A1A;font-weight:600;">${s.serviceTitle || '—'}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#4A3F35;text-align:center;">${s.priceTierLabel || '—'}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#4A3F35;text-align:center;">${s.quantity || 1}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#1C3D2E;font-weight:700;text-align:right;">${currency(s.subtotal)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#F7F3ED;font-family:Inter,Helvetica,Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:620px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(13,38,24,0.13);}
  .hdr{background:linear-gradient(145deg,#0D2618 0%,#1C3D2E 55%,#2E6B4A 100%);padding:40px 32px 32px;text-align:center;position:relative;}
  .hdr::after{content:'';display:block;position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#F0BE5C,#D4A017,#F0BE5C);}
  .hdr-logo{font-family:Georgia,serif;font-size:26px;font-weight:700;color:#F0BE5C;letter-spacing:2px;margin-bottom:6px;}
  .hdr-sub{font-size:13px;color:rgba(234,244,238,0.75);letter-spacing:1.5px;text-transform:uppercase;}
  .hdr-title{font-size:22px;font-weight:600;color:#FFFFFF;margin-top:18px;line-height:1.3;}
  .alert-bar{background:linear-gradient(90deg,#F0BE5C,#D4A017);padding:12px 32px;text-align:center;font-size:13px;font-weight:700;color:#0D2618;letter-spacing:1px;text-transform:uppercase;}
  .body{padding:40px 36px;}
  .ref{display:inline-block;background:#0D2618;color:#F0BE5C;font-family:'Courier New',monospace;font-size:15px;font-weight:700;padding:8px 20px;border-radius:8px;letter-spacing:2px;margin-bottom:28px;}
  .section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#2E6B4A;font-weight:700;margin:28px 0 12px;padding-bottom:8px;border-bottom:2px solid #EAF4EE;}
  .card{background:#EAF4EE;border:1px solid #E8E0D4;border-radius:10px;overflow:hidden;margin-bottom:20px;}
  .row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 16px;border-bottom:1px solid #E8E0D4;}
  .row:last-child{border-bottom:none;}
  .row-label{font-size:13px;color:#9B8B79;font-weight:500;flex:0 0 44%;}
  .row-value{font-size:13px;color:#1A1A1A;font-weight:600;text-align:right;flex:1;}
  .totals-card{background:#0D2618;border-radius:10px;padding:20px 24px;margin-top:20px;}
  .total-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);}
  .total-row:last-child{border-bottom:none;padding-top:12px;margin-top:6px;border-top:1px solid #F0BE5C;}
  .total-label{font-size:13px;color:rgba(234,244,238,0.65);}
  .total-value{font-size:13px;color:#EAF4EE;font-weight:600;}
  .grand-label{font-size:15px;color:#F0BE5C;font-weight:700;}
  .grand-value{font-size:18px;color:#F0BE5C;font-weight:700;}
  .notice{background:#FFF9EE;border-left:4px solid #F0BE5C;border-radius:0 8px 8px 0;padding:16px 20px;margin-top:24px;font-size:13px;color:#4A3F35;line-height:1.7;}
  .ftr{background:#0D2618;padding:28px 32px;text-align:center;}
  .ftr-brand{font-family:Georgia,serif;font-size:16px;color:#F0BE5C;letter-spacing:2px;margin-bottom:8px;}
  .ftr-line{width:48px;height:2px;background:#F0BE5C;margin:10px auto;}
  .ftr-text{font-size:11px;color:rgba(234,244,238,0.5);line-height:1.8;}
  @media(max-width:600px){
    .wrap{margin:0;border-radius:0;}
    .body{padding:28px 20px;}
    .row{flex-direction:column;}
    .row-value{text-align:left;margin-top:3px;}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-logo">Thai Tour</div>
    <div class="hdr-sub">Admin Notification</div>
    <div class="hdr-title">New Inquiry Received</div>
  </div>
  <div class="alert-bar">Action Required — New Booking Inquiry</div>
  <div class="body">
    <div style="text-align:center;margin-bottom:24px;">
      <span class="ref">#${inquiry.referenceNumber || inquiry._id}</span>
    </div>

    <div class="section-title">Contact Information</div>
    <div class="card">
      <div class="row"><span class="row-label">Name</span><span class="row-value">${contact.name || '—'}</span></div>
      <div class="row"><span class="row-label">Email</span><span class="row-value">${contact.email || '—'}</span></div>
      <div class="row"><span class="row-label">Mobile</span><span class="row-value">${contact.mobile || '—'}</span></div>
      ${contact.whatsapp ? `<div class="row"><span class="row-label">WhatsApp</span><span class="row-value">${contact.whatsapp}</span></div>` : ''}
    </div>

    <div class="section-title">Travel Details</div>
    <div class="card">
      <div class="row"><span class="row-label">Travel Date</span><span class="row-value">${fmt(inquiry.travelDate)}</span></div>
      <div class="row"><span class="row-label">Return Date</span><span class="row-value">${fmt(inquiry.returnDate)}</span></div>
      <div class="row"><span class="row-label">Adults</span><span class="row-value">${inquiry.adults || 1}</span></div>
      <div class="row"><span class="row-label">Children</span><span class="row-value">${inquiry.children || 0}</span></div>
      ${inquiry.specialRequests ? `<div class="row"><span class="row-label">Special Requests</span><span class="row-value" style="font-style:italic;">${inquiry.specialRequests}</span></div>` : ''}
    </div>

    <div class="section-title">Services Requested</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #E8E0D4;">
      <thead>
        <tr style="background:#1C3D2E;color:#fff;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:0.5px;">Service</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px;">Tier</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600;letter-spacing:0.5px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${serviceRows}</tbody>
    </table>

    <div class="totals-card">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-value">${currency(inquiry.subtotal)}</span>
      </div>
      ${(inquiry.discountAmount > 0) ? `
      <div class="total-row">
        <span class="total-label">Discount${inquiry.couponCode ? ` (${inquiry.couponCode})` : ''}</span>
        <span class="total-value" style="color:#4ADE80;">− ${currency(inquiry.discountAmount)}</span>
      </div>` : ''}
      <div class="total-row">
        <span class="grand-label">Total Amount</span>
        <span class="grand-value">${currency(inquiry.totalAmount)}</span>
      </div>
    </div>

    <div class="notice">
      Please log in to the admin panel to review this inquiry, contact the customer, and update the status accordingly.
    </div>
  </div>
  <div class="ftr">
    <div class="ftr-brand">Thai Tour</div>
    <div class="ftr-line"></div>
    <div class="ftr-text">This is an automated alert — do not reply.<br>&copy; ${new Date().getFullYear()} Thai Tour &middot; Crafting Unforgettable Journeys</div>
  </div>
</div>
</body>
</html>`;

  const toList = adminRecipients.map(a => a.email).join(', ');
  await transporter.sendMail({
    from:    `Thai Tour <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to:      toList,
    subject: `New Inquiry #${inquiry.referenceNumber || inquiry._id} — ${contact.name || 'Guest'} · ${fmt(inquiry.travelDate)}`,
    text:    `New Inquiry Alert\n\nRef: #${inquiry.referenceNumber || inquiry._id}\nContact: ${contact.name || '—'} | ${contact.email || '—'} | ${contact.mobile || '—'}\nTravel: ${fmt(inquiry.travelDate)} → ${fmt(inquiry.returnDate)}\nGuests: ${inquiry.adults || 1} adults, ${inquiry.children || 0} children\nTotal: ${currency(inquiry.totalAmount)}\n\nPlease review this inquiry in the admin panel.\n\n© ${new Date().getFullYear()} Thai Tour`,
    html,
  });
};

module.exports = { sendOtpEmail, sendInquiryAdminAlert };
