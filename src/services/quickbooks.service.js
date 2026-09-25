const axios = require('axios');
const logger = require('../utils/logger');
const qbConfig = require('../config/quickbooks');

class QuickBooksService {
  logAxiosError(message, error, context = {}) {
    logger.error(message, {
      ...context,
      error: error.message,
      qbHttpStatus: error.response?.status
    });
  }

  async refreshAccessToken(refreshToken, requestId) {
    try {
      logger.info('Refreshing QuickBooks access token', { requestId });
      
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/tokens/bearer', 
        `grant_type=refresh_token&refresh_token=${refreshToken}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${qbConfig.clientId}:${qbConfig.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('QuickBooks token refresh succeeded', {
        requestId,
        qbHttpStatus: response.status
      });
      qbConfig.setAccessToken(response.data.access_token, response.data.expires_in);
      return response.data;
    } catch (error) {
      this.logAxiosError('Failed to refresh access token', error, { requestId });
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

  async createPayment(paymentData, requestId) {
    try {
      logger.info('Creating payment in QuickBooks', { requestId, customerId: paymentData.customerId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments`;
      const response = await axios.post(url, paymentData, {
        headers: qbConfig.getHeaders(),
        timeout: parseInt(process.env.PAYMENT_TIMEOUT_MS || 30000)
      });

      logger.info('Payment created successfully', {
        requestId,
        paymentId: response.data.id,
        qbHttpStatus: response.status
      });
      return response.data;
    } catch (error) {
      this.logAxiosError('Failed to create payment', error, {
        requestId,
        customerId: paymentData.customerId
      });
      throw error;
    }
  }

  async getPaymentStatus(paymentId, requestId) {
    try {
      logger.info('Fetching payment status', { requestId, paymentId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments/${paymentId}`;
      const response = await axios.get(url, {
        headers: qbConfig.getHeaders()
      });

      logger.info('Fetched payment status from QuickBooks', {
        requestId,
        paymentId,
        qbHttpStatus: response.status
      });
      return response.data;
    } catch (error) {
      this.logAxiosError('Failed to fetch payment status', error, { requestId, paymentId });
      throw error;
    }
  }

  async refundPayment(paymentId, refundData, requestId) {
    try {
      logger.info('Processing refund', { requestId, paymentId });
      
      const url = `${qbConfig.getBaseUrl()}/v2/payments/${paymentId}/refunds`;
      const response = await axios.post(url, refundData, {
        headers: qbConfig.getHeaders()
      });

      logger.info('Refund processed successfully', {
        requestId,
        paymentId,
        refundId: response.data.id,
        qbHttpStatus: response.status
      });
      return response.data;
    } catch (error) {
      this.logAxiosError('Failed to process refund', error, { requestId, paymentId });
      throw error;
    }
  }
}

module.exports = new QuickBooksService();