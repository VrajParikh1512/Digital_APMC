import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000/api';
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

// Fast2SMS requires 10-digit numbers without country code
const formatPhoneNumber = (number) => {
  const digits = number.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
  return digits; // Already 10-digit
};

const sendSMS = async (phoneNumber, message) => {
  const toNumber = formatPhoneNumber(phoneNumber);

  // Keep the console log for debugging
  console.log('--------------------------------------------------');
  console.log(`[SMS SERVICE] Sending SMS to ${toNumber}`);
  console.log(`Message: ${message}`);
  console.log('--------------------------------------------------');

  // Send real SMS via Fast2SMS REST API
  try {
    const response = await axios.get(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        params: {
          route: 'q',
          message: message,
          numbers: toNumber,
          flash: 0,
        },
        headers: {
          authorization: FAST2SMS_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (response.data.return) {
      console.log(`[SMS SERVICE] SMS sent successfully. Request ID: ${response.data.request_id}`);
      return true;
    } else {
      console.error(`[SMS SERVICE] Fast2SMS returned failure:`, JSON.stringify(response.data));
      return false;
    }
  } catch (err) {
    // Log the full response body from Fast2SMS for diagnosis
    const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[SMS SERVICE] Failed to send SMS to ${toNumber}: ${errorDetail}`);
    return false;
  }
};

const runNotificationJob = async () => {
  console.log('[CRON] Running crop verification notification job...');
  try {
    // 1. Fetch pending crops from the main backend
    const response = await axios.get(`${BACKEND_API_URL}/crops/notifications/pending`);
    const staleCrops = response.data;

    console.log(`[CRON] Found ${staleCrops.length} crops requiring verification reminders.`);

    if (staleCrops.length === 0) return;

    const notifiedCropIds = [];

    // 2. Send SMS for each crop
    for (const crop of staleCrops) {
      if (crop.farmer && crop.farmer.phoneNumber) {
        const message = `Hello ${crop.farmer.name}, your crop listing for "${crop.cropName}" was last updated over a week ago. Please verify and update its details on Digital APMC.`;

        const sent = await sendSMS(crop.farmer.phoneNumber, message);
        if (sent) {
          notifiedCropIds.push(crop._id);
        }
      }
    }

    // 3. Inform main backend to update the lastNotificationSentAt status
    if (notifiedCropIds.length > 0) {
      await axios.put(`${BACKEND_API_URL}/crops/notifications/mark-sent`, {
        cropIds: notifiedCropIds
      });
      console.log(`[CRON] Successfully marked ${notifiedCropIds.length} notifications as sent.`);
    }

  } catch (error) {
    console.error('[CRON] Error running notification job:', error.message);
  }
};

// Schedule to run every day at 06:00 AM
cron.schedule('0 6 * * *', runNotificationJob);

console.log('Notification Microservice started. Cron job scheduled for 06:00 AM daily.');
