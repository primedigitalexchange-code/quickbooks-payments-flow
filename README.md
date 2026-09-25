# QuickBooks Payments Flow

A complete, production-ready Node.js integration for QuickBooks payment processing with automatic retry logic, webhook handling, and comprehensive error management.

## Features

✅ **Payment Initiation** - Start payment flows with validation
✅ **Automatic Retry Logic** - Built-in retry mechanism for failed payments
✅ **Payment Status Tracking** - Real-time status monitoring
✅ **Refund Processing** - Full refund support with tracking
✅ **QuickBooks OAuth** - Secure token refresh and management
✅ **Webhook Support** - Handle payment status updates from QuickBooks
✅ **Error Handling** - Comprehensive error handling and logging
✅ **Request Validation** - Input validation using Joi
✅ **Security** - Helmet.js security headers and CORS support

## Architecture

```
src/
├── index.js              # Server entry point
├── config/
│   └── quickbooks.js     # QuickBooks configuration
├── services/
│   ├── payment.service.js    # Payment business logic
│   └── quickbooks.service.js # QB API integration
├── routes/
│   ├── payments.js       # Payment endpoints
│   ├── auth.js           # OAuth endpoints
│   └── webhooks.js       # Webhook endpoints
├── middleware/
│   └── validation.js     # Request validation
├── stores/
│   └── payment.store.js  # Payment data store
└── utils/
    └── logger.js         # Winston logger configuration
```

## Installation

```bash
# Clone the repository
git clone https://github.com/primedigitalexchange-code/quickbooks-payments-flow.git
cd quickbooks-payments-flow

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your QuickBooks credentials

# Start the server
npm start

# For development with auto-reload
npm run dev
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# QuickBooks API Configuration
QUICKBOOKS_REALM_ID=your_realm_id
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/auth/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'

# Server Configuration
PORT=3000
NODE_ENV=development

# Payment Configuration
PAYMENT_TIMEOUT_MS=30000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

## API Endpoints

### Payment Endpoints

#### Initiate Payment
```bash
POST /api/payments/initiate
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "customerId": "customer_123",
  "description": "Order #12345"
}

Response:
{
  "success": true,
  "data": {
    "id": "payment_uuid",
    "amount": 99.99,
    "currency": "USD",
    "customerId": "customer_123",
    "status": "initiated",
    "createdAt": "2026-09-04T12:00:00Z",
    "updatedAt": "2026-09-04T12:00:00Z"
  }
}
```

#### Process Payment
```bash
POST /api/payments/:paymentId/process
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "customerId": "customer_123",
  "paymentMethodId": "pm_123"
}

Response:
{
  "success": true,
  "data": {
    "id": "qb_payment_id",
    "status": "completed",
    "amount": 99.99
  }
}
```

#### Build Complete Bank Details
```bash
POST /api/payments/bank-details/complete
Content-Type: application/json

{
  "accountNumber": "123456789012",
  "routingNumber": "021000021",
  "bankName": "Chase Bank",
  "bankAddress": "270 Park Ave, New York, NY"
}
```

#### Get Payment Status
```bash
GET /api/payments/:paymentId/status

Response:
{
  "success": true,
  "data": {
    "id": "payment_uuid",
    "status": "completed",
    "amount": 99.99,
    "qbPaymentId": "qb_payment_id",
    "qbStatus": { ... }
  }
}
```

#### Refund Payment
```bash
POST /api/payments/:paymentId/refund
Content-Type: application/json

{
  "amount": 50.00
}

Response:
{
  "success": true,
  "data": {
    "id": "refund_id",
    "status": "completed",
    "amount": 50.00
  }
}
```

### Authentication Endpoints

#### Refresh OAuth Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}

Response:
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "expires_in": 3600
  }
}
```

### Webhook Endpoints

#### Payment Status Webhook
```bash
POST /api/webhooks/payment-status
Content-Type: application/json

{
  "paymentId": "payment_uuid",
  "status": "completed",
  "metadata": { ... }
}
```

#### Refund Status Webhook
```bash
POST /api/webhooks/refund-status
Content-Type: application/json

{
  "refundId": "refund_id",
  "paymentId": "payment_uuid",
  "status": "completed"
}
```

## Payment Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ POST /api/payments/initiate
       ├──────────────────────────────────────┐
       │                                      │
       │                              ┌───────▼────────┐
       │                              │  Payment Store │
       │                              │ (Save Payment) │
       │                              └────────────────┘
       │
       │ POST /api/payments/:id/process
       ├──────────────────────────────────────┐
       │                                      │
       │                              ┌───────▼────────────────┐
       │                              │ Payment Service        │
       │                              │ (Retry Logic - Max 3x) │
       │                              └──────────┬─────────────┘
       │                                         │
       │                              ┌──────────▼──────────┐
       │                              │ QB Service         │
       │                              │ (Create Payment)   │
       │                              └──────────┬──────────┘
       │                                         │
       │                              ┌──────────▼──────────┐
       │                              │ QuickBooks API     │
       │                              │ (oauth.platform...) │
       │                              └────────────────────┘
       │
       │ Success Response
       │◀─────────────────────────────────────┤
       │
       │ GET /api/payments/:id/status
       ├──────────────────────────────────────┐
       │                                      │
       │                              ┌───────▼────────┐
       │                              │  QB Service    │
       │                              │ (Get Status)   │
       │                              └────────────────┘
       │
       │ Status Response
       │◀─────────────────────────────────────┤

       [QB sends Webhook Updates]
       │
       │ POST /api/webhooks/payment-status
       ├──────────────────────────────────────┐
       │                                      │
       │                              ┌───────▼────────┐
       │                              │ Update Payment │
       │                              │ Status         │
       │                              └────────────────┘
```

## Error Handling

The API returns standardized error responses:

```json
{
  "error": "Error message",
  "requestId": "unique_request_id"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

## Retry Logic

The payment processing service includes automatic retry logic:
- **Max Retries**: 3 (configurable via `MAX_RETRY_ATTEMPTS`)
- **Retry Delay**: 1000ms * attempt (exponential backoff)
- **Timeout**: 30 seconds per request (configurable via `PAYMENT_TIMEOUT_MS`)

On failure after all retries:
- Payment status is set to `failed`
- Error message is stored
- No further retries are attempted

## Logging

All operations are logged using Winston:
- **Info**: Normal operations and state changes
- **Warn**: Retry attempts and recoverable errors
- **Error**: Failed operations and exceptions
- **Debug**: Detailed operational data
- **Request Correlation**: Each request is tagged with `x-request-id` for tracing
- **QuickBooks API Metadata**: Payment/refund/status logs include QuickBooks HTTP status fields

Logs are written to:
- `combined.log` - All logs
- `error.log` - Error-level logs only
- Console output (with color formatting)

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## Environment Setup

### QuickBooks Sandbox Setup
1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create an app and get your credentials
3. Set up OAuth redirect URI
4. Add credentials to `.env`

### Production Deployment
1. Change `QUICKBOOKS_ENVIRONMENT` to `production`
2. Update OAuth redirect URI to production URL
3. Use strong credentials and secure .env
4. Enable HTTPS
5. Set up database instead of in-memory store

## Database Integration

Currently, the payment store uses in-memory storage (Map). For production, replace `PaymentStore` with a database implementation:

```javascript
// src/stores/payment.store.js - Example with MongoDB
const Payment = require('../models/Payment');

class PaymentStore {
  async save(payment) {
    return await Payment.findByIdAndUpdate(
      payment.id,
      payment,
      { upsert: true, new: true }
    );
  }

  async get(paymentId) {
    return await Payment.findById(paymentId);
  }
  // ... other methods
}
```

## Security Considerations

- Store all credentials in environment variables
- Use HTTPS in production
- Validate all inputs (Joi schemas)
- Implement rate limiting
- Add authentication/authorization middleware
- Keep dependencies updated
- Use helmet.js for security headers
- Implement webhook signature verification

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review QuickBooks API documentation
3. Check logs for error details

## License

MIT
