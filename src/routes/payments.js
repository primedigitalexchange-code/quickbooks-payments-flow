const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const paymentService = require('../services/payment.service');
const { validatePayment } = require('../middleware/validation');

// Initiate a payment
router.post('/initiate', validatePayment, async (req, res, next) => {
  try {
    const { amount, currency, customerId, description } = req.body;
    
    const payment = await paymentService.initiatePayment({
      amount,
      currency,
      customerId,
      description
    });

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Process payment (with retry logic)
router.post('/:paymentId/process', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const paymentData = req.body;

    const result = await paymentService.processPaymentWithRetry(paymentId, paymentData);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/:paymentId/status', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPaymentStatus(paymentId);

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Refund payment
router.post('/:paymentId/refund', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount } = req.body;

    const result = await paymentService.refundPayment(paymentId, amount);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;