const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Webhook for payment status updates from QuickBooks
router.post('/payment-status', (req, res, next) => {
  try {
    const { paymentId, status, metadata } = req.body;

    logger.info('Webhook received - Payment status update', {
      paymentId,
      status
    });

    // Handle payment status update
    // This would typically update your database and trigger events

    res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    next(error);
  }
});

// Webhook for refund updates
router.post('/refund-status', (req, res, next) => {
  try {
    const { refundId, status, paymentId } = req.body;

    logger.info('Webhook received - Refund status update', {
      refundId,
      paymentId,
      status
    });

    // Handle refund status update

    res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;