const express = require('express');
const API_response = require('../helpers/api.response.helper');

const roleRoutes          = require('./role.routes');
const cityRoutes          = require('./city.routes');
const authRoutes          = require('./auth.routes');
const userRoutes          = require('./user.routes');
const inquiryRoutes       = require('./inquiry.routes');
const reviewRoutes        = require('./review.routes');
const notificationRoutes  = require('./notification.routes');
const categoryRoutes      = require('./category.routes');
const serviceRoutes       = require('./service.routes');
const couponRoutes        = require('./coupon.routes');
const bannerRoutes        = require('./banner.routes');
const uploadRoutes        = require('./upload.routes');

const router = express.Router();

//---------


router.use('/api/roles',         roleRoutes);
router.use('/api/cities',        cityRoutes);
router.use('/api/auth',          authRoutes);
router.use('/api/users',         userRoutes);
router.use('/api/inquiries',     inquiryRoutes);
router.use('/api/reviews',       reviewRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/categories',   categoryRoutes);
router.use('/api/services',     serviceRoutes);
router.use('/api/coupons',      couponRoutes);
router.use('/api/banners',      bannerRoutes);
router.use('/api/upload',       uploadRoutes);
//---------




// Root Route
router.get('/health', async (_, res) => {
  res.json({
    status:  'ok',
    service: 'Thailand Tour API',
    env:     process.env.NODE_ENV,
    ts:      new Date().toISOString(),
  });
});

// Wrong Route (fallback)
router.use((_, res) => {
    return API_response.NOT_FOUND({ res, message: `Oops! Looks like you're lost.` });
});

module.exports = router;
