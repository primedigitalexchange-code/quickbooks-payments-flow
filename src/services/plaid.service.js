const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const plaidConfig = require('../config/plaid');
const PlaidStore = require('../stores/plaid.store');

class PlaidService {
  constructor({ client, store, config } = {}) {
    this.config = config || plaidConfig;
    this.client = client || (this.config.isConfigured() ? this.config.createClient() : null);
    this.store = store || new PlaidStore();
  }

  ensureConfigured() {
    if (!this.client) {
      const error = new Error('Plaid is not configured');
      error.statusCode = 503;
      throw error;
    }
  }

  buildRequestOptions(requestId) {
    if (!requestId) {
      return undefined;
    }

    return {
      headers: {
        'x-request-id': requestId
      }
    };
  }

  logSuccess(action, response, context = {}) {
    logger.info(`Plaid ${action} succeeded`, {
      requestId: context.requestId,
      plaidRequestId: response?.data?.request_id,
      plaidHttpStatus: response?.status
    });
  }

  throwPlaidError(action, error, context = {}) {
    const plaidError = error.response?.data || {};

    logger.error(`Plaid ${action} failed`, {
      requestId: context.requestId,
      plaidRequestId: plaidError.request_id,
      plaidHttpStatus: error.response?.status,
      plaidErrorCode: plaidError.error_code,
      plaidErrorType: plaidError.error_type,
      plaidErrorMessage: plaidError.error_message || error.message
    });

    const nextError = new Error(plaidError.error_message || error.message || `Plaid ${action} failed`);
    nextError.statusCode = error.response?.status || error.statusCode || 500;
    nextError.details = {
      plaidRequestId: plaidError.request_id,
      plaidErrorCode: plaidError.error_code,
      plaidErrorType: plaidError.error_type
    };

    throw nextError;
  }

  normalizeAmount(amount) {
    const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
    return parsed.toFixed(2);
  }

  buildTransferUser(user = {}, fallbackId) {
    return {
      legal_name: user.legalName || `Plaid User ${String(fallbackId || 'unknown').slice(0, 8)}`,
      email_address: user.emailAddress,
      phone_number: user.phoneNumber
    };
  }

  async createLinkToken(payload, context = {}) {
    this.ensureConfigured();

    const userId = payload.userId || payload.customerId;

    try {
      const response = await this.client.linkTokenCreate({
        client_name: payload.clientName || 'QuickBooks Payments Flow',
        language: payload.language || 'en',
        country_codes: payload.countryCodes || ['US'],
        products: ['auth', 'transfer'],
        webhook: payload.webhookUrl || this.config.webhookUrl,
        redirect_uri: payload.redirectUri,
        user: {
          client_user_id: userId
        }
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('linkTokenCreate', response, context);

      return {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        plaidRequestId: response.data.request_id
      };
    } catch (error) {
      this.throwPlaidError('linkTokenCreate', error, context);
    }
  }

  async exchangePublicToken(payload, context = {}) {
    this.ensureConfigured();

    try {
      const exchangeResponse = await this.client.itemPublicTokenExchange({
        public_token: payload.publicToken
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('itemPublicTokenExchange', exchangeResponse, context);

      const accessTokenReference = uuidv4();
      const accessToken = exchangeResponse.data.access_token;

      const accountsResponse = await this.client.accountsGet({
        access_token: accessToken
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('accountsGet', accountsResponse, context);

      this.store.saveItem({
        accessTokenReference,
        accessToken,
        itemId: exchangeResponse.data.item_id,
        userId: payload.userId || payload.customerId,
        accounts: accountsResponse.data.accounts,
        createdAt: new Date()
      });

      return {
        itemId: exchangeResponse.data.item_id,
        accessTokenReference,
        accounts: accountsResponse.data.accounts.map((account) => ({
          accountId: account.account_id,
          name: account.name,
          mask: account.mask,
          subtype: account.subtype,
          type: account.type
        })),
        plaidRequestId: exchangeResponse.data.request_id
      };
    } catch (error) {
      this.throwPlaidError('itemPublicTokenExchange', error, context);
    }
  }

  async createTransfer(payload, context = {}) {
    this.ensureConfigured();

    const item = this.store.getItem(payload.accessTokenReference);

    if (!item) {
      const error = new Error('Plaid access token reference not found');
      error.statusCode = 404;
      throw error;
    }

    try {
      const authorizationResponse = await this.client.transferAuthorizationCreate({
        access_token: item.accessToken,
        account_id: payload.accountId,
        type: payload.type,
        network: 'ach',
        amount: this.normalizeAmount(payload.amount),
        ach_class: payload.achClass,
        user: this.buildTransferUser(payload.user, item.userId),
        iso_currency_code: payload.currency,
        idempotency_key: uuidv4()
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('transferAuthorizationCreate', authorizationResponse, context);

      const authorization = authorizationResponse.data.authorization;

      if (authorization.decision !== 'approved') {
        const error = new Error(`Transfer authorization ${authorization.decision}`);
        error.statusCode = 400;
        error.details = authorization;
        throw error;
      }

      const transferResponse = await this.client.transferCreate({
        access_token: item.accessToken,
        account_id: payload.accountId,
        authorization_id: authorization.id,
        amount: this.normalizeAmount(payload.amount),
        description: payload.description,
        ach_class: payload.achClass,
        type: payload.type,
        network: 'ach',
        iso_currency_code: payload.currency,
        metadata: payload.metadata
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('transferCreate', transferResponse, context);

      const transfer = transferResponse.data.transfer;

      this.store.saveTransfer({
        id: transfer.id,
        accessTokenReference: payload.accessTokenReference,
        accountId: payload.accountId,
        authorizationId: authorization.id,
        amount: transfer.amount,
        currency: transfer.iso_currency_code,
        description: transfer.description,
        status: transfer.status,
        type: transfer.type,
        network: transfer.network,
        createdAt: new Date()
      });

      return {
        authorization: {
          id: authorization.id,
          decision: authorization.decision
        },
        transfer,
        plaidRequestId: transferResponse.data.request_id
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      this.throwPlaidError('transferCreate', error, context);
    }
  }

  async getTransfer(transferId, context = {}) {
    this.ensureConfigured();

    try {
      const response = await this.client.transferGet({
        transfer_id: transferId
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('transferGet', response, context);

      this.store.saveTransfer({
        id: response.data.transfer.id,
        status: response.data.transfer.status
      });

      return {
        transfer: response.data.transfer,
        events: this.store.getTransferEvents(transferId),
        plaidRequestId: response.data.request_id
      };
    } catch (error) {
      this.throwPlaidError('transferGet', error, context);
    }
  }

  async simulateTransferEvent(transferId, eventType, context = {}) {
    this.ensureConfigured();

    if (this.config.isProduction()) {
      const error = new Error('Sandbox transfer simulation is disabled in production');
      error.statusCode = 403;
      throw error;
    }

    try {
      const response = await this.client.sandboxTransferSimulate({
        transfer_id: transferId,
        event_type: eventType,
        webhook: this.config.webhookUrl
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('sandboxTransferSimulate', response, context);

      return {
        transferId,
        eventType,
        plaidRequestId: response.data.request_id
      };
    } catch (error) {
      this.throwPlaidError('sandboxTransferSimulate', error, context);
    }
  }

  async verifyWebhookSignature(rawBody, plaidVerification, context = {}) {
    this.ensureConfigured();

    if (!plaidVerification) {
      const error = new Error('Missing Plaid-Verification header');
      error.statusCode = 401;
      throw error;
    }

    try {
      const [encodedHeader] = plaidVerification.split('.');
      const jwtHeader = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));

      const keyResponse = await this.client.webhookVerificationKeyGet({
        key_id: jwtHeader.kid
      }, this.buildRequestOptions(context.requestId));

      this.logSuccess('webhookVerificationKeyGet', keyResponse, context);

      const { importJWK, jwtVerify } = await import('jose');
      const verificationKey = await importJWK(keyResponse.data.key, jwtHeader.alg);
      const verified = await jwtVerify(plaidVerification, verificationKey, {
        algorithms: [jwtHeader.alg]
      });
      const rawBodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');

      if (verified.payload.request_body_sha256 !== rawBodyHash) {
        const error = new Error('Plaid webhook body hash verification failed');
        error.statusCode = 401;
        throw error;
      }

      return {
        plaidRequestId: keyResponse.data.request_id,
        verificationKeyId: jwtHeader.kid,
        payload: verified.payload
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      const nextError = new Error('Plaid webhook verification failed');
      nextError.statusCode = 401;

      logger.warn('Plaid webhook verification failed', {
        requestId: context.requestId,
        error: error.message
      });

      throw nextError;
    }
  }

  async processWebhook(payload, context = {}) {
    const transferId = payload.transfer_id;
    const eventType = payload.event_type;

    logger.info('Plaid webhook received', {
      requestId: context.requestId,
      plaidRequestId: payload.request_id,
      plaidWebhookType: payload.webhook_type,
      plaidWebhookCode: payload.webhook_code,
      transferId
    });

    if (payload.webhook_type === 'TRANSFER' && payload.webhook_code === 'TRANSFER_EVENTS_UPDATE' && transferId) {
      this.store.saveTransfer({
        id: transferId,
        status: eventType
      });

      this.store.addTransferEvent(transferId, {
        eventType,
        plaidRequestId: payload.request_id,
        webhookCode: payload.webhook_code
      });
    }

    return {
      transferId,
      eventType,
      webhookType: payload.webhook_type,
      webhookCode: payload.webhook_code
    };
  }
}

module.exports = new PlaidService();
module.exports.PlaidService = PlaidService;
