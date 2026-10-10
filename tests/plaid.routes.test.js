const request = require('supertest');

jest.mock('../src/services/plaid.service', () => ({
  createLinkToken: jest.fn(),
  exchangePublicToken: jest.fn(),
  createTransfer: jest.fn(),
  getTransfer: jest.fn(),
  simulateTransferEvent: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  processWebhook: jest.fn()
}));

const plaidService = require('../src/services/plaid.service');
const app = require('../src/index');

describe('Plaid Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a link token and preserves x-request-id correlation', async () => {
    plaidService.createLinkToken.mockResolvedValue({
      linkToken: 'link-sandbox-token',
      expiration: '2026-09-26T00:00:00Z',
      plaidRequestId: 'plaid-request-1'
    });

    const response = await request(app)
      .post('/api/plaid/link-token')
      .set('x-request-id', 'request-123')
      .send({ userId: 'user-123' })
      .expect(200);

    expect(response.headers['x-request-id']).toBe('request-123');
    expect(response.body.success).toBe(true);
    expect(response.body.requestId).toBe('request-123');
    expect(plaidService.createLinkToken).toHaveBeenCalledWith({
      userId: 'user-123',
      language: 'en',
      countryCodes: ['US']
    }, {
      requestId: 'request-123'
    });
  });

  it('validates Plaid transfer requests', async () => {
    const response = await request(app)
      .post('/api/plaid/transfers')
      .send({
        accessTokenReference: 'ref-123',
        accountId: 'account-123',
        amount: '10.00'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(plaidService.createTransfer).not.toHaveBeenCalled();
  });

  it('verifies and processes Plaid webhooks', async () => {
    plaidService.verifyWebhookSignature.mockResolvedValue({
      plaidRequestId: 'plaid-request-2',
      verificationKeyId: 'verification-key-1'
    });
    plaidService.processWebhook.mockResolvedValue({
      transferId: 'transfer-123',
      eventType: 'settled',
      webhookType: 'TRANSFER',
      webhookCode: 'TRANSFER_EVENTS_UPDATE'
    });

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      transfer_id: 'transfer-123',
      event_type: 'settled'
    };

    const response = await request(app)
      .post('/api/plaid/webhook')
      .set('Plaid-Verification', 'signed.jwt.token')
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(plaidService.verifyWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify(payload),
      'signed.jwt.token',
      { requestId: response.body.requestId }
    );
    expect(plaidService.processWebhook).toHaveBeenCalledWith(payload, {
      requestId: response.body.requestId
    });
  });
});
