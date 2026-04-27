/**
 * SMS Notification Service
 * Uses SMSCountry API (https://restapi.smscountry.com)
 */
const axios = require('axios');

/**
 * Send SMS via SMSCountry
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<boolean>}
 */
const sendSMS = async (phoneNumber, message) => {
    try {
        const authKey = process.env.SMS_AUTH_KEY;
        const authToken = process.env.SMS_AUTH_TOKEN;
        const senderId = process.env.SMS_SENDERID;

        // Basic Auth header
        const authHeader = 'Basic ' + Buffer.from(`${authKey}:${authToken}`).toString('base64');

        // SMSCountry API URL
        const apiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${authKey}/SMSes/`;

        // Ensure phone number has country code (91 for India)
        let validNumber = phoneNumber.toString().replace(/\D/g, '');
        if (validNumber.length === 10) {
            validNumber = '91' + validNumber;
        }

        const jsonPayload = {
            Text: message,
            Number: validNumber,
            SenderId: senderId,
            DRNotifyUrl: 'https://www.firedesk.in/sms-notify',
            DRNotifyHttpMethod: 'POST',
            Tool: 'API',
        };

        console.log('[SMS Service] Sending to SMSCountry:', { number: validNumber, sender: senderId });

        const response = await axios.post(apiUrl, jsonPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });

        // SMSCountry returns Success: 'True' (string) on success
        if (response.data && (response.data.Success === 'True' || response.status === 200)) {
            console.log('[SMS Service] SMS sent successfully!', response.data);
            return true;
        } else {
            console.error('[SMS Service] Failed to send SMS:', response.data);
            return false;
        }
    } catch (error) {
        console.error('[SMS Service] Error:', error.response ? error.response.data : error.message);
        return false;
    }
};

module.exports = {
    sendSMS
};
