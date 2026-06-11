'use strict';

// ── User ──────────────────────────────────────────────────────────
const ROLE = {
  USER:       'user',
  ADMIN:      'admin',
  SUPERADMIN: 'superadmin',
};

// ── Inquiry ───────────────────────────────────────────────────────
const INQUIRY_STATUS = {
  NEW:              'new',
  CONTACTED:        'contacted',
  CONFIRMED:        'confirmed',
  PAYMENT_PENDING:  'payment_pending',
  PAYMENT_RECEIVED: 'payment_received',
  IN_PROGRESS:      'in_progress',
  COMPLETED:        'completed',
  CANCELLED:        'cancelled',
};

const PAYMENT_STATUS = {
  UNPAID:  'unpaid',
  PARTIAL: 'partial',
  PAID:    'paid',
};

const PAYMENT_METHOD = {
  UPI:          'upi',
  CASH:         'cash',
  BANK_TRANSFER:'bank_transfer',
  CHEQUE:       'cheque',
  OTHER:        'other',
};

// ── Review ────────────────────────────────────────────────────────
const REVIEW_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const TRAVEL_TYPE = {
  SOLO:     'solo',
  COUPLE:   'couple',
  FAMILY:   'family',
  FRIENDS:  'friends',
  BUSINESS: 'business',
};

// ── Thailand Cities ───────────────────────────────────────────────
const THAILAND_CITY = {
  1: 'bangkok',
  2: 'phuket',
  3: 'pattaya',
  4: 'chiang_mai',
  5: 'koh_samui',
};

// ── Service ───────────────────────────────────────────────────────
const SERVICE_AVAILABILITY = {
  AVAILABLE:   'available',
  LIMITED:     'limited',
  UNAVAILABLE: 'unavailable',
};

const DURATION_UNIT = {
  HOURS:  'hours',
  DAYS:   'days',
  NIGHTS: 'nights',
};

// ── Coupon ────────────────────────────────────────────────────────
const COUPON_TYPE = {
  FLAT:       'flat',
  PERCENTAGE: 'percentage',
};

// ── Contact ───────────────────────────────────────────────────────
const CONTACT_SOURCE = {
  CONTACT_PAGE: 'contact_page',
  SERVICE_PAGE: 'service_page',
  CHAT_WIDGET:  'chat_widget',
};

const CONTACT_STATUS = {
  UNREAD:   'unread',
  READ:     'read',
  REPLIED:  'replied',
  ARCHIVED: 'archived',
};

// ── Notification ──────────────────────────────────────────────────
const NOTIFICATION_TYPE = {
  INQUIRY_SUBMITTED:    'inquiry_submitted',
  INQUIRY_STATUS_UPDATE:'inquiry_status_update',
  PAYMENT_RECEIVED:     'payment_received',
  REVIEW_APPROVED:      'review_approved',
  REVIEW_REJECTED:      'review_rejected',
  ADMIN_REVIEW_REPLY:   'admin_review_reply',
  NEW_CATEGORY:         'new_category',
  NEW_SERVICE:          'new_service',
  BROADCAST:            'broadcast',
  SYSTEM:               'system',
};

// ── HTTP ──────────────────────────────────────────────────────────
const HTTP_CODES = {
  OK:                   200,
  CREATED:              201,
  NO_CONTENT:           204,
  BAD_REQUEST:          400,
  UNAUTHORIZED:         401,
  FORBIDDEN:            403,
  NOT_FOUND:            404,
  CONFLICT:             409,
  VALIDATION_ERROR:     422,
  TOO_MANY_REQUESTS:    429,
  INTERNAL_SERVER_ERROR:500,
};

module.exports = {
  ROLE,
  THAILAND_CITY,
  INQUIRY_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  REVIEW_STATUS,
  TRAVEL_TYPE,
  SERVICE_AVAILABILITY,
  DURATION_UNIT,
  COUPON_TYPE,
  CONTACT_SOURCE,
  CONTACT_STATUS,
  NOTIFICATION_TYPE,
  HTTP_CODES,
};
