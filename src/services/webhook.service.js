/**
 * Stripe Webhook service for handling and processing webhook events
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const WebhookEvent = require('../models/WebhookEvent');
const StripeCharge = require('../models/StripeCharge');
const User = require('../models/User');

class WebhookService {
  /**
   * Verify Stripe webhook signature
   * @param {string} body - Raw request body
   * @param {string} signature - Stripe-Signature header
   * @param {string} secret - Webhook signing secret
   */
  verifySignature(body, signature, secret) {
    try {
      const [timestamp, signedContent] = signature.split(',').map(part => part.split('=')[1]);

      // Check timestamp is recent (prevent replay attacks)
      const signedTimestamp = parseInt(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDifference = Math.abs(currentTime - signedTimestamp);

      if (timeDifference > 300) { // 5 minutes
        logger.warn(`Webhook timestamp too old: ${timeDifference}s ago`);
        return false;
      }

      // Verify signature
      const payload = `${timestamp}.${body}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      return signedContent === expectedSignature;

    } catch (error) {
      logger.error('Signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Handle charge.succeeded event
   */
  async handleChargeSucceeded(event) {
    try {
      const { object: chargeData } = event.data;
      
      logger.info(`Processing charge.succeeded: ${chargeData.id}`);

      // Find user by stripe user ID
      const user = await User.findByStripeUserId(event.account);

      if (!user) {
        logger.warn(`User not found for Stripe account ${event.account}`);
        return;
      }

      // Find or create charge record
      let charge = await StripeCharge.findOne({ chargeId: chargeData.id });

      if (!charge) {
        charge = await StripeCharge.createFromStripe(user._id, chargeData);
      } else {
        charge.status = 'succeeded';
        charge.paid = true;
        charge.stripeResponse = chargeData;
        await charge.save();
      }

      logger.info(`✓ Charge succeeded recorded: ${chargeData.id}`);
      return charge;

    } catch (error) {
      logger.error('charge.succeeded handler error:', error.message);
      throw error;
    }
  }

  /**
   * Handle charge.failed event
   */
  async handleChargeFailed(event) {
    try {
      const { object: chargeData } = event.data;
      
      logger.warn(`Processing charge.failed: ${chargeData.id}`);

      const user = await User.findByStripeUserId(event.account);

      if (!user) {
        logger.warn(`User not found for Stripe account ${event.account}`);
        return;
      }

      let charge = await StripeCharge.findOne({ chargeId: chargeData.id });

      if (!charge) {
        charge = await StripeCharge.createFromStripe(user._id, chargeData);
      } else {
        charge.status = 'failed';
        charge.paid = false;
        charge.error = {
          message: chargeData.failure_message,
          code: chargeData.failure_code,
          type: chargeData.failure_balance_transaction
        };
        charge.stripeResponse = chargeData;
        await charge.save();
      }

      logger.info(`✓ Charge failed recorded: ${chargeData.id}`);
      return charge;

    } catch (error) {
      logger.error('charge.failed handler error:', error.message);
      throw error;
    }
  }

  /**
   * Handle charge.refunded event
   */
  async handleChargeRefunded(event) {
    try {
      const { object: chargeData } = event.data;
      
      logger.info(`Processing charge.refunded: ${chargeData.id}`);

      const charge = await StripeCharge.findOne({ chargeId: chargeData.id });

      if (!charge) {
        logger.warn(`Charge not found: ${chargeData.id}`);
        return;
      }

      // Update refund information
      if (chargeData.refunded && chargeData.refunds?.data?.length > 0) {
        charge.refunded = true;
        charge.refundedAmount = chargeData.amount_refunded;

        // Record refunds
        for (const refund of chargeData.refunds.data) {
          charge.refunds.push({
            refundId: refund.id,
            amount: refund.amount,
            reason: refund.reason,
            status: refund.status,
            createdAt: new Date(refund.created * 1000)
          });
        }

        await charge.save();
      }

      logger.info(`✓ Charge refunded recorded: ${chargeData.id}`);
      return charge;

    } catch (error) {
      logger.error('charge.refunded handler error:', error.message);
      throw error;
    }
  }

  /**
   * Handle customer.created event
   */
  async handleCustomerCreated(event) {
    try {
      const { object: customerData } = event.data;
      
      logger.info(`Processing customer.created: ${customerData.id}`);

      const user = await User.findByStripeUserId(event.account);

      if (user) {
        // Could store customer info if needed
        if (!user.metadata) user.metadata = {};
        if (!user.metadata.customers) user.metadata.customers = [];
        
        user.metadata.customers.push({
          customerId: customerData.id,
          email: customerData.email,
          createdAt: new Date()
        });

        await user.save();
      }

      logger.info(`✓ Customer created recorded: ${customerData.id}`);
      return customerData;

    } catch (error) {
      logger.error('customer.created handler error:', error.message);
      throw error;
    }
  }

  /**
   * Handle account.updated event
   */
  async handleAccountUpdated(event) {
    try {
      const { object: accountData } = event.data;
      
      logger.info(`Processing account.updated for ${event.account}`);

      const user = await User.findByStripeUserId(event.account);

      if (user) {
        // Update account information
        user.stripeAccount.chargesEnabled = accountData.charges_enabled;
        user.payoutsEnabled = accountData.payouts_enabled;
        await user.save();

        logger.info(`✓ Account info updated: ${event.account}`);
      }

      return accountData;

    } catch (error) {
      logger.error('account.updated handler error:', error.message);
      throw error;
    }
  }

  /**
   * Process webhook event
   */
  async processEvent(event) {
    try {
      logger.info(`Processing Stripe event: ${event.type}`);

      // Create webhook event record
      const webhookEvent = await WebhookEvent.createFromStripe(event);

      // Route to appropriate handler
      let result;
      switch (event.type) {
        case 'charge.succeeded':
          result = await this.handleChargeSucceeded(event);
          break;
        case 'charge.failed':
          result = await this.handleChargeFailed(event);
          break;
        case 'charge.refunded':
          result = await this.handleChargeRefunded(event);
          break;
        case 'customer.created':
          result = await this.handleCustomerCreated(event);
          break;
        case 'account.updated':
          result = await this.handleAccountUpdated(event);
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
          result = null;
      }

      // Mark webhook event as processed
      await webhookEvent.markProcessed();

      logger.info(`✓ Event processed successfully: ${event.type}`);
      return result;

    } catch (error) {
      logger.error('Event processing error:', error.message);
      throw error;
    }
  }

  /**
   * Retry failed webhook events
   */
  async retryFailedEvents() {
    try {
      const now = new Date();
      const failedEvents = await WebhookEvent.find({
        status: 'pending',
        nextRetryAt: { $lte: now },
        retryCount: { $lt: 3 }
      });

      logger.info(`Found ${failedEvents.length} events to retry`);

      for (const webhookEvent of failedEvents) {
        try {
          // Reconstruct event from stored data
          const event = {
            id: webhookEvent.eventId,
            type: webhookEvent.eventType,
            data: webhookEvent.data,
            account: webhookEvent.stripeUserId,
            created: Math.floor(webhookEvent.eventCreatedAt.getTime() / 1000),
            api_version: webhookEvent.apiVersion
          };

          // Retry processing
          await this.processEvent(event);

        } catch (error) {
          logger.error(`Failed to retry event ${webhookEvent.eventId}:`, error.message);
          await webhookEvent.markFailed(error, true);
        }
      }

    } catch (error) {
      logger.error('Event retry batch error:', error.message);
    }
  }

  /**
   * Get webhook event statistics
   */
  async getStatistics() {
    try {
      const stats = {
        total: await WebhookEvent.countDocuments(),
        byStatus: {
          pending: await WebhookEvent.countDocuments({ status: 'pending' }),
          processing: await WebhookEvent.countDocuments({ status: 'processing' }),
          completed: await WebhookEvent.countDocuments({ status: 'completed' }),
          failed: await WebhookEvent.countDocuments({ status: 'failed' })
        },
        byEventType: {},
        last24Hours: await WebhookEvent.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      };

      // Count by event type
      const eventTypes = [
        'charge.succeeded',
        'charge.failed',
        'charge.refunded',
        'customer.created',
        'account.updated'
      ];

      for (const eventType of eventTypes) {
        stats.byEventType[eventType] = await WebhookEvent.countDocuments({ eventType });
      }

      return stats;

    } catch (error) {
      logger.error('Statistics error:', error.message);
      throw error;
    }
  }
}

module.exports = new WebhookService();
