const axios = require('axios');
const logger = require('../utils/logger');

const QB_SANDBOX_URL = 'https://quickbooks.api.intuit.com';
const QB_PROD_URL = 'https://quickbooks.api.intuit.com';

class QuickBooksConfig {
  constructor() {
    this.realmId = process.env.QUICKBOOKS_REALM_ID;
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID;
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    this.environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  getBaseUrl() {
    return this.environment === 'production' ? QB_PROD_URL : QB_SANDBOX_URL;
  }

  isTokenExpired() {
    return !this.accessToken || (this.tokenExpiry && Date.now() > this.tokenExpiry);
  }

  setAccessToken(token, expiresIn) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    logger.info('QuickBooks access token updated');
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = new QuickBooksConfig();