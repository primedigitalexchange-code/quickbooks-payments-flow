const crypto = require('crypto');
const PlaidStore = require('../src/stores/plaid.store');
const { PlaidService } = require('../src/services/plaid.service');

describe('PlaidService', () => {
  let client;
  let config;
  let store;
  let service;

  beforeEach(() => {
    client = {
      itemPublicTokenExchange: jest.fn(),
      accountsGet: jest.fn(),
      transferAuthorizationCreate: jest.fn(),
      transferCreate: jest.fn(),
      transferGet: jest.fn(),
      webhookVerificationKeyGet: jest.fn()
    };

    config = {
      isConfigured: () => true,
      createClient: () => client,
      isProduction: () => false,
      webhookUrl: 'http://localhost:3000/api/plaid/webhook'
    };

    store = new PlaidStore();
    service = new PlaidService({ client, config, store });
  });

  it('exchanges a public token without returning the raw access token', async () => {
    client.itemPublicTokenExchange.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'access-sandbox-token',
        item_id: 'item-123',
        request_id: 'plaid-request-1'
      }
    });
    client.accountsGet.mockResolvedValue({
      status: 200,
      data: {
        accounts: [
          {
            account_id: 'account-123',
            name: 'Checking',
            mask: '0000',
            subtype: 'checking',
            type: 'depository'
          }
        ],
        request_id: 'plaid-request-2'
      }
    });

    const result = await service.exchangePublicToken({
      publicToken: 'public-sandbox-token',
      userId: 'user-123'
    }, {
      requestId: 'request-123'
    });

    expect(result).toMatchObject({
      itemId: 'item-123',
      plaidRequestId: 'plaid-request-1',
      accounts: [
        {
          accountId: 'account-123',
          name: 'Checking',
          mask: '0000',
          subtype: 'checking',
          type: 'depository'
        }
      ]
    });
    expect(result.accessToken).toBeUndefined();
    expect(store.getItem(result.accessTokenReference)).toMatchObject({
      accessToken: 'access-sandbox-token',
      itemId: 'item-123',
      userId: 'user-123'
    });
  });

  it('creates a transfer after an approved authorization', async () => {
    store.saveItem({
      accessTokenReference: 'ref-123',
      accessToken: 'access-sandbox-token',
      userId: 'user-123'
    });

    client.transferAuthorizationCreate.mockResolvedValue({
      status: 200,
      data: {
        authorization: {
          id: 'auth-123',
          decision: 'approved'
        },
        request_id: 'plaid-request-3'
      }
    });
    client.transferCreate.mockResolvedValue({
      status: 200,
      data: {
        transfer: {
          id: 'transfer-123',
          amount: '12.34',
          iso_currency_code: 'USD',
          description: 'SMOKECHK',
          status: 'pending',
          type: 'debit',
          network: 'ach'
        },
        request_id: 'plaid-request-4'
      }
    });

    const result = await service.createTransfer({
      accessTokenReference: 'ref-123',
      accountId: 'account-123',
      amount: '12.34',
      currency: 'USD',
      description: 'SMOKECHK',
      type: 'debit',
      achClass: 'ppd',
      user: {
        legalName: 'Sandbox User'
      }
    }, {
      requestId: 'request-456'
    });

    expect(client.transferAuthorizationCreate).toHaveBeenCalled();
    expect(client.transferCreate).toHaveBeenCalled();
    expect(result.transfer.id).toBe('transfer-123');
    expect(store.getTransfer('transfer-123')).toMatchObject({
      authorizationId: 'auth-123',
      status: 'pending'
    });
  });

  it('verifies Plaid webhook signatures against the raw body hash', async () => {
    const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwk = await exportJWK(publicKey);
    const rawBody = JSON.stringify({
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      transfer_id: 'transfer-123',
      event_type: 'settled'
    });

    jwk.alg = 'ES256';
    jwk.kid = 'verification-key-1';
    jwk.use = 'sig';

    const token = await new SignJWT({
      request_body_sha256: crypto.createHash('sha256').update(rawBody).digest('hex')
    })
      .setProtectedHeader({
        alg: 'ES256',
        kid: 'verification-key-1'
      })
      .sign(privateKey);

    client.webhookVerificationKeyGet.mockResolvedValue({
      status: 200,
      data: {
        key: jwk,
        request_id: 'plaid-request-5'
      }
    });

    const result = await service.verifyWebhookSignature(rawBody, token, {
      requestId: 'request-789'
    });

    expect(result).toMatchObject({
      plaidRequestId: 'plaid-request-5',
      verificationKeyId: 'verification-key-1'
    });
  });
});
