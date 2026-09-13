/**
 * Stripe OAuth authentication routes
 * Handles connection, callback, and token refresh
 */

const express = require('express');
const axios = require('axios');
const logger = require('../utils/logger');
const stripeService = require('../services/stripe.service');
const User = require('../models/User');

const router = express.Router();

const STRIPE_OAUTH_URL = 'https://connect.stripe.com/oauth';
const STRIPE_API_URL = 'https://api.stripe.com/v1';

/**
 * POST /api/stripe-oauth/connect
 * Initiate Stripe OAuth flow
 */
router.post('/connect', async (req, res) => {
  try {
    const { userId, redirectUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!redirectUrl) {
      return res.status(400).json({ error: 'redirectUrl is required' });
    }

    // Generate state for CSRF protection
    const state = require('crypto').randomBytes(16).toString('hex');

    // Store state in session or temporary cache (implement as needed)
    // For now, we'll return it and expect client to include it in callback
    
    const authUrl = new URL(`${STRIPE_OAUTH_URL}/authorize`);
    authUrl.searchParams.append('client_id', process.env.STRIPE_CLIENT_ID);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('stripe_user[url]', process.env.STRIPE_USER_URL || redirectUrl);
    authUrl.searchParams.append('stripe_user[country]', process.env.STRIPE_USER_COUNTRY || 'US');
    authUrl.searchParams.append('stripe_user[email]', process.env.STRIPE_USER_EMAIL);

    logger.info(`Initiating Stripe OAuth for user ${userId}`);

    res.json({
      success: true,
      authorizationUrl: authUrl.toString(),
      state,
      message: 'Redirect user to authorizationUrl to authorize Stripe Connect'
    });

  } catch (error) {
    logger.error('OAuth initiation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe-oauth/callback
 * Handle OAuth callback from Stripe
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: 'code and userId are required' });
    }

    logger.info(`Processing Stripe OAuth callback for user ${userId}`);

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(`${STRIPE_OAUTH_URL}/token`, {
      grant_type: 'authorization_code',
      code,
      client_id: process.env.STRIPE_CLIENT_ID,
      client_secret: process.env.STRIPE_SECRET_KEY
    });

    const {
      access_token,
      refresh_token,
      stripe_user_id,
      token_type,
      stripe_publishable_key
    } = tokenResponse.data;

    // Get account information
    const accountInfo = await stripeService.getAccountInfo(access_token);

    // Find or create user
    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({
        userId,
        email: accountInfo.email,
        name: accountInfo.display_name,
        status: 'active'
      });
    }

    // Update Stripe tokens
    user.stripeTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      stripeUserId: stripe_user_id,
      expiresAt: new Date(Date.now() + 3600000), // Stripe tokens expire in 1 hour typically
      tokenType: token_type
    };

    // Update Stripe account info
    user.stripeAccount = {
      accountId: accountInfo.id,
      email: accountInfo.email,
      country: accountInfo.country,
      currency: accountInfo.default_currency,
      businessType: accountInfo.business_type,
      chargesEnabled: accountInfo.charges_enabled,
      payoutsEnabled: accountInfo.payouts_enabled,
      connectedAt: new Date()
    };

    await user.save();

    logger.info(`✓ Stripe account connected for user ${userId}`);

    res.json({
      success: true,
      message: 'Stripe account connected successfully',
      user: user.toJSON(),
      stripeAccount: {
        id: accountInfo.id,
        email: accountInfo.email,
        chargesEnabled: accountInfo.charges_enabled,
        payoutsEnabled: accountInfo.payouts_enabled
      }
    });

  } catch (error) {
    logger.error('OAuth callback error:', error.message);
    res.status(500).json({
      error: 'Failed to process OAuth callback',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe-oauth/disconnect
 * Disconnect Stripe account
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear Stripe tokens
    user.stripeTokens = {
      accessToken: null,
      refreshToken: null,
      stripeUserId: null,
      expiresAt: null,
      tokenType: null
    };

    user.status = 'pending';
    await user.save();

    logger.info(`✓ Stripe account disconnected for user ${userId}`);

    res.json({
      success: true,
      message: 'Stripe account disconnected successfully'
    });

  } catch (error) {
    logger.error('Disconnect error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe-oauth/status/:userId
 * Check connection status
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isConnected = !!user.stripeTokens?.accessToken;
    const isExpired = user.isAccessTokenExpired();

    res.json({
      success: true,
      userId,
      isConnected,
      isExpired: isConnected && isExpired,
      requiresRefresh: isConnected && isExpired && user.hasRefreshToken(),
      status: user.status,
      stripeAccount: isConnected ? {
        accountId: user.stripeAccount?.accountId,
        email: user.stripeAccount?.email,
        chargesEnabled: user.stripeAccount?.chargesEnabled,
        payoutsEnabled: user.stripeAccount?.payoutsEnabled,
        connectedAt: user.stripeAccount?.connectedAt
      } : null
    });

  } catch (error) {
    logger.error('Status check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe-oauth/refresh/:userId
 * Manually refresh access token
 */
router.post('/refresh/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.hasRefreshToken()) {
      return res.status(403).json({
        error: 'No refresh token available',
        message: 'User must reconnect their Stripe account'
      });
    }

    logger.info(`Manually refreshing token for user ${userId}`);

    const newTokens = await stripeService.refreshAccessToken(
      user.stripeTokens.refreshToken
    );

    await user.updateTokens(newTokens);

    logger.info(`✓ Token refreshed successfully for user ${userId}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: user.stripeTokens.expiresAt
    });

  } catch (error) {
    logger.error('Token refresh error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
