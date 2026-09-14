# QuickBooks OAuth Credentials Setup Guide

This guide walks you through getting your QuickBooks OAuth credentials and configuring them in the app.

---

## 📋 Prerequisites

- ✅ QuickBooks Online account (or Intuit Developer account for sandbox testing)
- ✅ Access to Intuit Developer Portal
- ✅ Your server URL (for OAuth callback/redirect URI)

---

## 🔑 Step 1: Get Your Credentials from Intuit Developer Portal

### 1.1 Create/Sign Into Intuit Developer Account
1. Go to: **https://developer.intuit.com**
2. Sign in with your Intuit/QuickBooks account
3. If you don't have an account, create one (free)

### 1.2 Create an App (if you haven't already)
1. Click **"Create an app"** in the dashboard
2. Select **"QuickBooks Online + Payments"** or just **"QuickBooks Online"**
3. Give your app a name (e.g., "Prime Digital Exchange Payments")
4. Click **"Create app"**

### 1.3 Get Your OAuth Credentials
After creating the app, go to **Keys & OAuth** section:

You'll see:
- **Client ID** (looks like: `ABCDEFGHIJKLMNOPQRSTUVWxyz`)
- **Client Secret** (looks like: `ABCDEFGHIJKLMNOPQRSTUVWxyz1234567890`)
- **Realm ID** (your QuickBooks Company ID, looks like: `1234567890`)

**⚠️ IMPORTANT:** Keep your Client Secret safe! Never commit it to git.

---

## 🌍 Step 2: Configure OAuth Redirect URI

### For Local Development (Testing):
1. In Intuit Developer Portal, go to **Keys & OAuth**
2. Under **Redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback
   ```
3. Save changes

### For Production Deployment:
1. Add your production URL:
   ```
   https://your-domain.com/api/auth/callback
   ```
2. Example: `https://quickbooks-payments-flow.herokuapp.com/api/auth/callback`

---

## 📝 Step 3: Create Your .env File

### 3.1 Create `.env` in your project root:
```bash
cp .env.example .env
```

Or create manually:
```bash
touch .env
```

### 3.2 Add QuickBooks Credentials:
```env
# QuickBooks OAuth Credentials
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REALM_ID=your_realm_id_here
QUICKBOOKS_ENVIRONMENT=sandbox

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Replace with your actual values from Intuit Developer Portal**

### 3.3 Example (with sample values):
```env
QUICKBOOKS_CLIENT_ID=ABCDEFGHIJKLMNOPQRSTUVWxyz
QUICKBOOKS_CLIENT_SECRET=ABCDEFGHIJKLMNOPQRSTUVWxyz1234567890
QUICKBOOKS_REALM_ID=1234567890
QUICKBOOKS_ENVIRONMENT=sandbox

PORT=3000
NODE_ENV=development
```

---

## 🔐 Step 4: Get Your Refresh Token

Your app uses the **OAuth 2.0 Refresh Token Flow** for API calls. You need to get a refresh token from QuickBooks.

### Option A: Via Intuit's OAuth Sandbox (Easiest for Testing)

1. In Intuit Developer Portal, go to **Sandbox** or **Development** mode
2. You'll see a **"Get my OAuth tokens"** button
3. Click it to authorize and receive:
   - `refreshToken`
   - `accessToken`
   - `expiresIn`

### Option B: Via Full OAuth Authorization Flow (Production)

1. User visits your app's authorization URL:
   ```
   https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&response_type=code&scope=com.intuit.quickbooks.accounting&redirect_uri=YOUR_REDIRECT_URI&state=random_state_value&realm_id=YOUR_REALM_ID
   ```

2. User authorizes your app
3. Intuit redirects to your callback URL with an `authorizationCode`
4. Exchange the code for tokens (your app does this automatically via `POST /api/auth/callback`)

---

## 🧪 Step 5: Test Your Configuration

### 5.1 Start the Server
```bash
npm install
npm run dev
```

You should see:
```
✓ Server running on port 3000
```

### 5.2 Test Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-14T18:40:50Z"
}
```

### 5.3 Test Token Refresh (Most Important!)
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

**Expected response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJkb2N1bWVudElkIjoiMjgyMzE1MzMwMzI1ODMyMzI1In0=",
    "expiresIn": 3600,
    "refreshToken": "your_refresh_token_here"
  }
}
```

**If you get an error:**
- ❌ `401 Unauthorized` → Check your `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET`
- ❌ `Invalid refresh token` → Get a new refresh token from Intuit
- ❌ Connection refused → Make sure server is running

---

## 💳 Step 6: Test Full Payment Flow

### 6.1 Create a Payment
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "customerId": "cust_123",
    "description": "Test payment"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "payment_1234567890",
    "status": "initiated",
    "amount": 99.99,
    "currency": "USD",
    "customerId": "cust_123"
  }
}
```

### 6.2 Process the Payment
```bash
curl -X POST http://localhost:3000/api/payments/payment_1234567890/process \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "payment_1234567890",
    "status": "completed",
    "qbPaymentId": "QB_PAYMENT_ID_123",
    "amount": 99.99
  }
}
```

### 6.3 Check Payment Status
```bash
curl http://localhost:3000/api/payments/payment_1234567890/status
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "payment_1234567890",
    "status": "completed",
    "qbPaymentId": "QB_PAYMENT_ID_123",
    "amount": 99.99
  }
}
```

---

## 🚀 Step 7: Deploy to Production

### Important Changes for Production:

1. **Update `.env` for production:**
   ```env
   QUICKBOOKS_ENVIRONMENT=production
   NODE_ENV=production
   ```

2. **Update Redirect URI in Intuit Developer Portal:**
   ```
   https://your-production-domain.com/api/auth/callback
   ```

3. **Set environment variables on your hosting platform** (Heroku, AWS, etc.):
   ```bash
   heroku config:set QUICKBOOKS_CLIENT_ID=your_prod_client_id
   heroku config:set QUICKBOOKS_CLIENT_SECRET=your_prod_client_secret
   heroku config:set QUICKBOOKS_REALM_ID=your_prod_realm_id
   heroku config:set QUICKBOOKS_ENVIRONMENT=production
   ```

4. **Verify credentials are loaded:**
   ```bash
   # Check on your server
   curl https://your-domain.com/health
   ```

---

## 📚 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/callback` | OAuth callback (exchange code for tokens) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/payments/initiate` | Create new payment record |
| POST | `/api/payments/:id/process` | Process payment via QuickBooks |
| GET | `/api/payments/:id/status` | Check payment status |
| POST | `/api/payments/:id/refund` | Refund a payment |

---

## ⚠️ Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing QUICKBOOKS_CLIENT_ID` | Env var not set | Add to `.env` file |
| `401 Unauthorized` | Invalid credentials | Verify Client ID & Secret match Intuit Portal |
| `Invalid refresh token` | Token expired or incorrect | Get new token from Intuit |
| `Connection refused` | Server not running | Run `npm run dev` |
| `REALM_ID mismatch` | Wrong company ID | Verify Realm ID from Intuit Portal |

---

## 🔗 Useful Links

- **Intuit Developer Portal:** https://developer.intuit.com
- **QuickBooks API Docs:** https://developer.intuit.com/app/developer/qbo/docs/develop
- **OAuth 2.0 Guide:** https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- **QuickBooks Payments Docs:** https://developer.intuit.com/app/developer/qbop/docs

---

## ✅ Configuration Checklist

- [ ] Created app in Intuit Developer Portal
- [ ] Copied Client ID from Keys & OAuth
- [ ] Copied Client Secret from Keys & OAuth
- [ ] Copied Realm ID from Keys & OAuth
- [ ] Added Redirect URI in Intuit Developer Portal
- [ ] Created `.env` file with credentials
- [ ] Got refresh token from Intuit
- [ ] Tested `/api/auth/refresh` endpoint
- [ ] Tested `/api/payments/initiate` endpoint
- [ ] Tested `/api/payments/:id/process` endpoint
- [ ] Ready for production deployment

---

**Next Steps:**
1. Follow steps 1-5 above
2. Verify your credentials work with test endpoints
3. Set up MongoDB for persistent storage (if not done)
4. Deploy to production (Heroku recommended)
5. Update redirect URI for production domain
