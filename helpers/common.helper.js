const os = require('os');

const common = {
    flatten: ({ data, prefix = '' } = { data: {} }) => {
        const _flatten = {};

        function __flatten({ data, prefix = '' } = { data: {} }) {
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (typeof data[key] !== 'object' || data[key] === null) {
                        _flatten[`${prefix}${key}`] = data[key];
                    } else {
                        __flatten({ data: data[key], prefix: `${prefix}${key}.` });
                    }
                }
            }
        }

        __flatten({ data, prefix });
        return _flatten;
    },

    getLocalIP: () => {
        const interfaces = os.networkInterfaces();
        let localIP;

        Object.keys(interfaces).forEach((interfaceName) => {
            const interfaceData = interfaces[interfaceName];
            if (interfaceData) {
                for (let i = 0; i < interfaceData.length; i++) {
                    const { address, family, internal } = interfaceData[i];
                    if (family === 'IPv4' && !internal) {
                        localIP = address;
                        break;
                    }
                }
            }
        });

        return localIP;
    },

    formatTime: (ms) => {
        if (ms < 1000) {
            return ms + 'ms';
        } else if (ms < 60 * 1000) {
            const seconds = Math.floor(ms / 1000);
            return seconds + 's';
        } else if (ms < 60 * 60 * 1000) {
            const minutes = Math.floor(ms / (60 * 1000));
            const seconds = Math.floor((ms % (60 * 1000)) / 1000);
            return minutes + 'm ' + seconds + 's';
        } else {
            const hours = Math.floor(ms / (60 * 60 * 1000));
            const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((ms % (60 * 1000)) / 1000);
            return hours + 'h ' + minutes + 'm ' + seconds + 's';
        }
    },

    normalizePhoneNumber: (value) => {
        if (!value) return '';
        
        // Convert to string first
        let phoneStr = String(value).trim();
        
        // If it's in scientific notation or a number, convert properly
        if (phoneStr.includes('E') || phoneStr.includes('e') || !isNaN(parseFloat(phoneStr))) {
            // Parse as number and convert to fixed string (no decimals)
            const numValue = parseFloat(phoneStr);
            if (!isNaN(numValue)) {
                phoneStr = numValue.toFixed(0);
            }
        }
        
        // Remove any decimal points and trailing zeros
        phoneStr = phoneStr.replace(/\.0+$/, '');
        
        // Remove any non-digit characters except + at the start
        phoneStr = phoneStr.replace(/^\+/, 'PLUS').replace(/\D/g, '').replace(/^PLUS/, '+');
        
        return phoneStr.trim();
    },

    parseHHMMSSToMinutes: (timeString) => {
        if (!timeString || typeof timeString !== 'string') return null;
        const parts = timeString.split(':').map(Number);
        if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) return null;

        const [hours, minutes, seconds] = parts;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;

        return hours * 60 + minutes + seconds / 60;
    },

    describeShiftWindows: (shifts) => (shifts || [])
        .map((shift) => `${shift.name || 'Shift'} ${shift.start_time || '00:00:00'}-${shift.end_time || '00:00:00'}`)
        .join('; '),

    isTimeWithinShift: (shift, loginMinutes, logoutMinutes) => {
        if (!shift || typeof shift.startMinutes !== 'number' || typeof shift.endMinutes !== 'number') return false;
        const { startMinutes, endMinutes } = shift;

        // Overnight shift (e.g. 17:30 → 02:30): endMinutes < startMinutes
        if (endMinutes < startMinutes) {
            return loginMinutes >= startMinutes && logoutMinutes <= endMinutes;
        }

        // Normal same-day shift (e.g. 09:30 → 16:00)
        return loginMinutes >= startMinutes && logoutMinutes <= endMinutes;
    },
};

module.exports = common;
