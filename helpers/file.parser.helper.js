const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const logger = require('./logger.helper');
const { normalizePhoneNumber } = require('./common.helper');
const { sanitizeFilePath } = require('./security.helper');

/**
 * Normalise a time value to HH:MM:SS.
 * Handles:
 *  - Already HH:MM:SS  → pass through
 *  - HH:MM             → append :00
 *  - Excel serial fraction (0..1) → convert to HH:MM:SS
 * @param {string|number} value
 * @returns {string|null}
 */
const normalizeTime = (value) => {
    if (value === null || value === undefined || value === '') return null;

    const str = value.toString().trim();

    // Already HH:MM:SS
    if (/^([01]?\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(str)) return str;

    // HH:MM  → HH:MM:00
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(str)) return `${str}:00`;

    // Excel serial fraction (e.g. 0.395833 for 09:30)
    const num = parseFloat(str);
    if (!isNaN(num) && num >= 0 && num < 1) {
        const totalSeconds = Math.round(num * 86400);
        const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const ss = String(totalSeconds % 60).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    return str; // return as-is; validation will catch it
};

/**
 * Parse CSV or Excel file and return employee data
 * Includes path validation to prevent path traversal attacks
 * @param {string} filePath - Path to the uploaded file
 * @param {string} baseDir - Allowed base directory (default: 'uploads')
 * @returns {Promise<{employees: Array, parseErrors: Array}>} - Parsed employees and any row-level errors
 */
const parseFile = async (filePath, baseDir = 'uploads') => {
    // Validate file path to prevent path traversal (CWE-23)
    const { isValid, sanitizedPath, error } = sanitizeFilePath(filePath, baseDir);
    
    if (!isValid) {
        throw new Error(`Security Error: ${error}`);
    }

    const fileExtension = path.extname(sanitizedPath).toLowerCase();

    if (fileExtension === '.csv') {
        return await parseCSV(sanitizedPath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        return parseExcel(sanitizedPath);
    } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }
};

module.exports = {
    parseFile,
};
