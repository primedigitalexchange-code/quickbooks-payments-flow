const axios = require('axios');
const logger = require('../utils/logger');
const qbConfig = require('../config/quickbooks');

class QuickBooksService {
  async refreshAccessToken(refreshToken) {
    try {
      logger.info('Refreshing QuickBooks access token');
      
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/tokens/bearer', 
        `grant_type=refresh_token&refresh_token=${refreshToken}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${qbConfig.clientId}:${qbConfig.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      qbConfig.setAccessToken(response.data.access_token, response.data.expires_in);
      return response.data;
    } catch (error) {
      logger.error('Failed to refresh access token:', error.message);
      throw new Error('Token refresh failed');
    }
  }

  async getPaymentMethods() {
    try {
      logger.info('Fetching payment methods from QuickBooks');
      
      const url = `${qbConfig.getBaseUrl()}/v2/customers`;
      const response = await axios.get(url, {
        headers: qbConfig.getHeaders()
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch payment methods:', error.message);
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      logger.info('Creating payment in QuickBooks', { customerId: paymentData.customerId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments`;
      const response = await axios.post(url, paymentData, {
        headers: qbConfig.getHeaders(),
        timeout: parseInt(process.env.PAYMENT_TIMEOUT_MS || 30000)
      });

      logger.info('Payment created successfully', { paymentId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Failed to create payment:', error.message);
      throw error;
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      logger.info('Fetching payment status', { paymentId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments/${paymentId}`;
      const response = await axios.get(url, {
        headers: qbConfig.getHeaders()
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch payment status:', error.message);
      throw error;
    }
  }

  async refundPayment(paymentId, refundData) {
    try {
      logger.info('Processing refund', { paymentId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments/${paymentId}/refunds`;
      const response = await axios.post(url, refundData, {
        headers: qbConfig.getHeaders()
      });

      logger.info('Refund processed successfully', { refundId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Failed to process refund:', error.message);
      throw error;
    }
  }
}

module.exports = new QuickBooksService();