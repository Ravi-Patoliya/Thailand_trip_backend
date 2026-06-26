const express = require('express');
const API_response = require('../helpers/api.response.helper');
const roleRoute = require('./role.routes');
const userRoute = require('./user.routes');
const stateRoute = require('./state.routes');
const cityRoute = require('./city.routes');
const adminRoute = require('./admin.routes');
const fileUploadRoute = require('./file.upload.routes');
const notificationRoute = require('./notification.routes');

const router = express.Router();

router.use('/role', roleRoute); // Role Routes
router.use('/user', userRoute); // User Routes
router.use('/state', stateRoute); // State Routes
router.use('/city', cityRoute); // City Routes
router.use('/admin', adminRoute); // Admin Routes (dashboard)
router.use('/upload', fileUploadRoute); // File Upload Routes
router.use('/notification', notificationRoute); // Notification Routes




// Root Route
router.get('/', async (_, res) => {
    return API_response.OK({ res, message: `Welcome to the FleetIQ backend apis!` });
});

// Wrong Route (fallback)
router.use((_, res) => {
    return API_response.NOT_FOUND({ res, message: `Oops! Looks like you're lost.` });
});

module.exports = router;
