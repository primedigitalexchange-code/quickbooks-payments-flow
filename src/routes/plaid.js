const express = require('express');
const plaidService = require('../services/plaid.service');
const {
  validatePlaidLinkToken,
  validatePlaidExchangeToken,
  validatePlaidTransfer,
  validatePlaidSimulation
} = require('../middleware/validation');

const router = express.Router();

router.post('/link-token', validatePlaidLinkToken, async (req, res, next) => {
  try {
    const result = await plaidService.createLinkToken(req.body, { requestId: req.id });

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

router.post('/exchange-token', validatePlaidExchangeToken, async (req, res, next) => {
  try {
    const result = await plaidService.exchangePublicToken(req.body, { requestId: req.id });

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers', validatePlaidTransfer, async (req, res, next) => {
  try {
    const result = await plaidService.createTransfer(req.body, { requestId: req.id });

    res.status(201).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

router.get('/transfers/:transferId', async (req, res, next) => {
  try {
    const result = await plaidService.getTransfer(req.params.transferId, { requestId: req.id });

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:transferId/simulate', validatePlaidSimulation, async (req, res, next) => {
  try {
    const result = await plaidService.simulateTransferEvent(req.params.transferId, req.body.eventType, {
      requestId: req.id
    });

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

router.post('/webhook', async (req, res, next) => {
  try {
    await plaidService.verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), req.get('Plaid-Verification'), {
      requestId: req.id
    });

    const result = await plaidService.processWebhook(req.body, { requestId: req.id });

    res.status(200).json({
      success: true,
      data: result,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
