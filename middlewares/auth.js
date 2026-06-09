const jwt = require('jsonwebtoken');
const db = require('../models');
const { Op } = require('sequelize');
const env = require('../config/env.config');
const { API_response, logger } = require('../helpers');
const enums = require('../constants/enums');
const message = require('../constants/message');

//* Middleware factory
const auth = ({ is_token_required = true, users_allowed = [] } = {}) => {
    return async (req, res, next) => {
        try {
            // Extract token from header
            let token = (req.header('x-auth-token') || req.header('Authorization'))?.replace(/Bearer +/g, '');

            if (is_token_required && !token) return API_response.BAD_REQUEST({ res, message: message.TOKEN_REQUIRED });
            if (!is_token_required && !token) return next();

            // Decode token
            let decoded;
            try {
                decoded = jwt.verify(token, env.jwt.secret);
            } catch (err) {
                logger.error(`JWT Verification Error: ${err.message}`);
                return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });
            }

            const role_id = decoded.role_id || decoded?.role?.id;
            const checkRole = await db.Role.findOne({
                where: {
                    id: role_id,
                },
                attributes: ['id','name'],
                raw: true,
                nest: true,
            });
            if (!checkRole) {
                logger.error(`Role not found for ID: ${decoded.role_id}`);
                return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });
            }


            // Log token contents
            logger.info(`[DECODED] [ID: ${res.reqId}] [${res.method}] ${res.originalUrl} [CONTENT: ${JSON.stringify(decoded)}]`);

            if (!decoded?.id && !decoded.email) return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });

            if (checkRole.name === enums.ROLE.SUPER_ADMIN) {

                const user = await db.User.findOne({
                    where: {
                        ...(decoded.id && { id: decoded.id }),
                        ...(decoded.email && { email: { [Op.iLike]: decoded.email } }),
                    },
                    include: [{ model: db.Role, as: 'role', attributes: ['name'] }],
                    raw: true,
                    nest: true,
                });
                if (!user) return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });

                req.user = {
                    ...decoded,
                    id: user.id.toString(),
                    role: user.role?.name,
                };
            }
            else if (checkRole.name === enums.ROLE.DRIVER) {
                const driver = await db.Driver.findOne({
                    where: {
                        ...(decoded.id && { id: decoded.id }),
                        ...(decoded.email && { email: { [Op.iLike]: decoded.email } }),
                    },
                    include: [{ model: db.Role, as: 'role', attributes: ['name'] }],
                    raw: true,
                    nest: true,
                });
                if (!driver) return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });

                // if (!driver.status || driver.status !== 'active') return API_response.UNAUTHORIZED({ res, message: message.ACCOUNT_DISABLED });

                req.user = {
                    ...decoded,
                    id: driver.id.toString(),
                    role: driver.role?.name,
                };
            }
            else if (checkRole.name === enums.ROLE.VENDOR) {
               
                const vendor = await db.Vendor_master.findOne({
                    where: {
                        ...(decoded?.id && { id: decoded?.id }),
                        ...(decoded?.email && { email: { [Op.iLike]: decoded?.email } }),
                    },
                    include: [{ model: db.Role, as: 'role', attributes: ['name'] }],
                    raw: true,
                    nest: true,
                });
                if (!vendor) return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });


                req.user = {
                    ...decoded,
                    id: vendor.id.toString(),
                    role: vendor.role?.name,
                };
            }
            else {
                const user = await db.Company_employee_master.findOne({
                    where: {
                        ...(decoded.id && { id: decoded.id }),
                        ...(decoded.email && { employee_mail: { [Op.iLike]: decoded.email } }),
                    },
                    include: [{ model: db.Role, as: 'role', attributes: ['name'] }],
                    raw: true,
                    nest: true,
                });
                if (!user) return API_response.UNAUTHORIZED({ res, message: message.INVALID_TOKEN });

                // if (!user.status || user.status !== 'active') return API_response.UNAUTHORIZED({ res, message: message.ACCOUNT_DISABLED });

                req.user = {
                    ...decoded,
                    id: user.id.toString(),
                    role: user.role?.name,
                    company_id: user.company_id,
                    branch_ids: user.branch_ids, // Include branch_ids from database
                    routing_branch_id: user.routing_branch_id, // Include routing_branch_id for branch scope filtering
                };
            }

            if (req.user.role === enums.ROLE.SUPER_ADMIN || users_allowed.includes('*')) return next();
            if (users_allowed.includes(req.user.role)) return next();

            return API_response.UNAUTHORIZED({ res, message: message.UNAUTHORIZED });
        } catch (error) {
            logger.error(`Auth Middleware Error: ${error.message}`);
            return API_response.CATCH_ERROR({ res, message: 'Authentication error' });
        }
    };
};

// Socket helper: verify token from socket handshake and attach user
const verifyTokenFromSocket = async (socket) => {
    let token = (socket.handshake?.auth?.token || socket.handshake?.query?.token || socket.handshake?.headers?.authorization || '');
    token = String(token || '').replace(/Bearer +/g, '');
    if (!token) throw new Error('Socket auth token missing');

    let decoded;
    try {
        decoded = jwt.verify(token, env.jwt.secret);
        logger.info('Decoded socket token:', decoded);
    } catch (err) {
        throw new Error('Invalid token');
    }

    const role_id = decoded.role_id || decoded?.role?.id;
    const checkRole = await db.Role.findOne({ where: { id: role_id }, raw: true, nest: true });
    if (!checkRole) throw new Error('Invalid role');

    if (!decoded?.id && !decoded?.email) throw new Error('Invalid token payload');

    if (checkRole.name === enums.ROLE.SUPER_ADMIN) {
        const user = await db.User.findOne({ where: { ...(decoded.id && { id: decoded.id }), ...(decoded.email && { email: decoded.email }) }, include: [{ model: db.Role, as: 'role', attributes: ['name'] }], raw: true, nest: true });
        if (!user) throw new Error('User not found');
        socket.user = { ...decoded, id: user.id.toString(), role: user.role?.name };
    } else if (checkRole.name === enums.ROLE.DRIVER) {
        const driver = await db.Driver.findOne({ where: { ...(decoded.id && { id: decoded.id }), ...(decoded.email && { email: decoded.email }) }, include: [{ model: db.Role, as: 'role', attributes: ['name'] }], raw: true, nest: true });
        if (!driver) throw new Error('Driver not found');
        socket.user = { ...decoded, id: driver.id.toString(), role: driver.role?.name };
    } else {
        const user = await db.Company_employee_master.findOne({ where: { ...(decoded.id && { id: decoded.id }), ...(decoded.email && { employee_mail: decoded.email }) }, include: [{ model: db.Role, as: 'role', attributes: ['name'] }], raw: true, nest: true });
        if (!user) throw new Error('Employee not found');
        socket.user = { ...decoded, id: user.id.toString(), role: user.role?.name, company_id: user.company_id, branch_ids: user.branch_ids, routing_branch_id: user.routing_branch_id };
    }
    logger.info('Socket user:', socket.user);
    return socket.user;
};

module.exports = {
    auth,
    verifyTokenFromSocket,
};
