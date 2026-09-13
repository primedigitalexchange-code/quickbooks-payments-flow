# Database Integration & Setup Guide

Complete guide for integrating MongoDB with secure token storage for Stripe Connect OAuth.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Secure Token Storage](#secure-token-storage)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** >= 14.0.0
- **npm** >= 6.0.0
- **MongoDB** >= 4.4 (local or cloud)
- **Stripe Account** with Connect enabled

### Node Dependencies
```bash
npm install
```

Key packages:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `axios` - HTTP client for Stripe API
- `dotenv` - Environment variable management
- `crypto` - Token encryption

---

## Database Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)

**Step 1: Create MongoDB Atlas Account**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 free tier is sufficient for development)

**Step 2: Get Connection String**
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database password
5. Replace `myFirstDatabase` with `quickbooks-payments`

**Example:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/quickbooks-payments?retryWrites=true&w=majority
```

### Option 2: Local MongoDB

**Install MongoDB** (macOS with Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Connection String:**
```
mongodb://localhost:27017/quickbooks-payments
```

**Verify Connection:**
```bash
mongosh mongodb://localhost:27017/quickbooks-payments
```

---

## Environment Configuration

### Step 1: Create `.env` File

```bash
cp .env.example .env
```

### Step 2: Configure MongoDB URI

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickbooks-payments?retryWrites=true&w=majority
```

### Step 3: Configure Stripe Credentials

1. Get credentials from [Stripe Dashboard](https://dashboard.stripe.com/settings/keys)

```env
# Stripe Configuration
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_REDIRECT_URI=http://localhost:3000/api/stripe-oauth/callback
```

### Step 4: Generate Encryption Key

```bash
# Generate a secure encryption key (min 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:
```env
ENCRYPTION_KEY=your-generated-key-here
```

### Step 5: Complete Environment Setup

```env
# Node Environment
NODE_ENV=development
PORT=3000

# All other required variables (see .env.example)
```

---

## Secure Token Storage

### How Token Encryption Works

Tokens are automatically encrypted before storing in MongoDB:

**User Schema** (`src/models/User.js`):
```javascript
stripeTokens: {
  accessToken: {
    type: String,
    set: (value) => encryptToken(value),  // Encrypted on save
    get: (value) => decryptToken(value)   // Decrypted on retrieve
  },
  refreshToken: {
    type: String,
    set: (value) => encryptToken(value),
    get: (value) => decryptToken(value)
  }
}
```

**Encryption Details:**
- Algorithm: AES-256-CBC
- Key: Derived from `ENCRYPTION_KEY` environment variable
- IV: Random 16-byte initialization vector
- Format: `<iv-hex>:<encrypted-hex>`

### Token Lifecycle

```
1. User connects Stripe account
   ↓
2. OAuth callback returns access_token + refresh_token
   ↓
3. Tokens encrypted before saving to MongoDB
   ↓
4. When accessing Stripe API:
   - Tokens retrieved from database
   - Automatically decrypted by mongoose
   - Used for API calls
   ↓
5. Token expiration check:
   - If expired and refresh_token exists → auto-refresh
   - New tokens encrypted and saved
   - Old tokens replaced
```

---

## API Endpoints

### 1. OAuth Connection Endpoints

#### Initiate OAuth Flow
```http
POST /api/stripe-oauth/connect
Content-Type: application/json

{
  "userId": "user_123",
  "redirectUrl": "http://localhost:3000"
}

Response:
{
  "success": true,
  "authorizationUrl": "https://connect.stripe.com/oauth/authorize?...",
  "state": "random_state_token",
  "message": "Redirect user to authorizationUrl"
}
```

#### Handle OAuth Callback
```http
POST /api/stripe-oauth/callback
Content-Type: application/json

{
  "code": "ac_xxxxx",
  "state": "random_state_token",
  "userId": "user_123"
}

Response:
{
  "success": true,
  "message": "Stripe account connected successfully",
  "user": { ... },
  "stripeAccount": {
    "id": "acct_xxxxx",
    "email": "user@example.com",
    "chargesEnabled": true,
    "payoutsEnabled": true
  }
}
```

#### Check Connection Status
```http
GET /api/stripe-oauth/status/user_123

Response:
{
  "success": true,
  "userId": "user_123",
  "isConnected": true,
  "isExpired": false,
  "requiresRefresh": false,
  "status": "active",
  "stripeAccount": {
    "accountId": "acct_xxxxx",
    "email": "user@example.com",
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "connectedAt": "2026-09-13T22:40:50Z"
  }
}
```

#### Manually Refresh Token
```http
POST /api/stripe-oauth/refresh/user_123

Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresAt": "2026-09-13T23:40:50Z"
}
```

#### Disconnect Stripe Account
```http
POST /api/stripe-oauth/disconnect
Content-Type: application/json

{
  "userId": "user_123"
}

Response:
{
  "success": true,
  "message": "Stripe account disconnected successfully"
}
```

### 2. Stripe API Endpoints (with automatic token refresh)

#### Get Account Information
```http
GET /api/stripe/user_123/account

Response:
{
  "success": true,
  "data": {
    "id": "acct_xxxxx",
    "email": "user@example.com",
    "country": "US",
    "currency": "usd",
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "businessType": "individual"
  }
}
```

#### Create a Charge
```http
POST /api/stripe/user_123/charges
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "source": "tok_visa",
  "description": "Order #12345",
  "customer": "cus_xxxxx"
}

Response:
{
  "success": true,
  "data": {
    "id": "ch_xxxxx",
    "amount": 99.99,
    "currency": "USD",
    "status": "succeeded",
    "description": "Order #12345",
    "created": "2026-09-13T22:40:50Z"
  }
}
```

#### List Charges
```http
GET /api/stripe/user_123/charges?limit=10

Response:
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "ch_xxxxx",
      "amount": 99.99,
      "currency": "USD",
      "status": "succeeded",
      "paid": true,
      "created": "2026-09-13T22:40:50Z"
    },
    ...
  ]
}
```

#### Get Charge Details
```http
GET /api/stripe/user_123/charges/ch_xxxxx

Response:
{
  "success": true,
  "data": {
    "id": "ch_xxxxx",
    "amount": 99.99,
    "currency": "USD",
    "status": "succeeded",
    "description": "Order #12345",
    "paid": true,
    "refunded": false,
    "created": "2026-09-13T22:40:50Z"
  }
}
```

#### Refund a Charge
```http
POST /api/stripe/user_123/refunds
Content-Type: application/json

{
  "chargeId": "ch_xxxxx",
  "amount": 50.00
}

Response:
{
  "success": true,
  "data": {
    "id": "re_xxxxx",
    "chargeId": "ch_xxxxx",
    "amount": 50.00,
    "status": "succeeded",
    "created": "2026-09-13T22:40:50Z"
  }
}
```

#### Create a Customer
```http
POST /api/stripe/user_123/customers
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "John Doe",
  "description": "Premium customer"
}

Response:
{
  "success": true,
  "data": {
    "id": "cus_xxxxx",
    "email": "customer@example.com",
    "name": "John Doe",
    "created": "2026-09-13T22:40:50Z"
  }
}
```

---

## Usage Examples

### Complete Workflow Example

**1. User Initiates Connection**
```bash
curl -X POST http://localhost:3000/api/stripe-oauth/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "redirectUrl": "http://localhost:3000"
  }'
```

**2. User Gets Redirected to Stripe** (in browser)
- User authorizes the connection
- Stripe redirects to callback URL with `code`

**3. Backend Handles Callback**
```bash
curl -X POST http://localhost:3000/api/stripe-oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ac_xxxxx",
    "state": "random_state",
    "userId": "user_123"
  }'
```

**4. Check Connection Status**
```bash
curl http://localhost:3000/api/stripe-oauth/status/user_123
```

**5. Make Authenticated API Calls**
```bash
# Create a charge
curl -X POST http://localhost:3000/api/stripe/user_123/charges \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "source": "tok_visa",
    "description": "Order #12345"
  }'

# Token automatically refreshes if expired!
```

### JavaScript Example

```javascript
// Connect to Stripe
async function connectStripe(userId) {
  const response = await fetch('http://localhost:3000/api/stripe-oauth/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      redirectUrl: window.location.origin
    })
  });
  
  const data = await response.json();
  // Redirect user to authorization URL
  window.location.href = data.authorizationUrl;
}

// Get connection status
async function checkConnectionStatus(userId) {
  const response = await fetch(`http://localhost:3000/api/stripe-oauth/status/${userId}`);
  return response.json();
}

// Create a charge
async function createCharge(userId, amount, currency, source) {
  const response = await fetch(`http://localhost:3000/api/stripe/${userId}/charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency,
      source,
      description: 'Payment'
    })
  });
  
  return response.json();
}

// Usage
await connectStripe('user_123');
const status = await checkConnectionStatus('user_123');
const charge = await createCharge('user_123', 99.99, 'USD', 'tok_visa');
```

---

## Troubleshooting

### MongoDB Connection Issues

**Error: "MONGODB_URI is not set"**
```
Solution: Add MONGODB_URI to .env file
```

**Error: "MongoServerError: authentication failed"**
```
Solution: Check username/password in connection string
- Ensure @ symbol is properly encoded in password
- Example: `pass@word` → `pass%40word`
```

**Error: "connect ECONNREFUSED"**
```
Solution: 
- For MongoDB Atlas: Check IP whitelist in Security settings
- Add 0.0.0.0/0 to allow all IPs (development only)
- For local MongoDB: Ensure mongod service is running
```

### Token Encryption Issues

**Error: "Decryption error"**
```
Solution: 
- Ensure ENCRYPTION_KEY is set and consistent
- ENCRYPTION_KEY must be at least 32 characters
- Regenerate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Error: "Invalid token"**
```
Solution:
- Check if token has expired
- Manually refresh: POST /api/stripe-oauth/refresh/:userId
- Reconnect Stripe account if token corruption suspected
```

### Stripe OAuth Issues

**Error: "Invalid redirect_uri"**
```
Solution:
- Verify STRIPE_REDIRECT_URI in .env
- Must match exactly in Stripe Dashboard settings
- Use http://localhost:3000 for development
```

**Error: "Standard OAuth is disabled"**
```
Solution:
- Go to Stripe Dashboard → Connect Settings
- Enable "Standard OAuth flow"
- Save changes
```

### Database Statistics

```bash
# Check database status and statistics
curl http://localhost:3000/api/status

Response:
{
  "status": "ok",
  "database": {
    "isConnected": true,
    "readyState": 1,
    "host": "cluster0.xxxxx.mongodb.net",
    "db": "quickbooks-payments"
  },
  "statistics": {
    "users": 5,
    "activeUsers": 3,
    "charges": 42,
    "successfulCharges": 40,
    "failedCharges": 2,
    "refundedCharges": 3
  }
}
```

---

## Security Best Practices

✅ **Always:**
- Use HTTPS in production
- Rotate `ENCRYPTION_KEY` periodically
- Store `.env` in `.gitignore`
- Use strong database passwords
- Implement rate limiting on OAuth endpoints
- Verify webhook signatures from Stripe

❌ **Never:**
- Commit `.env` to version control
- Log access tokens or secrets
- Use same encryption key across environments
- Share database credentials in chat/email
- Disable MongoDB authentication in production

---

## Next Steps

1. ✅ Database integration complete
2. 📝 Set up webhook handlers for payment events
3. 🔄 Implement automatic token refresh scheduler
4. 📊 Add analytics and reporting
5. 🧪 Write integration tests
6. 🚀 Deploy to production

