# API Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication

All requests should include:
```
Content-Type: application/json
```

For protected endpoints (future), include:
```
Authorization: Bearer <token>
```

## Payments API

### 1. Initiate Payment

Start a new payment transaction.

**Endpoint:** `POST /payments/initiate`

**Request Body:**
```json
{
  "amount": 99.99,
  "currency": "USD",
  "customerId": "customer_123",
  "description": "Order #12345"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "payment_550e8400-e29b-41d4-a716-446655440000",
    "amount": 99.99,
    "currency": "USD",
    "customerId": "customer_123",
    "description": "Order #12345",
    "status": "initiated",
    "createdAt": "2026-09-04T12:00:00.000Z",
    "updatedAt": "2026-09-04T12:00:00.000Z"
  }
}
```

**Validation Rules:**
- `amount`: Required, positive number
- `currency`: Required, 3-letter ISO code (USD, EUR, etc.)
- `customerId`: Required, non-empty string
- `description`: Optional, string

---

### 2. Build Complete Bank Details

Validate and normalize bank account details payload.

**Endpoint:** `POST /payments/bank-details/complete`

**Request Body:**
```json
{
  "accountNumber": "123456789012",
  "routingNumber": "021000021",
  "bankName": "Chase Bank",
  "bankAddress": "270 Park Ave, New York, NY"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountNumber": "123456789012",
    "maskedAccountNumber": "****9012",
    "routingNumber": "021000021",
    "bankName": "Chase Bank",
    "bankAddress": "270 Park Ave, New York, NY"
  }
}
```

**Validation Rules:**
- `accountNumber`: Required, 4 to 17 digits
- `routingNumber`: Required, exactly 9 digits
- `bankName`: Required, non-empty string
- `bankAddress`: Required, non-empty string

---

### 3. Process Payment

Process an initiated payment with QuickBooks.

**Endpoint:** `POST /payments/:paymentId/process`

**Path Parameters:**
- `paymentId`: UUID of the payment

**Request Body:**
```json
{
  "amount": 99.99,
  "currency": "USD",
  "customerId": "customer_123",
  "paymentMethodId": "pm_123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "qb_payment_12345",
    "status": "completed",
    "amount": 99.99,
    "currency": "USD",
    "timestamp": "2026-09-04T12:01:00.000Z"
  }
}
```

**Features:**
- Automatic retry on failure (max 3 attempts)
- Exponential backoff between retries
- 30-second timeout per attempt

**Error Response (500):**
```json
{
  "success": false,
  "error": "Payment processing failed after retries",
  "requestId": "req_123"
}
```

---

### 4. Get Payment Status

Retrieve the current status of a payment.

**Endpoint:** `GET /payments/:paymentId/status`

**Path Parameters:**
- `paymentId`: UUID of the payment

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "payment_550e8400-e29b-41d4-a716-446655440000",
    "amount": 99.99,
    "currency": "USD",
    "customerId": "customer_123",
    "status": "completed",
    "qbPaymentId": "qb_payment_12345",
    "qbStatus": {
      "id": "qb_payment_12345",
      "status": "completed",
      "amount": 99.99
    },
    "createdAt": "2026-09-04T12:00:00.000Z",
    "updatedAt": "2026-09-04T12:01:00.000Z"
  }
}
```

**Possible Status Values:**
- `initiated`: Payment created but not yet processed
- `processing`: Payment is being processed
- `completed`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment has been refunded

---

### 5. Refund Payment

Refund a completed payment (full or partial).

**Endpoint:** `POST /payments/:paymentId/refund`

**Path Parameters:**
- `paymentId`: UUID of the payment

**Request Body:**
```json
{
  "amount": 50.00
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "refund_550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "amount": 50.00,
    "paymentId": "payment_550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-09-04T12:05:00.000Z"
  }
}
```

**Notes:**
- If `amount` is not specified, full payment amount is refunded
- Refund amount cannot exceed original payment amount
- Payment must have been successfully completed

---

## Authentication API

### OAuth Token Refresh

Refresh expired QuickBooks OAuth token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token_from_quickbooks"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

---

## Webhooks API

### Payment Status Update Webhook

Receive payment status updates from QuickBooks.

**Endpoint:** `POST /webhooks/payment-status`

**Request Body:**
```json
{
  "paymentId": "payment_550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "metadata": {
    "qbPaymentId": "qb_payment_12345",
    "timestamp": "2026-09-04T12:01:00.000Z"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

### Refund Status Update Webhook

Receive refund status updates from QuickBooks.

**Endpoint:** `POST /webhooks/refund-status`

**Request Body:**
```json
{
  "refundId": "refund_550e8400-e29b-41d4-a716-446655440000",
  "paymentId": "payment_550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "amount": 50.00
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## Health Check

### Server Health

**Endpoint:** `GET /health`

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-04T12:00:00.000Z"
}
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "requestId": "unique_request_identifier"
}
```

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|----------|
| 200 | OK | Successful GET request |
| 201 | Created | Payment successfully initiated |
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | Invalid or missing authentication |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | QuickBooks API down |

### Common Errors

**Missing Required Field**
```json
{
  "success": false,
  "error": "\"amount\" is required",
  "requestId": "req_123"
}
```

**Invalid Currency**
```json
{
  "success": false,
  "error": "\"currency\" length must be 3 characters long",
  "requestId": "req_124"
}
```

**Payment Not Found**
```json
{
  "success": false,
  "error": "Payment not found: invalid_id",
  "requestId": "req_125"
}
```

**QuickBooks API Error**
```json
{
  "success": false,
  "error": "Failed to create payment",
  "requestId": "req_126"
}
```

---

## Rate Limiting (Future)

When implemented:
- Rate limit: 100 requests per minute per IP
- Headers returned:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 99
  - `X-RateLimit-Reset`: 1693749660

---

## Pagination (Future)

Endpoints returning lists will support:
- `?page=1`: Page number (default: 1)
- `?limit=20`: Items per page (default: 20, max: 100)

---

## Examples

### cURL

```bash
# Initiate payment
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "customerId": "cust_123",
    "description": "Order #12345"
  }'

# Check payment status
curl http://localhost:3000/api/payments/payment_id/status

# Refund payment
curl -X POST http://localhost:3000/api/payments/payment_id/refund \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00}'
```

### JavaScript/Fetch

```javascript
// Initiate payment
const response = await fetch('http://localhost:3000/api/payments/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 99.99,
    currency: 'USD',
    customerId: 'cust_123',
    description: 'Order #12345'
  })
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

# Initiate payment
response = requests.post(
    'http://localhost:3000/api/payments/initiate',
    json={
        'amount': 99.99,
        'currency': 'USD',
        'customerId': 'cust_123',
        'description': 'Order #12345'
    }
)

print(response.json())
```
