import crypto from 'crypto';
import axios from 'axios';
import config from 'config';

/**
 * Generate HMAC signature for the payload
 * @param payload - The data payload to be signed
 * @param secretKey - The pre-shared secret key
 * @returns {string} - The HMAC signature
 */
const generateHMACSignature = (payload: object, secretKey: string): string => {
  return crypto
    .createHmac('sha256', secretKey)
    .update(JSON.stringify(payload))
    .digest('hex');
};

/**
 * Push data securely to the server
 * @param payload - The data payload to be pushed
 * @returns {Promise<void>}
 */
export const pushDataToServer = async (payload: object): Promise<void> => {
  const url: string = config.get("apiURL");
  const secretKey: string = config.get("secretKey");

  // Generate HMAC signature
  const signature = generateHMACSignature(payload, secretKey);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature, // Include the HMAC signature
      },
    });
    console.log('Data pushed successfully:', response.data);
  } catch (error) {
    console.error('Failed to push data:', error.message);
  }
};