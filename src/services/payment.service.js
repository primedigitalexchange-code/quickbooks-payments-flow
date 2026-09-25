const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const qbService = require('./quickbooks.service');
const PaymentStore = require('../stores/payment.store');

const MAX_RETRIES = parseInt(process.env.MAX_RETRY_ATTEMPTS || 3);
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY_MS || 1000);

class PaymentService {
  constructor() {
    this.paymentStore = new PaymentStore();
  }

  buildCompleteBankDetails(bankDetails) {
    const accountNumber = bankDetails.accountNumber.replace(/\D/g, '');
    const routingNumber = bankDetails.routingNumber.replace(/\D/g, '');
    const maskedAccountNumber = accountNumber.length > 4
      ? `****${accountNumber.slice(-4)}`
      : accountNumber;

    return {
      accountNumber,
      maskedAccountNumber,
      routingNumber,
      bankName: bankDetails.bankName.trim(),
      bankAddress: bankDetails.bankAddress.trim()
    };
  }

  async initiatePayment(paymentData, requestId) {
    const paymentId = uuidv4();
    
    try {
      logger.info('Initiating payment', { requestId, paymentId, amount: paymentData.amount });
      
      const payment = {
        id: paymentId,
        ...paymentData,
        status: 'initiated',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.paymentStore.save(payment);
      return payment;
    } catch (error) {
      logger.error('Failed to initiate payment', { requestId, paymentId, error: error.message });
      throw error;
    }
  }

  async processPaymentWithRetry(paymentId, paymentData, requestId) {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Processing payment (attempt ${attempt}/${MAX_RETRIES})`, { requestId, paymentId });
        
        const result = await qbService.createPayment(paymentData, requestId);
        
        const payment = this.paymentStore.get(paymentId);
        payment.status = 'completed';
        payment.qbPaymentId = result.id;
        payment.updatedAt = new Date();
        this.paymentStore.save(payment);

        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`Payment processing failed (attempt ${attempt}/${MAX_RETRIES})`, {
          requestId,
          paymentId,
          error: error.message
        });
        
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    const payment = this.paymentStore.get(paymentId);
    payment.status = 'failed';
    payment.error = lastError.message;
    payment.updatedAt = new Date();
    this.paymentStore.save(payment);

    logger.error('Payment processing failed after retries', {
      requestId,
      paymentId,
      error: lastError.message
    });
    throw lastError;
  }

  async getPaymentStatus(paymentId, requestId) {
    try {
      const payment = this.paymentStore.get(paymentId);
      
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      if (payment.qbPaymentId) {
        const qbStatus = await qbService.getPaymentStatus(payment.qbPaymentId, requestId);
        payment.qbStatus = qbStatus;
      }

      return payment;
    } catch (error) {
      logger.error('Failed to get payment status', { requestId, paymentId, error: error.message });
      throw error;
    }
  }

  async refundPayment(paymentId, amount, requestId) {
    try {
      logger.info('Initiating refund', { requestId, paymentId, amount });
      
      const payment = this.paymentStore.get(paymentId);
      
      if (!payment || !payment.qbPaymentId) {
        throw new Error('Payment not found or has no QB payment ID');
      }

      const refundResult = await qbService.refundPayment(payment.qbPaymentId, {
        amount: amount || payment.amount
      }, requestId);

      payment.refundId = refundResult.id;
      payment.refundAmount = amount || payment.amount;
      payment.refundStatus = 'completed';
      payment.updatedAt = new Date();
      this.paymentStore.save(payment);

      return refundResult;
    } catch (error) {
      logger.error('Failed to refund payment', { requestId, paymentId, error: error.message });
      throw error;
    }
  }
}

module.exports = new PaymentService();