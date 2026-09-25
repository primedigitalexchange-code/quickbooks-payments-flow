const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const logger = require('./utils/logger');
const paymentRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const plaidRoutes = require('./routes/plaid');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || uuidv4();

  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id
  });
  next();
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/plaid', plaidRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the UI
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(['/', '/login', '/bank-details'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.id
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`QuickBooks Payments Flow server running on port ${PORT}`);
  });
}

module.exports = app;
