/**
 * Webhook routes for both QuickBooks and Stripe events
 */

const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();
let webhookService;
let WebhookEvent;
let stripeWebhookDependenciesAvailable = true;

try {
  webhookService = require('../services/webhook.service');
  WebhookEvent = require('../models/WebhookEvent');
} catch (error) {
  stripeWebhookDependenciesAvailable = false;
  logger.warn('Stripe webhook routes disabled', { error: error.message });
}

// Middleware to parse raw body for Stripe signature verification
const rawBodyParser = express.raw({ type: 'application/json' });

// QuickBooks Webhooks (existing)

/**
 * POST /api/webhooks/payment-status
 * Webhook for payment status updates from QuickBooks
 */
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

/**
 * POST /api/webhooks/refund-status
 * Webhook for refund updates from QuickBooks
 */
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

// Stripe Webhooks (new)

const sendStripeWebhookUnavailable = (res) => res.status(503).json({
  success: false,
  error: 'Stripe webhook dependencies are not configured'
});

if (stripeWebhookDependenciesAvailable) {
  /**
   * POST /api/webhooks/stripe
   * Main webhook endpoint for Stripe events
   */
  router.post('/stripe', rawBodyParser, async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    const isValid = webhookService.verifySignature(
      typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    try {
      // Parse body
      const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

      logger.info(`✓ Webhook signature verified: ${event.type}`);

      // Process event asynchronously (don't block response)
      process.nextTick(async () => {
        try {
          await webhookService.processEvent(event);
        } catch (error) {
          logger.error('Async webhook processing error:', error.message);

          // Mark event as failed for retry
          const webhookEvent = await WebhookEvent.findOne({ eventId: event.id });
          if (webhookEvent) {
            await webhookEvent.markFailed(error, true);
          }
        }
      });

      // Acknowledge receipt immediately
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Webhook parsing error:', error.message);
      res.status(400).json({ error: 'Invalid request body' });
    }
  });

  /**
   * GET /api/webhooks/stripe/events
   * List webhook events
   */
  router.get('/stripe/events', async (req, res) => {
    try {
      const { status, eventType, limit = 50, skip = 0 } = req.query;

      // Build filter
      const filter = {};
      if (status) filter.status = status;
      if (eventType) filter.eventType = eventType;

      const events = await WebhookEvent.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await WebhookEvent.countDocuments(filter);

      res.json({
        success: true,
        count: events.length,
        total,
        data: events.map(e => e.getSummary())
      });
    } catch (error) {
      logger.error('List events error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/webhooks/stripe/events/:eventId
   * Get specific webhook event details
   */
  router.get('/stripe/events/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;

      const event = await WebhookEvent.findOne({ eventId });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json({
        success: true,
        data: {
          ...event.getSummary(),
          fullData: event.data
        }
      });
    } catch (error) {
      logger.error('Get event error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/webhooks/stripe/events/:eventId/retry
   * Manually retry failed webhook event
   */
  router.post('/stripe/events/:eventId/retry', async (req, res) => {
    try {
      const { eventId } = req.params;

      const webhookEvent = await WebhookEvent.findOne({ eventId });

      if (!webhookEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (webhookEvent.status === 'completed') {
        return res.status(400).json({
          error: 'Cannot retry completed event',
          message: 'This event has already been successfully processed'
        });
      }

      // Reconstruct event
      const event = {
        id: webhookEvent.eventId,
        type: webhookEvent.eventType,
        data: webhookEvent.data,
        account: webhookEvent.stripeUserId,
        created: Math.floor(webhookEvent.eventCreatedAt.getTime() / 1000),
        api_version: webhookEvent.apiVersion
      };

      // Retry processing
      await webhookService.processEvent(event);

      res.json({
        success: true,
        message: 'Event retry initiated',
        event: webhookEvent.getSummary()
      });
    } catch (error) {
      logger.error('Event retry error:', error.message);

      // Mark as failed
      const webhookEvent = await WebhookEvent.findOne({ eventId: req.params.eventId });
      if (webhookEvent) {
        await webhookEvent.markFailed(error, true);
      }

      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/webhooks/stripe/stats
   * Get webhook statistics
   */
  router.get('/stripe/stats', async (req, res) => {
    try {
      const stats = await webhookService.getStatistics();

      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      logger.error('Get statistics error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/webhooks/stripe/retry-failed
   * Manually trigger retry of all failed events
   */
  router.post('/stripe/retry-failed', async (req, res) => {
    try {
      logger.info('Initiating webhook event retry batch...');

      // Run retry asynchronously
      process.nextTick(async () => {
        try {
          await webhookService.retryFailedEvents();
          logger.info('✓ Webhook event retry batch completed');
        } catch (error) {
          logger.error('Batch retry error:', error.message);
        }
      });

      res.json({
        success: true,
        message: 'Webhook event retry batch initiated'
      });
    } catch (error) {
      logger.error('Retry batch error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/webhooks/stripe/failed-events
   * List failed webhook events pending retry
   */
  router.get('/stripe/failed-events', async (req, res) => {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const failedEvents = await WebhookEvent.find({ status: 'failed' })
        .sort({ nextRetryAt: 1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await WebhookEvent.countDocuments({ status: 'failed' });

      res.json({
        success: true,
        count: failedEvents.length,
        total,
        data: failedEvents.map(e => ({
          ...e.getSummary(),
          nextRetryAt: e.nextRetryAt
        }))
      });
    } catch (error) {
      logger.error('List failed events error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
} else {
  router.all('/stripe', (req, res) => sendStripeWebhookUnavailable(res));
  router.all('/stripe/*', (req, res) => sendStripeWebhookUnavailable(res));
}

module.exports = router;
