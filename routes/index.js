const express = require('express');
const API_response = require('../helpers/api.response.helper');
const roleRoute = require('./role.routes');
const userRoute = require('./user.routes');
const companyRoute = require('./company.routes');
const companyBranchRoute = require('./company_branch.routes');
const vehicleRoute = require('./vehicle.routes');
const companyEmployeeRoute = require('./company_employee.routes');
// const companyRuleRoute = require('./company_rule.routes');
const driverRoute = require('./driver.routes');
const vendorRoute = require('./vendor.routes'); // Assuming you have a vendor route
// const vehicleDriverVendorMapRoute = require('./vehicle_driver_vendor_map.routes');
const vehicleBrandRoute = require('./vehicle_brand.routes');
const vehicleModelRoute = require('./vehicle_model.routes');
const stateRoute = require('./state.routes');
const cityRoute = require('./city.routes');
const adminRoute = require('./admin.routes');
const branchShiftRoute = require('./branch_shift.routes');
const employeeRideRoute = require('./employee_ride.routes');
const rideMasterRoute = require('./ride_master.routes');
const fileUploadRoute = require('./file.upload.routes');
const empRideReviewRoute = require('./emp_ride_review.routes');
const streamChatRoute = require('./stream_chat.routes');
const vipRideRoute = require('./vip_ride.routes');
const vipRideDutyRoute = require('./vip_ride_duty.routes');
const vipCustomerRoute = require('./vip_customer.routes');
const vipVehicleBrandRoute = require('./vip_vehicle_brand.routes');
const vipVehicleModelRoute = require('./vip_vehicle_model.routes');
const vipVehicleMasterRoute = require('./vip_vehicle_master.routes');
const vipDriverMasterRoute = require('./vip_driver_master.routes');
const vipRideBookingRoute = require('./vip_ride_booking.routes');
const companyDutySettingRoute = require('./company_duty_setting.routes');
const notificationRoute = require('./notification.routes');
const sosAlertRoute = require('./sos_alert.routes');
const garageRoute = require('./garage.routes');
// const recurringEmployeeRideRoute = require('./recurring_employee_ride.routes');

const router = express.Router();

router.use('/role', roleRoute); // Role Routes
router.use('/user', userRoute); // User Routes
router.use('/company', companyRoute); // Company Routes
router.use('/company-branch', companyBranchRoute); // Company Branch Routes 
router.use('/vehicle', vehicleRoute); // Vehicle Routes
router.use('/company-employee', companyEmployeeRoute); // Company Employee Routes
router.use('/driver', driverRoute); // Driver Routes
router.use('/vendor', vendorRoute); // Vendor Routes
router.use('/vehicle-brand', vehicleBrandRoute); // Vehicle Brand Routes
router.use('/vehicle-model', vehicleModelRoute); // Vehicle Model Routes
router.use('/state', stateRoute); // State Routes
router.use('/city', cityRoute); // City Routes
router.use('/admin', adminRoute); // Admin Routes (dashboard)
router.use('/branch-shift', branchShiftRoute); // Branch Shift Routes
router.use('/employee-ride', employeeRideRoute); // Employee Ride Routes
router.use('/ride', rideMasterRoute); // Ride Master Routes
router.use('/upload', fileUploadRoute); // File Upload Routes
router.use('/emp-ride-review', empRideReviewRoute); // Emp Ride Review Routes
router.use('/stream-chat', streamChatRoute); // Stream Chat Routes
router.use('/vip-ride', vipRideRoute); // VIP Ride Routes
router.use('/vip-ride-duty', vipRideDutyRoute); // VIP Ride Duty Routes
router.use('/vip-customer', vipCustomerRoute); // VIP Customer Routes
router.use('/vip-vehicle-brand', vipVehicleBrandRoute); // VIP Vehicle Brand Routes
router.use('/vip-vehicle-model', vipVehicleModelRoute); // VIP Vehicle Model Routes
router.use('/vip-vehicle', vipVehicleMasterRoute); // VIP Vehicle Master Routes
router.use('/vip-driver', vipDriverMasterRoute); // VIP Driver Master Routes
router.use('/vip-ride-booking', vipRideBookingRoute); // VIP Ride Booking Routes
router.use('/company-duty-setting', companyDutySettingRoute); // Company Duty Setting Routes
router.use('/notification', notificationRoute); // Notification Routes
router.use('/sos-alert', sosAlertRoute); // SOS Alert Routes
router.use('/garage', garageRoute); // Garage Routes
// router.use('/recurring-employee-ride', recurringEmployeeRideRoute); // Recurring Employee Ride Routes



// Root Route
router.get('/', async (_, res) => {
    return API_response.OK({ res, message: `Welcome to the FleetIQ backend apis!` });
});

// Wrong Route (fallback)
router.use((_, res) => {
    return API_response.NOT_FOUND({ res, message: `Oops! Looks like you're lost.` });
});

module.exports = router;
