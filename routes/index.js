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


router.use('/roles',         roleRoutes);
router.use('/cities',        cityRoutes);
router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/inquiries',     inquiryRoutes);
router.use('/reviews',       reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/categories',   categoryRoutes);
router.use('/services',     serviceRoutes);
router.use('/coupons',      couponRoutes);
router.use('/banners',      bannerRoutes);
router.use('/upload',       uploadRoutes);
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
