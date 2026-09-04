const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const qbService = require('../services/quickbooks.service');

// OAuth callback handler
router.post('/callback', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const tokens = await qbService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const tokens = await qbService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;