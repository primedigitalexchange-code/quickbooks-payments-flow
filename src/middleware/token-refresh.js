/**
 * Middleware to automatically refresh expired Stripe tokens
 */

const logger = require('../utils/logger');
const stripeService = require('../services/stripe.service');

/**
 * Middleware to ensure valid access token
 * Automatically refreshes if expired
 */
async function ensureValidToken(req, res, next) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user from database
    const User = require('../models/User');
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if access token is expired
    if (user.isAccessTokenExpired()) {
      logger.warn(`Access token expired for user ${userId}, attempting refresh`);

      if (!user.hasRefreshToken()) {
        return res.status(401).json({
          error: 'Access token expired and no refresh token available',
          requiresReconnection: true
        });
      }

      try {
        // Refresh the token
        const newTokens = await stripeService.refreshAccessToken(
          user.stripeTokens.refreshToken
        );

        // Update tokens in database
        await user.updateTokens(newTokens);
        logger.info(`✓ Token refreshed successfully for user ${userId}`);

      } catch (refreshError) {
        logger.error(`Failed to refresh token for user ${userId}:`, refreshError.message);
        return res.status(401).json({
          error: 'Failed to refresh access token',
          message: 'Please reconnect your Stripe account',
          requiresReconnection: true
        });
      }
    }

    // Attach user and tokens to request
    req.user = user;
    req.tokens = user.stripeTokens;
    
    next();

  } catch (error) {
    logger.error('Token validation middleware error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to validate that user has Stripe connection
 */
async function requireStripeConnection(req, res, next) {
  try {
    const { userId } = req.params;
    
    const User = require('../models/User');
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeTokens?.accessToken) {
      return res.status(403).json({
        error: 'Stripe account not connected',
        message: 'User needs to connect their Stripe account first',
        connectUrl: `/auth/stripe/connect?userId=${userId}`
      });
    }

    if (!user.stripeAccount?.accountId) {
      return res.status(403).json({
        error: 'Stripe account not fully configured',
        message: 'Please complete Stripe account setup'
      });
    }

    req.user = user;
    req.tokens = user.stripeTokens;

    next();

  } catch (error) {
    logger.error('Stripe connection validation error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to handle token errors and suggest reconnection
 */
function handleTokenError(error, req, res, next) {
  if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
    logger.warn('Unauthorized token error, may need refresh');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Your access token has expired. Please reconnect.',
      requiresReconnection: true
    });
  }

  next(error);
}

module.exports = {
  ensureValidToken,
  requireStripeConnection,
  handleTokenError
};
