const dotenv = require('dotenv');
dotenv.config();

// Email configuration and templates
const emailConfig = {
    // SMTP Configuration
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    },

    // Default sender information
    sender: {
        name: 'FleetIQ',
        email: process.env.EMAIL_SENDER || 'no-reply@forklyft.in',
        company: 'Plixr Technologies Pvt. Ltd.',
    },

    // Email templates configuration
    templates: {
        // OTP Login Email Template
        employee_login_otp: {
            subject: (data) => `${data.otp} - Your FleetIQ Login OTP`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>FleetIQ Login OTP</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                            margin: 0; 
                            padding: 0; 
                            background-color: #f4f4f4; 
                        }
                        .email-container { 
                            max-width: 600px; 
                            margin: 20px auto; 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            overflow: hidden; 
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                        }
                        .header { 
                            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                            color: white; 
                            padding: 30px 20px; 
                            text-align: center; 
                        }
                        .header h1 { 
                            margin: 0; 
                            font-size: 28px; 
                            font-weight: 600; 
                        }
                        .header p { 
                            margin: 8px 0 0 0; 
                            opacity: 0.9; 
                            font-size: 16px; 
                        }
                        .content { 
                            padding: 40px 30px; 
                        }
                        .greeting { 
                            font-size: 18px; 
                            margin-bottom: 20px; 
                            color: #2c3e50; 
                        }
                        .otp-section { 
                            text-align: center; 
                            margin: 30px 0; 
                        }
                        .otp-box { 
                            background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%); 
                            border: 2px dashed #007bff; 
                            padding: 25px; 
                            border-radius: 12px; 
                            margin: 20px 0; 
                            display: inline-block; 
                            min-width: 250px; 
                        }
                        .otp-label { 
                            font-size: 14px; 
                            color: #6c757d; 
                            margin-bottom: 10px; 
                            text-transform: uppercase; 
                            letter-spacing: 1px; 
                        }
                        .otp-code { 
                            font-size: 36px; 
                            font-weight: bold; 
                            color: #007bff; 
                            letter-spacing: 8px; 
                            margin: 15px 0; 
                            font-family: 'Courier New', monospace; 
                        }
                        .otp-expiry { 
                            font-size: 13px; 
                            color: #dc3545; 
                            margin-top: 10px; 
                            font-weight: 500; 
                        }
                        .security-notice { 
                            background: linear-gradient(145deg, #fff3cd 0%, #ffeaa7 100%); 
                            border: 1px solid #ffc107; 
                            padding: 20px; 
                            border-radius: 8px; 
                            margin: 25px 0; 
                        }
                        .security-notice h4 { 
                            color: #856404; 
                            margin: 0 0 15px 0; 
                            font-size: 16px; 
                            display: flex; 
                            align-items: center; 
                        }
                        .security-notice ul { 
                            margin: 0; 
                            color: #856404; 
                            font-size: 14px; 
                            padding-left: 20px; 
                        }
                        .security-notice li { 
                            margin-bottom: 8px; 
                        }
                        .footer { 
                            background-color: #f8f9fa; 
                            padding: 25px; 
                            text-align: center; 
                            border-top: 1px solid #dee2e6; 
                        }
                        .footer p { 
                            margin: 5px 0; 
                            color: #6c757d; 
                            font-size: 12px; 
                        }
                        .company-info { 
                            margin-top: 15px; 
                            padding-top: 15px; 
                            border-top: 1px solid #dee2e6; 
                        }
                        @media (max-width: 600px) {
                            .email-container { margin: 10px; }
                            .content { padding: 25px 20px; }
                            .otp-code { font-size: 28px; letter-spacing: 4px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🚛 FleetIQ</h1>
                            <p>Secure Login Verification</p>
                        </div>
                        
                        <div class="content">
                            <div class="greeting">
                                Hello <strong>${data.user_name || 'User'}</strong>,
                            </div>
                            
                            <p>You have requested to login to your <strong>${data.company_name || 'FleetIQ'}</strong> account. Please use the verification code below to complete your login:</p>
                            
                            <div class="otp-section">
                                <div class="otp-box">
                                    <div class="otp-label">Your Login Code</div>
                                    <div class="otp-code">${data.otp}</div>
                                    <div class="otp-expiry">⏱️ Expires in ${data.expires_in || '10 minutes'}</div>
                                </div>
                            </div>
                            
                            <div class="security-notice">
                                <h4>🔒 Security Notice</h4>
                                <ul>
                                    <li>This OTP is valid for <strong>${data.expires_in || '10 minutes'}</strong> only</li>
                                    <li>Never share this code with anyone, including FleetIQ support</li>
                                    <li>FleetIQ staff will never ask for your OTP via phone or email</li>
                                    <li>If you didn't request this login, please ignore this email and notify your administrator</li>
                                    </ul>
                            </div>
                            
                            <p>If you're experiencing issues logging in or have security concerns, please contact your system administrator immediately.</p>
                            
                            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                                <strong>Login Details:</strong><br>
                                📧 Account: ${data.identifier || 'Not specified'}<br>
                                🕐 Requested: ${new Date().toLocaleString()}<br>
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p><strong>© 2024 FleetIQ</strong> - Fleet Management Solution</p>
                            <p>This is an automated security message. Please do not reply to this email.</p>
                            <div class="company-info">
                                <p><strong>Plixr Technologies Pvt. Ltd.</strong></p>
                                <p>Building the future of fleet management</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
FleetIQ - Login Verification Code

Hello ${data.employee_name || 'Employee'},

You have requested to login to your ${data.company_name || 'FleetIQ'} account.

Your Login OTP: ${data.otp}
Valid for: ${data.expires_in || '10 minutes'}

SECURITY NOTICE:
- This OTP is valid for ${data.expires_in || '10 minutes'} only
- Never share this code with anyone, including FleetIQ support
- FleetIQ staff will never ask for your OTP via phone or email
- If you didn't request this login, please ignore this email

Login Details:
Account: ${data.identifier || 'Not specified'}
Requested: ${new Date().toLocaleString()}
IP Address: ${data.ip_address || 'Not tracked'}

If you're experiencing issues, please contact your system administrator.

---
© 2024 FleetIQ - Fleet Management Solution
Plixr Technologies Pvt. Ltd.

This is an automated security message. Please do not reply.
            `
        },

        // Password Reset Email Template
        password_reset: {
            subject: (data) => `FleetIQ - Password Reset Request`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>FleetIQ Password Reset</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px 20px; text-align: center; }
                        .content { padding: 40px 30px; }
                        .reset-code { background: #f8f9fa; border: 2px dashed #dc3545; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; }
                        .reset-code-text { font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 6px; font-family: monospace; }
                        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #dee2e6; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🔑 Password Reset</h1>
                            <p>FleetIQ Account Security</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${data.employee_name || 'Employee'},</h2>
                            <p>You have requested to reset your FleetIQ account password.</p>
                            <div class="reset-code">
                                <p>Your Password Reset Code:</p>
                                <div class="reset-code-text">${data.reset_code}</div>
                                <p>Valid for ${data.expires_in || '15 minutes'}</p>
                            </div>
                            <p>If you didn't request this reset, please contact your administrator immediately.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
FleetIQ - Password Reset Request

Hello ${data.employee_name || 'Employee'},

You have requested to reset your FleetIQ account password.

Reset Code: ${data.reset_code}
Valid for: ${data.expires_in || '15 minutes'}

If you didn't request this reset, please contact your administrator.

© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.
            `
        },

        // Welcome Email Template
        welcome: {
            subject: (data) => `Welcome to FleetIQ - ${data.company_name || 'Your Account is Ready'}`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to FleetIQ</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
                        .content { padding: 40px 30px; }
                        .welcome-box { background: #e7f5e7; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px; }
                        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #dee2e6; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🎉 Welcome to FleetIQ!</h1>
                            <p>Your Fleet Management Journey Begins</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${data.employee_name || 'Employee'},</h2>
                            <div class="welcome-box">
                                <p><strong>Welcome to ${data.company_name || 'FleetIQ'}!</strong></p>
                                <p>Your account has been successfully created and you can now access the FleetIQ platform.</p>
                            </div>
                            <p>FleetIQ provides comprehensive fleet management solutions to help optimize your operations.</p>
                            <p>If you have any questions, please contact your system administrator.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
Welcome to FleetIQ!

Hello ${data.employee_name || 'Employee'},

Welcome to ${data.company_name || 'FleetIQ'}! Your account has been successfully created.

FleetIQ provides comprehensive fleet management solutions to help optimize your operations.

If you have any questions, please contact your system administrator.

© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.
            `
        },

        // Vehicle shortage notification template
        vehicle_shortage: {
            subject: (data) => `Vehicle Shortage Alert - ${data.ride_date}`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Vehicle Shortage Alert</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; }
                        .alert-box { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>⚠️ Vehicle Shortage Alert</h1>
                        </div>
                        <div class="content">
                            <div class="alert-box">
                                <strong>No vehicles available for ride grouping</strong>
                            </div>
                            <p><strong>Date:</strong> ${data.ride_date}</p>
                            <p><strong>Time:</strong> ${data.batch_time}</p>
                            <p><strong>Pending Rides:</strong> ${data.ride_count}</p>
                            <div class="details">
                                <p><strong>Required Locations:</strong></p>
                                <p>Cities: ${data.cities || 'Not specified'}</p>
                                <p>States: ${data.states || 'Not specified'}</p>
                            </div>
                            <p>Please check vehicle availability in the required locations and ensure drivers are assigned.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
Vehicle Shortage Alert

No vehicles available for ride grouping on ${data.ride_date} at ${data.batch_time}.
${data.ride_count} rides remain pending.

Required Locations:
Cities: ${data.cities || 'Not specified'}
States: ${data.states || 'Not specified'}

Please check vehicle availability in the required locations.

© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.
            `
        },

        // Partial scheduling notification template
        partial_scheduling: {
            subject: (data) => `Partial Ride Scheduling - ${data.ride_date}`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Partial Ride Scheduling</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }
                        .content { padding: 30px; }
                        .warning-box { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                        .stat { text-align: center; }
                        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
                        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>⚠️ Partial Ride Scheduling</h1>
                        </div>
                        <div class="content">
                            <div class="warning-box">
                                <strong>Some rides could not be scheduled due to limited vehicle capacity</strong>
                            </div>
                            <div class="stats">
                                <div class="stat">
                                    <div class="stat-number">${data.scheduled_count}</div>
                                    <div>Scheduled</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-number">${data.pending_count}</div>
                                    <div>Pending</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-number">${data.available_capacity}</div>
                                    <div>Available Seats</div>
                                </div>
                            </div>
                            <div class="details">
                                <p><strong>Date:</strong> ${data.ride_date}</p>
                                <p><strong>Time:</strong> ${data.batch_time}</p>
                                <p><strong>Total Requested:</strong> ${data.total_requested} rides</p>
                                <p><strong>Locations:</strong> Cities: ${data.cities}, States: ${data.states}</p>
                            </div>
                            <p>Please add more vehicles or reschedule the pending rides to ensure all employees have transportation.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
Partial Ride Scheduling - ${data.ride_date}

${data.scheduled_count} rides scheduled successfully
${data.pending_count} rides remain pending due to insufficient vehicle capacity

Date: ${data.ride_date}
Time: ${data.batch_time}
Total Requested: ${data.total_requested} rides
Available Capacity: ${data.available_capacity} seats

Locations: Cities: ${data.cities}, States: ${data.states}

Please add more vehicles or reschedule pending rides.

© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.
            `
        },
        //template for forgot password otp
        employee_forgot_password_otp: {
            subject: (data) => `FleetIQ - Password Reset OTP`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>FleetIQ Password Reset OTP</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px 20px; text-align: center; }
                        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 16px; }
                        .content { padding: 40px 30px; }
                        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
                        .otp-section { text-align: center; margin: 30px 0; }
                        .otp-box { background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #007bff; padding: 25px; border-radius: 12px; margin: 20px 0; display: inline-block; min-width: 250px; }
                        .otp-label { font-size: 14px; color: #6c757d; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                        .otp-code { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; margin: 15px 0; font-family: 'Courier New', monospace; }
                        .otp-expiry { font-size: 13px; color: #dc3545; margin-top: 10px; font-weight: 500; }
                        .security-notice { background: linear-gradient(145deg, #fff3cd 0%, #ffeaa7 100%); border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0; }
                        .security-notice h4 { color: #856404; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center; }
                        .security-notice ul { margin: 0; color: #856404; font-size: 14px; padding-left: 20px; }
                        .security-notice li { margin-bottom: 8px; }
                        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #dee2e6; }
                        .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                        .company-info { margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; }
                        @media (max-width: 600px) {
                            .email-container { margin: 10px; }
                            .content { padding: 25px 20px; }
                            .otp-code { font-size: 28px; letter-spacing: 4px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🚛 FleetIQ</h1>
                            <p>Password Reset Verification</p>
                        </div>
                        <div class="content">
                            <div class="greeting">
                                Hello <strong>${data.user_name || 'User'}</strong>,

                            </div>
                            <p>You have requested to reset your password for your <strong>${data.company_name || 'FleetIQ'}</strong> account. Please use the verification code below to proceed with resetting your password:</p>
                            <div class="otp-section">
                                <div class="otp-box">
                                    <div class="otp-label">Your Password Reset Code</div>
                                    <div class="otp-code">${data.otp}</div>
                                    <div class="otp-expiry">⏱️ Expires in ${data.expires_in || '10 minutes'}</div>
                                </div>
                            </div>
                            <div class="security-notice">
                                <h4>🔒 Security Notice</h4>
                                <ul>
                                    <li>This OTP is valid for <strong>${data.expires_in || '10 minutes'}</strong> only</li>
                                    <li>Never share this code with anyone, including FleetIQ support</li>
                                    <li>FleetIQ staff will never ask for your OTP via phone or email</li>
                                    <li>If you didn't request this password reset, please ignore this email and notify your administrator</li>
                                </ul>
                            </div>
                            <p>If you're experiencing issues resetting your password or have security concerns, please contact your system administrator immediately.</p>
                            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                                <strong>Request Details:</strong><br>
                                📧 Account: ${data.identifier || 'Not specified'}<br>
                                🕐 Requested: ${new Date().toLocaleString()}<br>
                            </p>
                        </div>
                        <div class="footer">
                            <p><strong>© ${new Date().getFullYear()} FleetIQ</strong> - Fleet Management Solution</p>
                            <p>This is an automated security message. Please do not reply to this email.</p>
                            <div class="company-info">
                                <p><strong>Plixr Technologies Pvt. Ltd.</strong></p>
                                <p>Building the future of fleet management</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
FleetIQ - Password Reset Verification Code
Hello ${data.employee_name || 'Employee'},

You have requested to reset your password for your ${data.company_name || 'FleetIQ'} account.
Your Password Reset OTP: ${data.otp}
Valid for: ${data.expires_in || '10 minutes'}
SECURITY NOTICE:
- This OTP is valid for ${data.expires_in || '10 minutes'} only
- Never share this code with anyone, including FleetIQ support
- FleetIQ staff will never ask for your OTP via phone or email
- If you didn't request this password reset, please ignore this email
Request Details:
Account: ${data.identifier || 'Not specified'}
Requested: ${new Date().toLocaleString()}
If you're experiencing issues, please contact your system administrator.
---
© 2024 FleetIQ - Fleet Management Solution
Plixr Technologies Pvt. Ltd.

This is an automated security message. Please do not reply.
            `
        },

        // Ride Manager Approval Email Template
        ride_manager_approval: {
            subject: (data) => `Ride Approval Required - ${data.employee_name}`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Ride Approval Required</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px 20px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                        .content { padding: 30px; }
                        .ride-details { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 6px; }
                        .ride-details h3 { margin-top: 0; color: #007bff; font-size: 18px; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #495057; }
                        .detail-value { color: #6c757d; text-align: right; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .btn { display: inline-block; padding: 14px 32px; margin: 10px; text-decoration: none !important; border-radius: 6px; font-weight: 600; font-size: 16px; transition: all 0.3s; color: white !important; }
                        .btn-approve { background-color: #28a745; color: white !important; }
                        .btn-approve a { color: white !important; }
                        .btn-approve:hover { background-color: #218838; color: white !important; }
                        .btn-reject { background-color: #dc3545; color: white !important; }
                        .btn-reject:hover { background-color: #c82333; color: white !important; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
                        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 6px; color: #856404; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🚗 Ride Approval Required</h1>
                        </div>
                        <div class="content">
                            <p>Hello Manager,</p>
                            <p>A new ride request has been submitted and requires your approval.</p>
                            
                            <div class="ride-details">
                                <h3>Ride Details</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Employee:</span>
                                    <span class="detail-value">${data.employee_name}</span>
                                </div>
                                ${data.ride_dates && data.ride_dates.length > 1 ? `
                                <div class="detail-row">
                                    <span class="detail-label">Period:</span>
                                    <span class="detail-value">${typeof data.start_date === 'string' ? data.start_date : new Date(data.start_date).toISOString().split('T')[0]} to ${typeof data.end_date === 'string' ? data.end_date : new Date(data.end_date).toISOString().split('T')[0]}</span>
                                </div>
                                ` : `
                                <div class="detail-row">
                                    <span class="detail-label">Date:</span>
                                    <span class="detail-value">${data.ride_date}</span>
                                </div>
                                `}
                                <div class="detail-row">
                                    <span class="detail-label">Pickup Time:</span>
                                    <span class="detail-value">${data.pickup_time || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Pickup Address:</span>
                                    <span class="detail-value">${data.pickup_address}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Drop Address:</span>
                                    <span class="detail-value">${data.drop_address}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Ride Type:</span>
                                    <span class="detail-value">${data.ride_type}</span>
                                </div>
                            </div>

                            ${data.ride_dates && data.ride_dates.length > 1 ? `
                            <div class="ride-details" style="margin-top: 20px;">
                                <h3>📅 Scheduled Ride Dates (${data.ride_dates.length} days)</h3>
                                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                    <thead>
                                        <tr style="background-color: #007bff; color: white;">
                                            <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">#</th>
                                            <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Date</th>
                                            <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Day</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.ride_dates.map((date, index) => {
                                            const dateObj = new Date(date);
                                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                            return `
                                            <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : 'background-color: white;'}">
                                                <td style="padding: 10px; border: 1px solid #dee2e6;">${index + 1}</td>
                                                <td style="padding: 10px; border: 1px solid #dee2e6;">${date}</td>
                                                <td style="padding: 10px; border: 1px solid #dee2e6;">${dayNames[dateObj.getDay()]}</td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ` : ''}

                            <div class="warning">
                                ⚠️ <strong>Action Required:</strong> Please review and approve or reject this ride request.
                            </div>

                            <div class="button-container">
                                <a href="${data.approve_url}" class="btn btn-approve">✓ Approve Ride</a>
                                <a href="${data.reject_url}" class="btn btn-reject">✗ Reject Ride</a>
                            </div>

                            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                                <strong>Note:</strong> These links are secure and will expire after use. If you did not expect this email, please contact your system administrator.
                            </p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
                Ride Approval Required
                
                Hello Manager,
                
                A new ride request has been submitted and requires your approval.
                
                Ride Details:
                - Employee: ${data.employee_name}
                ${data.ride_dates && data.ride_dates.length > 1 ? 
                `- Period: ${typeof data.start_date === 'string' ? data.start_date : new Date(data.start_date).toISOString().split('T')[0]} to ${typeof data.end_date === 'string' ? data.end_date : new Date(data.end_date).toISOString().split('T')[0]}` : 
                `- Date: ${data.ride_date}`}
                - Pickup Time: ${data.pickup_time || 'N/A'}
                - Pickup Address: ${data.pickup_address}
                - Drop Address: ${data.drop_address}
                - Ride Type: ${data.ride_type}
                
                ${data.ride_dates && data.ride_dates.length > 1 ? `
                Scheduled Ride Dates (${data.ride_dates.length} days):
                ${data.ride_dates.map((date, index) => {
                    const dateObj = new Date(date);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return `${index + 1}. ${date} (${dayNames[dateObj.getDay()]})`;
                }).join('\\n                ')}
                ` : ''}
                
                To approve this ride, visit: ${data.approve_url}
                To reject this ride, visit: ${data.reject_url}
                
                Note: These links are secure and will expire after use.
                
                © ${new Date().getFullYear()} FleetIQ by Plixr Technologies Pvt. Ltd.
                This is an automated message, please do not reply.
            `
        },

        // VIP Vendor Assignment Email Template
        vip_vendor_assignment: {
            subject: (data) => `New VIP Ride Assignment - ${data.ride_id ? `#${data.ride_id}` : 'Ride Request'}`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>VIP Ride Assignment</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                            margin: 0; 
                            padding: 0; 
                            background-color: #f4f4f4; 
                        }
                        .email-container { 
                            max-width: 600px; 
                            margin: 20px auto; 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            overflow: hidden; 
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                        }
                        .header { 
                            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                            color: white; 
                            padding: 30px 20px; 
                            text-align: center; 
                        }
                        .header h1 { 
                            margin: 0; 
                            font-size: 28px; 
                            font-weight: 600; 
                        }
                        .header p { 
                            margin: 8px 0 0 0; 
                            opacity: 0.9; 
                            font-size: 16px; 
                        }
                        .content { 
                            padding: 30px; 
                        }
                        .greeting { 
                            font-size: 18px; 
                            margin-bottom: 20px; 
                            color: #2c3e50; 
                        }
                        .ride-badge {
                            background: linear-gradient(145deg, #28a745 0%, #20c997 100%);
                            color: white;
                            padding: 15px 25px;
                            border-radius: 8px;
                            text-align: center;
                            margin: 20px 0;
                            font-size: 20px;
                            font-weight: bold;
                            letter-spacing: 1px;
                        }
                        .ride-details { 
                            background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%); 
                            padding: 25px; 
                            border-radius: 8px; 
                            margin: 20px 0; 
                        }
                        .ride-details h3 { 
                            color: #007bff; 
                            margin-top: 0; 
                            font-size: 18px; 
                            border-bottom: 2px solid #007bff; 
                            padding-bottom: 10px; 
                        }
                        .detail-row { 
                            display: flex; 
                            justify-content: space-between; 
                            padding: 10px 0; 
                            border-bottom: 1px solid #dee2e6; 
                        }
                        .detail-row:last-child { 
                            border-bottom: none; 
                        }
                        .detail-label { 
                            font-weight: 600; 
                            color: #6c757d; 
                            flex: 0 0 40%; 
                        }
                        .detail-value { 
                            color: #2c3e50; 
                            flex: 1; 
                            text-align: right; 
                        }
                        .location-section {
                            background: #fff;
                            border: 2px solid #007bff;
                            border-radius: 8px;
                            padding: 15px;
                            margin: 20px 0;
                        }
                        .location-label {
                            font-weight: bold;
                            color: #007bff;
                            font-size: 14px;
                            margin-bottom: 5px;
                        }
                        .location-address {
                            color: #2c3e50;
                            padding-left: 10px;
                        }
                        .footer { 
                            background-color: #f8f9fa; 
                            padding: 25px; 
                            text-align: center; 
                            border-top: 1px solid #dee2e6; 
                        }
                        .footer p { 
                            margin: 5px 0; 
                            color: #6c757d; 
                            font-size: 12px; 
                        }
                        .company-info { 
                            margin-top: 15px; 
                            padding-top: 15px; 
                            border-top: 1px solid #dee2e6; 
                        }
                        .note-box {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .note-box strong {
                            color: #856404;
                        }
                        @media (max-width: 600px) {
                            .email-container { margin: 10px; }
                            .content { padding: 20px; }
                            .detail-row { flex-direction: column; }
                            .detail-label, .detail-value { text-align: left; }
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🚗 FleetIQ VIP Services</h1>
                            <p>New Ride Assignment</p>
                        </div>
                        
                        <div class="content">
                            <div class="greeting">
                                Hello <strong>${data.vendor_name || 'Vendor'}</strong>,
                            </div>
                            
                            <p>You have been assigned a new VIP ride. Please review the details below and ensure timely service.</p>
                            
                            ${data.ride_id ? `
                            <div class="ride-badge">
                                Ride #${data.ride_id}
                            </div>
                            ` : ''}
                            
                            <div class="ride-details">
                                <h3>📋 Ride Information</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Ride Date:</span>
                                    <span class="detail-value">${data.start_date ? new Date(data.start_date).toLocaleDateString() : 'Not specified'}</span>
                                </div>
                                ${data.start_time ? `
                                <div class="detail-row">
                                    <span class="detail-label">Start Time:</span>
                                    <span class="detail-value">${data.start_time}</span>
                                </div>
                                ` : ''}
                                ${data.end_time ? `
                                <div class="detail-row">
                                    <span class="detail-label">End Time:</span>
                                    <span class="detail-value">${data.end_time}</span>
                                </div>
                                ` : ''}
                                ${data.report_time ? `
                                <div class="detail-row">
                                    <span class="detail-label">Report Time:</span>
                                    <span class="detail-value">${data.report_time}</span>
                                </div>
                                ` : ''}
                                ${data.vehicle_type ? `
                                <div class="detail-row">
                                    <span class="detail-label">Vehicle Type:</span>
                                    <span class="detail-value">${data.vehicle_type}</span>
                                </div>
                                ` : ''}
                                ${data.guest_count ? `
                                <div class="detail-row">
                                    <span class="detail-label">Guest Count:</span>
                                    <span class="detail-value">${data.guest_count}</span>
                                </div>
                                ` : ''}
                                ${data.customer_name ? `
                                <div class="detail-row">
                                    <span class="detail-label">Customer:</span>
                                    <span class="detail-value">${data.customer_name}</span>
                                </div>
                                ` : ''}
                                ${data.company_name ? `
                                <div class="detail-row">
                                    <span class="detail-label">Company:</span>
                                    <span class="detail-value">${data.company_name}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            ${data.pickup_address || data.reporting_address ? `
                            <div class="location-section">
                                <div class="location-label">📍 Pickup Location</div>
                                <div class="location-address">${data.pickup_address || data.reporting_address}</div>
                            </div>
                            ` : ''}
                            
                            ${data.drop_address ? `
                            <div class="location-section">
                                <div class="location-label">📍 Drop Location</div>
                                <div class="location-address">${data.drop_address}</div>
                            </div>
                            ` : ''}
                            
                            ${data.from_city || data.to_city ? `
                            <div class="ride-details">
                                <h3>🗺️ Route Details</h3>
                                ${data.from_city ? `
                                <div class="detail-row">
                                    <span class="detail-label">From City:</span>
                                    <span class="detail-value">${data.from_city}</span>
                                </div>
                                ` : ''}
                                ${data.to_city ? `
                                <div class="detail-row">
                                    <span class="detail-label">To City:</span>
                                    <span class="detail-value">${data.to_city}</span>
                                </div>
                                ` : ''}
                            </div>
                            ` : ''}
                            
                            ${data.remarks || data.operator_notes ? `
                            <div class="note-box">
                                <strong>📝 Special Notes:</strong><br>
                                ${data.remarks || data.operator_notes || ''}
                            </div>
                            ` : ''}
                            
                            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                                <strong>Next Steps:</strong><br>
                                • Review the ride details carefully<br>
                                • Assign an appropriate vehicle and driver<br>
                                • Ensure timely pickup and professional service<br>
                                • Contact the customer if you have any questions
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p><strong>© ${new Date().getFullYear()} FleetIQ</strong> - VIP Fleet Management Solution</p>
                            <p>This is an automated notification. Please do not reply to this email.</p>
                            <div class="company-info">
                                <p><strong>Plixr Technologies Pvt. Ltd.</strong></p>
                                <p>Building the future of fleet management</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
FleetIQ - New VIP Ride Assignment

Hello ${data.vendor_name || 'Vendor'},

You have been assigned a new VIP ride. Please review the details below:

${data.ride_id ? `Ride ID: #${data.ride_id}` : 'New Ride Assignment'}

RIDE INFORMATION:
- Ride Date: ${data.start_date ? new Date(data.start_date).toLocaleDateString() : 'Not specified'}
${data.start_time ? `- Start Time: ${data.start_time}` : ''}
${data.end_time ? `- End Time: ${data.end_time}` : ''}
${data.report_time ? `- Report Time: ${data.report_time}` : ''}
${data.vehicle_type ? `- Vehicle Type: ${data.vehicle_type}` : ''}
${data.guest_count ? `- Guest Count: ${data.guest_count}` : ''}
${data.customer_name ? `- Customer: ${data.customer_name}` : ''}
${data.company_name ? `- Company: ${data.company_name}` : ''}

LOCATIONS:
${data.pickup_address ? `Pickup: ${data.pickup_address}` : data.reporting_address ? `Reporting: ${data.reporting_address}` : ''}
${data.drop_address ? `Drop: ${data.drop_address}` : ''}

${data.from_city || data.to_city ? `
ROUTE:
${data.from_city ? `From: ${data.from_city}` : ''}
${data.to_city ? `To: ${data.to_city}` : ''}
` : ''}

${data.remarks || data.operator_notes ? `
SPECIAL NOTES:
${data.remarks || data.operator_notes || ''}
` : ''}

NEXT STEPS:
• Review the ride details carefully
• Assign an appropriate vehicle and driver
• Ensure timely pickup and professional service
• Contact the customer if you have any questions

---
© ${new Date().getFullYear()} FleetIQ by Plixr Technologies Pvt. Ltd.
This is an automated notification. Please do not reply.
            `
        },

        // Default/Generic template
        default: {
            subject: (data) => data.subject || 'Notification from FleetIQ',
            html: (data) => `
                < !DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>FleetIQ Notification</title>
                            <style>
                                body {font - family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                                .email-container {max - width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                                .header {background - color: #007bff; color: white; padding: 20px; text-align: center; }
                                .content {padding: 30px; }
                                .footer {background - color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                            </style>
                        </head>
                        <body>
                            <div class="email-container">
                                <div class="header">
                                    <h1>FleetIQ</h1>
                                </div>
                                <div class="content">
                                    <h2>Hello ${data.employee_name || 'User'},</h2>
                                    <p>${data.message || 'You have received a notification from FleetIQ.'}</p>
                                    ${data.additional_content || ''}
                                </div>
                                <div class="footer">
                                    <p>© 2024 FleetIQ by Plixr Technologies Pvt. Ltd.</p>
                                    <p>This is an automated message, please do not reply.</p>
                                </div>
                            </div>
                        </body>
                    </html>
                    `,
            text: (data) => `
                    FleetIQ Notification

                    Hello ${data.employee_name || 'User'},

                    ${data.message || 'You have received a notification from FleetIQ.'}

                    ${data.additional_content || ''}

                    © 2024 FleetIQ by Plixr Technologies Pvt. Ltd.
                    This is an automated message, please do not reply.
                    `
        },

        // VIP Ride Start OTP Email Template
        vip_ride_start_otp: {
            subject: (data) => `Your Ride ${data.otp_type === 'start' ? 'Start' : 'End'} OTP - FleetIQ`,
            html: (data) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Ride ${data.otp_type === 'start' ? 'Start' : 'End'} OTP</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .email-container { max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px 20px; text-align: center; }
                        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 16px; }
                        .content { padding: 30px; }
                        
                        /* Card Styles */
                        .card { background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 20px 0; border: 1px solid #e0e0e0; }
                        .card-header { font-size: 20px; font-weight: 600; color: #007bff; margin-bottom: 20px; display: flex; align-items: center; }
                        .card-header::before { content: ''; width: 4px; height: 24px; background: #007bff; margin-right: 10px; border-radius: 2px; }
                        
                        /* Ride Details Card */
                        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #dee2e6; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #495057; font-size: 14px; }
                        .detail-value { color: #6c757d; text-align: right; font-size: 14px; max-width: 60%; }
                        
                        /* OTP Card */
                        .otp-card { background: linear-gradient(145deg, #fff 0%, #f8f9fa 100%); text-align: center; }
                        .otp-label { font-size: 16px; color: #6c757d; margin-bottom: 15px; font-weight: 500; }
                        .otp-box { background: linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%); border: 3px solid #007bff; padding: 25px; border-radius: 12px; margin: 20px 0; }
                        .otp-code { font-size: 48px; font-weight: bold; color: #007bff; letter-spacing: 12px; font-family: 'Courier New', monospace; margin: 10px 0; }
                        .otp-instruction { font-size: 14px; color: #495057; margin-top: 15px; line-height: 1.8; }
                        
                        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #dee2e6; }
                        .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                        .company-info { margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; }
                        
                        @media (max-width: 600px) {
                            .email-container { margin: 10px; }
                            .content { padding: 20px; }
                            .card { padding: 15px; }
                            .otp-code { font-size: 36px; letter-spacing: 8px; }
                            .detail-row { flex-direction: column; }
                            .detail-value { text-align: left; margin-top: 5px; max-width: 100%; }
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>🚗 FleetIQ</h1>
                            <p>VIP Ride ${data.otp_type === 'start' ? 'Start' : 'End'} Verification</p>
                        </div>
                        
                        <div class="content">
                            <p style="font-size: 16px; color: #2c3e50; margin-bottom: 25px;">
                                Hello <strong>${data.customer_name || 'Valued Customer'}</strong>,
                            </p>
                            
                            <p style="margin-bottom: 25px;">Your ride is ready to ${data.otp_type === 'start' ? 'begin' : 'end'}. Please share the OTP below with your driver to ${data.otp_type === 'start' ? 'start' : 'complete'} your journey.</p>
                            
                            <!-- Card 1: Ride Booking Details -->
                            <div class="card">
                                <div class="card-header">📋 Ride Details</div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Booking ID:</span>
                                    <span class="detail-value">#${data.booking_id || 'N/A'}</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Customer Name:</span>
                                    <span class="detail-value">${data.customer_name || 'N/A'}</span>
                                </div>
                                
                                ${data.customer_mobile ? `
                                <div class="detail-row">
                                    <span class="detail-label">Contact:</span>
                                    <span class="detail-value">${data.customer_mobile}</span>
                                </div>
                                ` : ''}
                                
                                <div class="detail-row">
                                    <span class="detail-label">Ride Date:</span>
                                    <span class="detail-value">${data.start_date ? new Date(data.start_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Pickup Time:</span>
                                    <span class="detail-value">${data.start_time || 'N/A'}</span>
                                </div>
                                
                                ${data.end_time ? `
                                <div class="detail-row">
                                    <span class="detail-label">Drop Time:</span>
                                    <span class="detail-value">${data.end_time}</span>
                                </div>
                                ` : ''}
                                
                                ${data.from_city || data.to_city ? `
                                <div class="detail-row">
                                    <span class="detail-label">Route:</span>
                                    <span class="detail-value">${data.from_city || 'N/A'} → ${data.to_city || 'N/A'}</span>
                                </div>
                                ` : ''}
                                
                                ${data.pickup_address ? `
                                <div class="detail-row">
                                    <span class="detail-label">📍 Pickup Address:</span>
                                    <span class="detail-value">${data.pickup_address}</span>
                                </div>
                                ` : ''}
                                
                                ${data.drop_address ? `
                                <div class="detail-row">
                                    <span class="detail-label">📍 Drop Address:</span>
                                    <span class="detail-value">${data.drop_address}</span>
                                </div>
                                ` : ''}
                                
                                ${data.vehicle_number ? `
                                <div class="detail-row">
                                    <span class="detail-label">🚙 Vehicle:</span>
                                    <span class="detail-value">${data.vehicle_number}${data.vehicle_model ? ` - ${data.vehicle_model}` : ''}</span>
                                </div>
                                ` : ''}
                                
                                ${data.driver_name ? `
                                <div class="detail-row">
                                    <span class="detail-label">👤 Driver:</span>
                                    <span class="detail-value">${data.driver_name}${data.driver_mobile ? ` (${data.driver_mobile})` : ''}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Card 2: OTP Verification -->
                            <div class="card otp-card">
                                <div class="card-header" style="justify-content: center;">
                                    <span>🔐 Ride Verification OTP</span>
                                </div>
                                
                                <div class="otp-label">Share this code with your driver</div>
                                
                                <div class="otp-box">
                                    <div class="otp-code">${data.otp}</div>
                                </div>
                                
                                <div class="otp-instruction">
                                    ✓ This OTP is required to ${data.otp_type === 'start' ? 'start' : 'complete'} your ride<br>
                                    ✓ Do not share this code with anyone except your assigned driver<br>
                                    ✓ Verify driver details before sharing the OTP
                                </div>
                            </div>
                            
                            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                                If you did not request this ride or have any concerns, please contact our support team immediately.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p><strong>© ${new Date().getFullYear()} FleetIQ</strong> - Premium Fleet Management Solution</p>
                            <p>This is an automated message from FleetIQ. Please do not reply to this email.</p>
                            <div class="company-info">
                                <p><strong>Plixr Technologies Pvt. Ltd.</strong></p>
                                <p>Building the future of fleet management</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: (data) => `
FleetIQ - Ride ${data.otp_type === 'start' ? 'Start' : 'End'} OTP

Hello ${data.customer_name || 'Valued Customer'},

Your ride is ready to ${data.otp_type === 'start' ? 'begin' : 'end'}. Please share the OTP below with your driver.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RIDE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Booking ID: #${data.booking_id || 'N/A'}
Customer: ${data.customer_name || 'N/A'}
${data.customer_mobile ? `Contact: ${data.customer_mobile}` : ''}
Ride Date: ${data.start_date ? new Date(data.start_date).toLocaleDateString() : 'N/A'}
Pickup Time: ${data.start_time || 'N/A'}
${data.end_time ? `Drop Time: ${data.end_time}` : ''}
${data.from_city || data.to_city ? `Route: ${data.from_city || 'N/A'} → ${data.to_city || 'N/A'}` : ''}
${data.pickup_address ? `Pickup Address: ${data.pickup_address}` : ''}
${data.drop_address ? `Drop Address: ${data.drop_address}` : ''}
${data.vehicle_number ? `Vehicle: ${data.vehicle_number}${data.vehicle_model ? ` - ${data.vehicle_model}` : ''}` : ''}
${data.driver_name ? `Driver: ${data.driver_name}${data.driver_mobile ? ` (${data.driver_mobile})` : ''}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RIDE ${data.otp_type === 'start' ? 'START' : 'END'} OTP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${data.otp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT:
✓ Share this code only with your assigned driver
✓ Verify driver details before sharing the OTP
✓ This OTP is required to ${data.otp_type === 'start' ? 'start' : 'complete'} your ride

If you did not request this ride, please contact support immediately.

---
© ${new Date().getFullYear()} FleetIQ - Fleet Management Solution
Plixr Technologies Pvt. Ltd.

This is an automated message. Please do not reply.
            `
        }
    },

    // Common email settings
    settings: {
        defaultTimeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 2000, // 2 seconds
        enableLogging: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    }
};

module.exports = emailConfig;
