/**
 * Password Service - Handles password reset and OTP logic
 */
const bcrypt = require('bcryptjs');
const { User } = require('../../models/user-management');
const { sendSMS } = require('../notifications/sendSMS');
// const email_service = require('../email_service'); // Replaced by SMS

class PasswordService {
    /**
     * Generate a 6-digit OTP
     * @returns {string}
     */
    _generate_otp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Initiate forgot password - send OTP to REGISTERED PHONE via SMS
     * User enters email -> System finds user -> Sends OTP to user's phone
     * @param {string} email - User email
     * @returns {Promise<{success: boolean, message: string, phone_mask?: string}>}
     */
    async forgot_password(email) {
        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw { status: 404, message: "No account found with this email address" };
        }

        // Check if user is active
        if (user.status && user.status.toLowerCase() === 'inactive') {
            throw { status: 403, message: "Your account is not active. Please contact support." };
        }

        // Validate Phone Number existence
        if (!user.phone) {
            throw { status: 400, message: "No phone number linked to this account. Cannot send OTP via SMS." };
        }

        // Generate OTP
        const otp = this._generate_otp();

        // Set OTP expiry to 5 minutes from now
        // IMPORTANT: PostgreSQL TIMESTAMP stores without timezone, but JS reads as UTC
        // We need to add IST offset (5.5 hours) so when JS reads back, the times match
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
        const expires_at_ms = Date.now() + 5 * 60 * 1000 + IST_OFFSET_MS;
        const expires_at_date = new Date(expires_at_ms);

        console.log(`[OTP SAVE] Generating OTP: ${otp}, Expiry: ${expires_at_date.toISOString()}`);

        // Update user with OTP
        await user.update({
            otp: otp,
            otp_expiry: expires_at_date,
            otp_is_used: false
        });

        console.log(`[OTP SAVE] Saved to DB for user: ${user.email}`);

        // Send OTP via SMS
        let sms_sent = false;
        try {
            // EXACT registered template from old codebase
            const message = `Your Firedesk password reset request has been received. Use the OTP ${otp} to reset your password. - Team LEISTUNG TECHNOLOGIES`;
            sms_sent = await sendSMS(user.phone, message);
        } catch (error) {
            console.error("SMS Service Error:", error.message);
        }

        // Mask phone number for display (e.g., *******890)
        const phone_mask = user.phone.replace(/.(?=.{4})/g, '*');

        // TEST MODE: If SMS fails, log OTP to console so user can still test
        if (!sms_sent) {
            console.log('\n' + '='.repeat(60));
            console.log('🔐 TEST MODE - SMS Failed, OTP logged for testing');
            console.log('='.repeat(60));
            console.log(`📱 Phone: ${user.phone}`);
            console.log(`🔢 OTP: ${otp}`);
            console.log(`⏰ Expires: 5 minutes`);
            console.log('='.repeat(60) + '\n');
        }

        return {
            success: true,
            message: sms_sent
                ? `OTP sent to your registered phone number ending in ${user.phone.slice(-4)}`
                : `OTP generated (check console). SMS delivery PENDING template approval.`,
            phone_mask: phone_mask,
            ...(process.env.NODE_ENV === 'development' && !sms_sent && { otp: otp, test_mode: true })
        };
    }

    /**
     * Verify OTP
     * @param {string} email - User email (used to identify user)
     * @param {string} otp - OTP to verify
     * @returns {Promise<{success: boolean, email: string}>}
     */
    async verify_otp(email, otp) {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        // Check if OTP exists
        if (!user.otp) {
            throw { status: 400, message: "No OTP found. Please request a new one." };
        }

        // Check if OTP has been used
        if (user.otp_is_used) {
            throw { status: 400, message: "This OTP has already been used. Please request a new one." };
        }

        // Check if OTP has expired (expiry comes back as Date from PostgreSQL)
        const now_ms = Date.now();
        // Handle both Date object and string (for backwards compatibility)
        const expiry_ms = user.otp_expiry instanceof Date
            ? user.otp_expiry.getTime()
            : new Date(user.otp_expiry).getTime();
        console.log(`[OTP DEBUG] Now: ${now_ms}, Expiry: ${expiry_ms}, Diff: ${(expiry_ms - now_ms) / 1000}s`);
        if (now_ms > expiry_ms) {
            throw { status: 400, message: "OTP has expired. Please request a new one." };
        }

        // Verify OTP
        if (user.otp !== otp) {
            throw { status: 400, message: "Invalid OTP. Please try again." };
        }

        return {
            success: true,
            email: email
        };
    }

    /**
     * Reset password after OTP verification
     * @param {string} email - User email
     * @param {string} otp - OTP for verification
     * @param {string} new_password - New password
     * @returns {Promise<{success: boolean}>}
     */
    async reset_password(email, otp, new_password) {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        // Verify OTP again for security
        if (!user.otp) {
            throw { status: 400, message: "No OTP found. Please request a new one." };
        }

        if (user.otp_is_used) {
            throw { status: 400, message: "This OTP has already been used. Please request a new one." };
        }

        const now_ms = Date.now();
        const expiry_ms = user.otp_expiry instanceof Date
            ? user.otp_expiry.getTime()
            : new Date(user.otp_expiry).getTime();
        if (now_ms > expiry_ms) {
            throw { status: 400, message: "OTP has expired. Please request a new one." };
        }

        if (user.otp !== otp) {
            throw { status: 400, message: "Invalid OTP" };
        }

        // Hash new password
        const hashed_password = await bcrypt.hash(new_password, 10);

        // Update password and invalidate OTP
        await user.update({
            password: hashed_password,
            otp: null,
            otp_expiry: null,
            otp_is_used: true
        });

        // Optionally send confirmation SMS?
        // await sendSMS(user.phone, "Your password has been changed successfully.");

        return { success: true };
    }
}

module.exports = new PasswordService();
