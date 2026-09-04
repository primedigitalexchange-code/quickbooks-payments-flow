const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const paymentRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: req.id
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`QuickBooks Payments Flow server running on port ${PORT}`);
});

module.exports = app;
