const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const PLAID_ENVIRONMENT_MAP = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production
};

class PlaidConfig {
  constructor() {
    this.clientId = process.env.PLAID_CLIENT_ID;
    this.secret = process.env.PLAID_SECRET;
    this.environment = process.env.PLAID_ENV || 'sandbox';
    this.webhookUrl = process.env.PLAID_WEBHOOK_URL;
  }

  getEnvironment() {
    return PLAID_ENVIRONMENT_MAP[this.environment] || PlaidEnvironments.sandbox;
  }

  isProduction() {
    return this.environment === 'production';
  }

  isConfigured() {
    return Boolean(this.clientId && this.secret);
  }

  createClient() {
    return new PlaidApi(new Configuration({
      basePath: this.getEnvironment(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.clientId,
          'PLAID-SECRET': this.secret,
          'Plaid-Version': '2020-09-14'
        }
      }
    }));
  }
}

module.exports = new PlaidConfig();
