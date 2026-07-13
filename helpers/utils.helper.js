const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const config = require('../config/env.config');
const emailConfig = require('../config/email.config');
const axios = require('axios');
const nodemailer = require('nodemailer');
const enums = require('../constants/enums');
const logger = require('./logger.helper');

//* Create a helper function with different services
// Module-level flag for normalizeToLngLat warning state
let _normalizeToLngLat_warned = false;

const helper = {
    //? Create hash password function
    hash_password: async ({ password }) => {
        const salt = await bcrypt.genSalt(10);
        const hashed_password = await bcrypt.hash(password, salt);
        return hashed_password;
    },

    //? Make generate JWT token function
    generate_token: async ({ data, expiresIn }) => {
        let token;
        if (expiresIn) {
            token = await JWT.sign(data, config.jwt.secret, { expiresIn: expiresIn });
        } else {
            token = await JWT.sign(data, config.jwt.secret);
        }
        return token;
    },

    //? Make decode JWT token function
    decode_token: async ({ token }) => {
        const decoded = await JWT.verify(token, config.jwt.secret);
        return decoded;
    },

    //? Compare hash password function
    compare_password: async ({ password, hashed_password }) => {
        const isMatch = await bcrypt.compare(password, hashed_password);
        return isMatch;
    },

    //? Generate approval token with expiry
    generate_approval_token: ({ ride_id, action, expiresIn = '7d' }) => {
        const token = JWT.sign(
            { ride_id, action, type: 'approval' },
            config.jwt.secret,
            { expiresIn }
        );
        return token;
    },

    //? Verify approval token
    verify_approval_token: ({ token }) => {
        try {
            const decoded = JWT.verify(token, config.jwt.secret);
            if (decoded.type !== 'approval') {
                throw new Error('Invalid token type');
            }
            return { success: true, data: decoded };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    //* Send OTP using twilio in non-china region
    sendMobileOtp: async ({ mobilePrefix = "91", mobileNo, OTP } = {}) => {
        try {
            const config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "api-key": process.env.MSG_AUTH_KEY,
                },
            };
            logger.info("DEBUG: Sending OTP to mobile:", `${mobilePrefix}${mobileNo}`);
            const data = new URLSearchParams();
            data.append("to", `${mobilePrefix}${mobileNo}`);
            data.append("sender", process.env.MSG_SENDER_ID || "PLIXRT");
            data.append("source", "API");
            data.append(
                "body",
                `${OTP} is your login OTP for Rentop.in by Plixr technologies Pvt. Ltd.`
            );
            data.append("template_id", process.env.MSG_TEMPLATE_ID);
            data.append("type", "OTP");

            const response = await Promise.race([
                axios.post(process.env.MSG_API, data, config),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('SMS timeout')), 10000)
                )
            ]);
            return response.data;
        } catch (error) {
            logger.error(`DEBUG: SMS error: ${error}`);
            return null;
        }
    },

    //* Send email using SMTP with configurable templates
    send_mail: async ({ to, eventTrigger = 'default', data = {} }) => {
        try {
            // Create SMTP transporter using config
            const transporter = nodemailer.createTransport(emailConfig.smtp);

            // Get template based on event trigger
            const template = emailConfig.templates[eventTrigger] || emailConfig.templates.default;

            // Generate email content using template functions
            const subject = typeof template.subject === 'function'
                ? template.subject(data)
                : template.subject || 'Notification from FleetIQ';

            const htmlContent = typeof template.html === 'function'
                ? template.html(data)
                : template.html || '<p>Default email content</p>';

            const textContent = typeof template.text === 'function'
                ? template.text(data)
                : template.text || 'Default email content';

            // Email options
            const mailOptions = {
                from: `"${emailConfig.sender.name}" <${emailConfig.sender.email}>`,
                to: to,
                subject: subject,
                text: textContent,
                html: htmlContent,
            };

            // Send email with timeout and retry logic
            const sendWithRetry = async (attempt = 1) => {
                try {
                    const info = await Promise.race([
                        transporter.sendMail(mailOptions),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Email timeout')), emailConfig.settings.defaultTimeout)
                        )
                    ]);

                    if (emailConfig.settings.enableLogging) {
                        logger.info('Email sent successfully:', {
                            messageId: info.messageId,
                            to: to,
                            subject: subject,
                            eventTrigger: eventTrigger,
                            attempt: attempt
                        });
                    }

                    return {
                        success: true,
                        messageId: info.messageId,
                        to: to,
                        subject: subject,
                        eventTrigger: eventTrigger,
                        response: info.response
                    };

                } catch (error) {
                    if (attempt < emailConfig.settings.retryAttempts) {
                        logger.warn(`Email send attempt ${attempt} failed, retrying...`, error.message);
                        await new Promise(resolve => setTimeout(resolve, emailConfig.settings.retryDelay));
                        return sendWithRetry(attempt + 1);
                    }
                    throw error;
                }
            };

            return await sendWithRetry();

        } catch (error) {
            logger.error(`Email sending failed after all retries:,${{
                error: error.message,
                to: to,
                eventTrigger: eventTrigger,
                stack: error.stack
            }}`);

            return {
                success: false,
                error: error.message,
                to: to,
                eventTrigger: eventTrigger
            };
        }
    },

    //* Generate log records from data changes
    generate_log_records: async (existing_data, updated_data, user_id) => {
        const log_records_to_create = [];

        for (const key of Object.keys(updated_data)) {
            const existing_value = existing_data[key];
            const updated_value = updated_data[key];

            if (existing_value !== updated_value) {
                const logRecord = {
                    id: user_id,
                    updated_by: user_id,
                    variable: key,
                    inital_value: key === 'password' ? null : existing_value || null,
                    final_value: key === 'password' ? null : updated_value || null,
                };

                log_records_to_create.push(logRecord);
            }
        }

        return log_records_to_create;
    },

    //* Generate secure OTP
    generate_otp: (length = 4) => {
        const digits = '0123456789';
        const nonZeroDigits = '123456789';
        let otp = '';

        // First digit should not be 0
        otp += nonZeroDigits[Math.floor(Math.random() * nonZeroDigits.length)];

        // Rest of the digits can be any digit including 0
        for (let i = 1; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }

        return otp;
    },

    //* find ride date
    find_ride_date: (start_date, recurrence_days = []) => {
        const startDate = new Date(start_date);
        const startDay = startDate.getDay(); // 0 (Sun) to 6 (Sat)

        // Convert recurrence_days (e.g., ['MONDAY', 'FRIDAY']) to numbers [1, 5]
        const recurrenceDays = recurrence_days.map(day => enums.WEEK_DAYS[day.toUpperCase()]);

        // Sort recurrence days in ascending order
        recurrenceDays.sort((a, b) => a - b);

        // Find the next recurrence day >= start day
        for (let i = 0; i < recurrenceDays.length; i++) {
            const diff = recurrenceDays[i] - startDay;
            if (diff >= 0) {
                const nextDate = new Date(startDate);
                nextDate.setDate(startDate.getDate() + diff);
                return nextDate.toISOString().split('T')[0];
            }
        }

        const nextWeekDiff = 7 - startDay + recurrenceDays[0];
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + nextWeekDiff);
        logger.info("DEBUG: Next ride date:", nextDate.toISOString().split('T')[0]);
        return nextDate.toISOString().split('T')[0];
    },

    //* Calculate all ride dates between start and end date based on recurrence days
    calculateRideDates: (startDate, endDate, recurrenceDays) => {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Convert recurrence days to day numbers (0=Sunday, 1=Monday, etc.)
        const dayMap = {
            'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
            'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };
        
        const recurrenceDayNumbers = recurrenceDays.map(day => 
            typeof day === 'string' ? dayMap[day.toUpperCase()] : day
        );
        
        // Iterate through each day from start to end
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const dayNumber = currentDate.getDay();
            if (recurrenceDayNumbers.includes(dayNumber)) {
                dates.push(currentDate.toISOString().split('T')[0]);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    },

    //? Time validation utilities
    parseTimeToMinutes: (timeString) => {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    },

    validateTimeOrder: (startTime, endTime) => {
        if (!startTime || !endTime) return true; // Skip validation if either time is missing
        const startMinutes = helper.parseTimeToMinutes(startTime);
        const endMinutes = helper.parseTimeToMinutes(endTime);
        return endMinutes > startMinutes;
    },

    validateDateNotInPast: (dateString) => {
        if (!dateString) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(dateString);
        inputDate.setHours(0, 0, 0, 0);
        return inputDate >= today;
    },

    validateDateOrder: (startDate, endDate) => {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return end >= start;
    },

    // Add minutes to HH:MM time string and return HH:MM (wraps within 24h)
    addMinutesToTime: (timeStr, mins) => {
        if (!timeStr) return null;
        const [hours, minutes] = String(timeStr).split(':').map(v => Number(v) || 0);
        let total = hours * 60 + minutes + Number(mins || 0);
        // wrap within 24 hours
        total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
        const nh = String(Math.floor(total / 60)).padStart(2, '0');
        const nm = String(total % 60).padStart(2, '0');
        return `${nh}:${nm}`;
    },

    // Normalize a location object { lat, lng } -> GeoJSON Point format for PostgreSQL GEOGRAPHY type
    normalizeLocation: (loc) => {
        if (!loc) return null;
        const lat = loc.lat != null ? Number(loc.lat) : null;
        const lng = loc.lng != null ? Number(loc.lng) : null;
        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
        // Return GeoJSON Point format required by PostgreSQL GEOGRAPHY type
        return { type: 'Point', coordinates: [lng, lat] };
    },

    normalizeToLngLat: (arr) => {
        if (!Array.isArray(arr) || arr.length !== 2) return null;
        const a = Number(arr[0]); const b = Number(arr[1]);
        if (!isFinite(a) || !isFinite(b)) return null;
        const mode = (process.env.COORD_ORDER || 'auto').toLowerCase();
        if (mode === 'lnglat') return [a, b];
        if (mode === 'latlng') return [b, a];
        // auto heuristics: if first value magnitude > 90, it's likely longitude (swap to [lng,lat] if needed)
        // if second value magnitude > 90, it's likely longitude in second position, so swap to [lng,lat]
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [a, b];
        if (Math.abs(b) > 90 && Math.abs(a) <= 90) return [b, a];
        // Ambiguous case (both within -90..90) -> prefer [lng,lat] but warn so caller can set COORD_ORDER
        // Many geographic longitudes (e.g., India ~77) are <=90 so auto can't be certain.
        // Default to [a,b] (assume already [lng,lat]) but log guidance once.
        if (!_normalizeToLngLat_warned) {
            logger.warn('Coordinate order ambiguous (both values within [-90,90]). If map points look swapped, set COORD_ORDER=latlng');
            _normalizeToLngLat_warned = true;
        }
        return [a, b];
    },

    /* Format date to YYYY-MM-DD string using local timezone */
    formatDateOnly: (value) => {
        if (value === undefined || value === null) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        
        // Use local date components instead of UTC
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /* Compare two geography points with tolerance */
    areLocationsEqual: (location1, location2, tolerance = 0.0001) => {
        if (!location1 || !location2) return false;

        // Extract coordinates from geography points
        const getCoords = (loc) => {
            if (loc.coordinates) return loc.coordinates;
            if (typeof loc === 'string') {
                const match = loc.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
                if (match) return [parseFloat(match[1]), parseFloat(match[2])];
            }
            return null;
        };

        const coords1 = getCoords(location1);
        const coords2 = getCoords(location2);

        if (!coords1 || !coords2) return false;

        // Compare with tolerance (default 0.0001 degrees ≈ 11 meters)
        return Math.abs(coords1[0] - coords2[0]) < tolerance &&
            Math.abs(coords1[1] - coords2[1]) < tolerance;
    },

    normalizeIdentifier: (identifier, identifier_type) => {
        if (!identifier) return identifier;
        const trimmed = String(identifier).trim();
        return identifier_type === 'email' ? trimmed.toLowerCase() : trimmed;
    },

    buildIdentifierCondition: (identifier, identifier_type, Op) => {
        const normalized = helper.normalizeIdentifier(identifier, identifier_type);
        if (identifier_type === 'email') {
            return { [Op.iLike]: normalized };
        }
        return normalized;
    },

    /**
     * Format time as HH:MM:SS
     * @param {Date} date 
     * @returns {string} Time in HH:MM:SS format
     */
    formatTime: (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * Generate the next N hour slots from current time
     * Handles day transitions automatically (e.g., 11 PM -> 12 AM next day)
     * @param {Date} now - Current date/time
     * @param {number} count - Number of hour slots to generate (default: 3)
     * @returns {Array} Array of slot objects with ride_date, batch_start, batch_end
     */
    generateNextThreeHourSlots: (now, count = 3) => {
        const slots = [];
        
        // Start from the current hour
        let slotDate = new Date(now);
        slotDate.setMinutes(0);
        slotDate.setSeconds(0);
        slotDate.setMilliseconds(0);
        
        // Generate consecutive hour slots
        for (let i = 0; i < count; i++) {
            const startDate = new Date(slotDate);
            const endDate = new Date(slotDate);
            endDate.setHours(endDate.getHours() + 1);
            
            // Format times as HH:MM:SS
            const batch_start = helper.formatTime(startDate);
            let batch_end = helper.formatTime(endDate);
            
            // If batch_end is 00:00:00 (midnight), use 23:59:59 to keep within same day
            if (batch_end === '00:00:00') {
                batch_end = '23:59:59';
            }
            
            // Format date as YYYY-MM-DD (use startDate for the ride_date)
            const ride_date = helper.formatDateOnly(startDate);
            
            slots.push({
                ride_date,
                batch_start,
                batch_end
            });
            
            // Move to next hour
            slotDate.setHours(slotDate.getHours() + 1);
        }
        
        return slots;
    },

    /**
     * Generate optimized slots: current hour + 3 hours ahead (skipping middle slots)
     * For optimization to reduce queries by processing only current and future window
     * @param {Date} now - Current date/time
     * @returns {Array} Array of 2 slot objects (current hour and 3 hours ahead)
     */
    generateOptimizedGroupingSlots: (now) => {
        const slots = [];
        
        // Start from the current hour
        let slotDate = new Date(now);
        slotDate.setMinutes(0);
        slotDate.setSeconds(0);
        slotDate.setMilliseconds(0);
        
        // Slot positions to generate: 0 (current) and 3 (3 hours ahead)
        const slotPositions = [0, 3];
        
        for (const position of slotPositions) {
            const startDate = new Date(slotDate);
            startDate.setHours(startDate.getHours() + position);
            
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
            
            // Format times as HH:MM:SS
            const batch_start = helper.formatTime(startDate);
            let batch_end = helper.formatTime(endDate);
            
            // If batch_end is 00:00:00 (midnight), use 23:59:59 to keep within same day
            if (batch_end === '00:00:00') {
                batch_end = '23:59:59';
            }
            
            // Format date as YYYY-MM-DD using local timezone
            const ride_date = helper.formatDateOnly(startDate);
            
            slots.push({
                ride_date,
                batch_start,
                batch_end
            });
        }
        
        return slots;
    },

    /* Convert HH:MM or HH:MM:SS time string to total minutes */
    timeToMinutes(timeStr) {
        if (!timeStr) return null;
        const parts = String(timeStr).split(':');
        if (parts.length < 2) return null;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes + seconds / 60;
    }


};

module.exports = helper;
