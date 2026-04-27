/**
 * Email Service - Handles email sending operations
 */
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Check if email is configured
        this.isConfigured =
            process.env.EMAIL_USER &&
            process.env.EMAIL_USER !== 'your-email@gmail.com' &&
            process.env.EMAIL_PASSWORD &&
            process.env.EMAIL_PASSWORD !== 'your-app-password-here';

        if (this.isConfigured) {
            // Create transporter using Gmail SMTP or custom SMTP
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });
        } else {
            console.warn('⚠️  EMAIL NOT CONFIGURED - Running in TEST MODE');
            console.warn('📧 OTPs will be logged to console instead of being sent via email');
        }
    }

    /**
     * Send OTP email to user
     * @param {string} email - Recipient email
     * @param {string} otp - 6-digit OTP
     * @param {string} userName - User's name for personalization
     */
    async sendOTPEmail(email, otp, userName) {
        // Test mode - log OTP to console
        if (!this.isConfigured) {
            console.log('\n' + '='.repeat(60));
            console.log('🔐 TEST MODE - OTP Generated');
            console.log('='.repeat(60));
            console.log(`📧 To: ${email}`);
            console.log(`👤 Name: ${userName}`);
            console.log(`🔢 OTP: ${otp}`);
            console.log(`⏰ Expires: 5 minutes`);
            console.log('='.repeat(60) + '\n');
            return { success: true, messageId: 'test-mode', testMode: true };
        }

        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'NextGen FireDesk'}" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset OTP - NextGen FireDesk',
                html: this._getOTPEmailTemplate(otp, userName),
                text: `Hello ${userName}, Your OTP is: ${otp}. This OTP will expire in 5 minutes.`,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('OTP email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new Error('Failed to send OTP email');
        }
    }

    /**
     * Send password reset confirmation email
     * @param {string} email - Recipient email
     * @param {string} userName - User's name
     */
    async sendPasswordResetConfirmation(email, userName) {
        if (!this.isConfigured) {
            console.log('\n✅ TEST MODE - Password Reset Confirmation for:', email);
            return { success: true, messageId: 'test-mode', testMode: true };
        }

        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'NextGen FireDesk'}" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset Successful - NextGen FireDesk',
                text: `Hello ${userName}, Your password has been successfully reset.`,
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * OTP Email HTML Template
     * @private
     */
    _getOTPEmailTemplate(otp, userName) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
                .otp-box { background: #4CAF50; color: white; font-size: 32px; text-align: center; padding: 20px; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔐 Password Reset Request</h1>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Use the following OTP to reset your password:</p>
                <div class="otp-box">${otp}</div>
                <p><strong>This OTP expires in 5 minutes.</strong></p>
                <div class="warning">⚠️ If you didn't request this, please ignore this email.</div>
                <p>Best regards,<br><strong>NextGen FireDesk Team</strong></p>
            </div>
        </body>
        </html>`;
    }
}

module.exports = new EmailService();
