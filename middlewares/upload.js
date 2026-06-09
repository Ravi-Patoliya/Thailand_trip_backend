const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { logger } = require('../helpers');
const { sanitizeFilePath } = require('../helpers/security.helper');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Secure cleanup function - validates path before deletion
 * Prevents path traversal attacks (CWE-23)
 * @param {string} filePath - Path to file to delete
 * @param {string} baseDir - Allowed base directory (default: 'uploads')
 * @returns {boolean} - Success status
 */
const cleanup = (filePath, baseDir = 'uploads') => {
    try {
        // Validate path to prevent path traversal
        const { isValid, sanitizedPath, error } = sanitizeFilePath(filePath, baseDir);
        
        if (!isValid) {
            logger.error(`❌ Security: Invalid file path rejected: ${error}`);
            return false;
        }

        if (fs.existsSync(sanitizedPath)) {
            fs.unlinkSync(sanitizedPath);
            logger.info(`🗑️ Cleaned up file: ${sanitizedPath}`);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`❌ Error cleaning up file ${filePath}: ${error.message}`);
        return false;
    }
};

/**
 * Secure async cleanup function - validates path before deletion
 * Prevents path traversal attacks (CWE-23)
 * @param {string} filePath - Path to file to delete
 * @param {string} baseDir - Allowed base directory (default: 'uploads')
 * @returns {Promise<boolean>} - Success status
 */
const cleanupAsync = async (filePath, baseDir = 'uploads') => {
    try {
        // Validate path to prevent path traversal
        const { isValid, sanitizedPath, error } = sanitizeFilePath(filePath, baseDir);
        
        if (!isValid) {
            logger.error(`❌ Security: Invalid file path rejected: ${error}`);
            return false;
        }

        const unlinkAsync = promisify(fs.unlink);
        if (fs.existsSync(sanitizedPath)) {
            await unlinkAsync(sanitizedPath);
            logger.info(`🗑️ Cleaned up file: ${sanitizedPath}`);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`❌ Error cleaning up file ${filePath}: ${error.message}`);
        return false;
    }
};

// Bulk cleanup function for multiple files
const cleanupMultiple = (filePaths) => {
    const results = [];
    filePaths.forEach(filePath => {
        const result = cleanup(filePath);
        results.push({ filePath, success: result });
    });
    return results;
};

const createUploadMiddleware = (options = {}) => {
    const config = {
        destination: options.destination || 'uploads/',
        fieldName: options.fieldName || 'file',
        multiple: options.multiple || false,
        maxFiles: options.maxFiles || 5,
        maxSize: options.maxSize || (10 * 1024 * 1024), // 10MB
        allowedExtensions: options.allowedExtensions || ['.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx', '.xls'],
        allowedMimeTypes: options.allowedMimeTypes || null,
        fileNamePrefix: options.fileNamePrefix || 'upload',
        preserveOriginalName: options.preserveOriginalName || false,
        debug: options.debug || false,
        customFileFilter: options.customFileFilter || null,
        customFileName: options.customFileName || null,
        ...options
    };

    // Ensure upload directory exists
    ensureDirectoryExists(config.destination);

    // Configure storage
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            if (config.debug) {
                logger.info(`📁 Upload destination: ${config.destination}`);
            }
            cb(null, config.destination);
        },
        filename: (req, file, cb) => {
            let filename;

            if (config.customFileName && typeof config.customFileName === 'function') {
                filename = config.customFileName(req, file);
            } else if (config.preserveOriginalName) {
                const timestamp = Date.now();
                const originalName = path.parse(file.originalname).name;
                const extension = path.extname(file.originalname);
                filename = `${originalName}-${timestamp}${extension}`;
            } else {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = path.extname(file.originalname);
                filename = `${config.fileNamePrefix}-${uniqueSuffix}${extension}`;
            }

            if (config.debug) {
                logger.info(`📝 Generated filename: ${filename}`);
            }
            cb(null, filename);
        }
    });

    // Configure file filter
    const fileFilter = (req, file, cb) => {
        if (config.debug) {
            logger.info(`🔍 File filter check:`, {
                originalname: file.originalname,
                mimetype: file.mimetype,
                fieldname: file.fieldname
            });
        }

        // Use custom file filter if provided
        if (config.customFileFilter && typeof config.customFileFilter === 'function') {
            return config.customFileFilter(req, file, cb);
        }

        const ext = path.extname(file.originalname).toLowerCase();

        // Check file extension
        if (config.allowedExtensions && config.allowedExtensions.length > 0) {
            if (!config.allowedExtensions.includes(ext)) {
                return cb(new Error(`Invalid file type. Allowed extensions: ${config.allowedExtensions.join(', ')}`));
            }
        }

        // Check MIME type if specified
        if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
            if (!config.allowedMimeTypes.includes(file.mimetype)) {
                return cb(new Error(`Invalid MIME type. Allowed types: ${config.allowedMimeTypes.join(', ')}`));
            }
        }

        if (config.debug) {
            logger.info(`✅ File passed filter checks`);
        }
        cb(null, true);
    };

    // Create multer instance
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: config.maxSize,
            files: config.multiple ? config.maxFiles : 1
        },
        fileFilter: fileFilter
    });

    // Return middleware function
    return (req, res, next) => {
        if (config.debug) {
            logger.info(`🔍 Upload Middleware Debug:,${ {
                method: req.method,
                url: req.url,
                contentType: req.get('Content-Type'),
                fieldName: config.fieldName,
                multiple: config.multiple,
                maxFiles: config.maxFiles,
                maxSize: `${Math.round(config.maxSize / 1024 / 1024)}MB`,
                allowedExtensions: config.allowedExtensions
            }}`);
            logger.info(`🔍 Request headers: ${JSON.stringify(req.headers, null, 2)}`);
        }

        // Choose upload method based on configuration
        let uploadMethod;
        if (config.multiple) {
            if (config.maxFiles === 1) {
                uploadMethod = upload.single(config.fieldName);
            } else {
                uploadMethod = upload.array(config.fieldName, config.maxFiles);
            }
        } else {
            uploadMethod = upload.single(config.fieldName);
        }

        uploadMethod(req, res, (err) => {
            if (err) {
                logger.error(`❌ Upload Error:`, {
                    message: err.message,
                    code: err.code,
                    field: err.field,
                    storageErrors: err.storageErrors
                });

                // Handle specific multer errors
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: `Unexpected field name. Expected field name: '${config.fieldName}'. Make sure your form-data field is named '${config.fieldName}'.`,
                        debug: {
                            expectedField: config.fieldName,
                            receivedField: err.field,
                            multiple: config.multiple,
                            maxFiles: config.maxFiles,
                            error: err.message
                        }
                    });
                }

                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: `File too large. Maximum size allowed: ${Math.round(config.maxSize / 1024 / 1024)}MB`,
                        debug: {
                            maxSize: config.maxSize,
                            error: err.message
                        }
                    });
                }

                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: `Too many files. Maximum files allowed: ${config.maxFiles}`,
                        debug: {
                            maxFiles: config.maxFiles,
                            error: err.message
                        }
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                    debug: {
                        errorCode: err.code,
                        expectedField: config.fieldName,
                        multiple: config.multiple,
                        allowedExtensions: config.allowedExtensions
                    }
                });
            }

            // Log successful upload
            if (config.debug) {
                if (config.multiple && req.files) {
                    logger.info(`✅ Multiple files uploaded:`, req.files.map(f => ({
                        originalname: f.originalname,
                        filename: f.filename,
                        size: f.size,
                        mimetype: f.mimetype
                    })));
                } else if (req.file) {
                    logger.info(`✅ Single file uploaded:`, {
                        originalname: req.file.originalname,
                        filename: req.file.filename,
                        size: req.file.size,
                        mimetype: req.file.mimetype
                    });
                }
            }

            next();
        });
    };
};


// Employee CSV/Excel upload
const employeeUpload = (options = {}) => {
    return createUploadMiddleware({
        destination: 'uploads/employees/',
        fieldName: 'file',
        multiple: false,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedExtensions: ['.csv', '.xlsx', '.xls'],
        fileNamePrefix: 'employee-bulk',
        debug: true,
        ...options
    });
};

// Profile image upload
const profileImageUpload = (options = {}) => {
    return createUploadMiddleware({
        destination: 'uploads/profiles/',
        fieldName: 'image',
        multiple: false,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileNamePrefix: 'profile',
        debug: true,
        ...options
    });
};

// Document upload (multiple files)
const documentUpload = (options = {}) => {
    return createUploadMiddleware({
        destination: 'uploads/documents/',
        fieldName: 'documents',
        multiple: true,
        maxFiles: 5,
        maxSize: 20 * 1024 * 1024, // 20MB
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
        fileNamePrefix: 'document',
        debug: true,
        ...options
    });
};

// Vehicle images upload (multiple)
const vehicleImageUpload = (options = {}) => {
    return createUploadMiddleware({
        destination: 'uploads/vehicles/',
        fieldName: 'images',
        multiple: true,
        maxFiles: 10,
        maxSize: 5 * 1024 * 1024, // 5MB per file
        allowedExtensions: ['.jpg', '.jpeg', '.png'],
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileNamePrefix: 'vehicle',
        debug: true,
        ...options
    });
};

// Any file upload
const anyFileUpload = (options = {}) => {
    return createUploadMiddleware({
        destination: 'uploads/general/',
        fieldName: 'file',
        multiple: false,
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedExtensions: [], // Allow all extensions
        fileNamePrefix: 'general',
        debug: true,
        ...options
    });
};

// Dynamic upload based on file type
const dynamicUpload = (fileType, options = {}) => {
    const presets = {
        image: {
            destination: 'uploads/images/',
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
            maxSize: 5 * 1024 * 1024, // 5MB
            fileNamePrefix: 'image'
        },
        document: {
            destination: 'uploads/documents/',
            allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
            maxSize: 20 * 1024 * 1024, // 20MB
            fileNamePrefix: 'document'
        },
        excel: {
            destination: 'uploads/excel/',
            allowedExtensions: ['.xlsx', '.xls', '.csv'],
            maxSize: 15 * 1024 * 1024, // 15MB
            fileNamePrefix: 'excel'
        },
        video: {
            destination: 'uploads/videos/',
            allowedExtensions: ['.mp4', '.avi', '.mov', '.wmv'],
            allowedMimeTypes: ['video/mp4', 'video/avi', 'video/quicktime'],
            maxSize: 100 * 1024 * 1024, // 100MB
            fileNamePrefix: 'video'
        },
        audio: {
            destination: 'uploads/audio/',
            allowedExtensions: ['.mp3', '.wav', '.flac', '.aac'],
            allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac'],
            maxSize: 50 * 1024 * 1024, // 50MB
            fileNamePrefix: 'audio'
        }
    };

    const preset = presets[fileType] || {};
    return createUploadMiddleware({
        fieldName: 'file',
        debug: true,
        ...preset,
        ...options
    });
};

module.exports = {
    // Main factory function
    createUploadMiddleware,

    // Pre-configured functions
    employeeUpload,
    profileImageUpload,
    documentUpload,
    vehicleImageUpload,
    anyFileUpload,
    dynamicUpload,

    // Pre-configured middleware instances for backward compatibility
    employeeUploadMiddleware: employeeUpload(),
    profileImageUploadMiddleware: profileImageUpload(),
    documentUploadMiddleware: documentUpload(),
    vehicleImageUploadMiddleware: vehicleImageUpload(),
    anyFileUploadMiddleware: anyFileUpload(),

    // Utility functions
    ensureDirectoryExists,
    cleanup,
    cleanupAsync,
    cleanupMultiple
};
