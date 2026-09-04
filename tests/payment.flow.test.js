const express = require('express');
const request = require('supertest');
const app = require('../src/index');

describe('Payment Flow Integration', () => {
  describe('POST /api/payments/initiate', () => {
    it('should create a new payment', async () => {
      const paymentData = {
        amount: 99.99,
        currency: 'USD',
        customerId: 'cust_123',
        description: 'Test payment'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe('initiated');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        amount: 99.99
        // Missing currency, customerId
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/payments/:paymentId/status', () => {
    it('should retrieve payment status', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          amount: 99.99,
          currency: 'USD',
          customerId: 'cust_123',
          description: 'Test payment'
        });

      const paymentId = createResponse.body.data.id;

      // Then get its status
      const statusResponse = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.id).toBe(paymentId);
    });

    it('should return error for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/invalid_id/status')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
