const logger = require('../utils/logger');

// In-memory store for demo purposes. Replace with database in production.
class PaymentStore {
  constructor() {
    this.payments = new Map();
  }

  save(payment) {
    this.payments.set(payment.id, payment);
    logger.debug(`Payment saved: ${payment.id}`);
    return payment;
  }

  get(paymentId) {
    return this.payments.get(paymentId);
  }

  getAll() {
    return Array.from(this.payments.values());
  }

  delete(paymentId) {
    return this.payments.delete(paymentId);
  }

  exists(paymentId) {
    return this.payments.has(paymentId);
  }
}

module.exports = PaymentStore;