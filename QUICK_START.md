# Quick Start Guide - Database Integration

Get your Stripe Connect OAuth integration with secure database storage running in 5 minutes.

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

**Choose one:**

**Option A: MongoDB Atlas (Cloud - Recommended)**
```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create free account and cluster
# 3. Get connection string (replace password and database name)
```

**Option B: Local MongoDB**
```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Verify
mongosh
```

### 3. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env with your settings:
```

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickbooks-payments

# Stripe (from dashboard)
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_REDIRECT_URI=http://localhost:3000/api/stripe-oauth/callback

# Generate encryption key:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-generated-key-here

# Server
PORT=3000
NODE_ENV=development
```

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

✅ You should see:
```
✓ Connected to MongoDB successfully
✓ All models initialized successfully
✓ QuickBooks Payments Flow server running on port 3000
✓ Database connected successfully
```

---

## Test the Integration

### Check Server Health
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-13T22:40:50Z",
  "database": {
    "isConnected": true,
    "readyState": 1,
    "host": "cluster0.xxxxx.mongodb.net",
    "db": "quickbooks-payments"
  }
}
```

### Get Database Status
```bash
curl http://localhost:3000/api/status
```

### Connect Stripe Account
```bash
curl -X POST http://localhost:3000/api/stripe-oauth/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "redirectUrl": "http://localhost:3000"
  }'
```

You'll get an authorization URL. Open it in browser to authorize.

### Check Connection Status
```bash
curl http://localhost:3000/api/stripe-oauth/status/user_123
```

### Make First API Call (Create Charge)
```bash
curl -X POST http://localhost:3000/api/stripe/user_123/charges \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 9.99,
    "currency": "USD",
    "source": "tok_visa",
    "description": "Test charge"
  }'
```

---

## Project Structure

```
quickbooks-payments-flow/
├── src/
│   ├── index.js                      # Main app with DB integration
│   ├── models/
│   │   ├── User.js                   # User + encrypted tokens
│   │   └── StripeCharge.js           # Charge history
│   ├── services/
│   │   ├── database.service.js       # MongoDB connection
│   │   └── stripe.service.js         # Stripe API calls
│   ├── routes/
│   │   ├── stripe-oauth.js           # OAuth connection
│   │   ├── stripe-api.js             # Stripe API endpoints
│   │   ├── payments.js               # Payment routes
│   │   └── auth.js                   # Auth routes
│   ├── middleware/
│   │   └── token-refresh.js          # Auto token refresh
│   ├── utils/
│   │   └── logger.js                 # Winston logging
│   └── config/
│       └── quickbooks.js             # QB config
├── .env.example                      # Environment template
├── package.json                      # Dependencies
├── DATABASE_SETUP.md                 # Full setup guide
└── README.md                         # Main documentation
```

---

## Key Features Implemented

✅ **Secure Token Storage**
- AES-256 encryption for access/refresh tokens
- Automatic encryption/decryption on save/retrieve
- Tokens never logged or exposed

✅ **Automatic Token Refresh**
- Middleware detects expired tokens
- Auto-refreshes with refresh_token
- Transparent to API callers

✅ **MongoDB Integration**
- User model with Stripe account info
- StripeCharge model for charge history
- Automatic indexes and validation

✅ **Complete OAuth Flow**
- Initiate connection
- Handle callback
- Check status
- Disconnect account

✅ **Stripe API Integration**
- Create charges
- List charges
- Get charge details
- Refund charges
- Manage customers

---

## Common Tasks

### View Stored Users
```bash
# Using mongosh
mongosh mongodb://localhost:27017/quickbooks-payments
> db.users.find()
```

### View Charges History
```bash
mongosh mongodb://localhost:27017/quickbooks-payments
> db.stripecharges.find().sort({ createdAt: -1 }).limit(10)
```

### Manually Refresh Token
```bash
curl -X POST http://localhost:3000/api/stripe-oauth/refresh/user_123
```

### Disconnect Account
```bash
curl -X POST http://localhost:3000/api/stripe-oauth/disconnect \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123"}'
```

### Clear Database (Development Only)
```javascript
// In Node REPL
const db = require('./src/services/database.service');
await db.connect();
await db.dropAllCollections();
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` | Check MongoDB is running. For local: `brew services start mongodb-community` |
| `authentication failed` | Check username/password in MONGODB_URI. URL encode special chars: `@` → `%40` |
| `ENCRYPTION_KEY` error | Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `Invalid redirect_uri` | Verify STRIPE_REDIRECT_URI matches Stripe Dashboard settings |
| `Standard OAuth disabled` | Enable in Stripe → Settings → Connect Settings |

---

## Next Steps

1. **Webhook Handling** - Set up payment event webhooks
2. **Rate Limiting** - Add rate limit middleware
3. **Authentication** - Add user auth to API endpoints
4. **Testing** - Write Jest tests for models/routes
5. **Production Deployment** - Deploy to Heroku/AWS/DigitalOcean

---

## Documentation

- **Full Setup Guide**: See [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- **API Reference**: See [API_REFERENCE.md](./API_REFERENCE.md)
- **Main README**: See [README.md](./README.md)

---

## Support

- 📖 Check [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed setup
- 🔗 [Stripe Connect Docs](https://stripe.com/docs/connect)
- 🗄️ [MongoDB Docs](https://docs.mongodb.com)
- 🆘 Check GitHub Issues for common problems

