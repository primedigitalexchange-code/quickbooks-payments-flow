const Joi = require('joi');
const logger = require('../utils/logger');

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  customerId: Joi.string().required(),
  description: Joi.string().optional()
});

const bankDetailsSchema = Joi.object({
  accountNumber: Joi.string().pattern(/^\d{4,17}$/).required(),
  routingNumber: Joi.string().pattern(/^\d{9}$/).required(),
  bankName: Joi.string().trim().required(),
  bankAddress: Joi.string().trim().required()
});

const plaidLinkTokenSchema = Joi.object({
  userId: Joi.string().optional(),
  customerId: Joi.string().optional(),
  clientName: Joi.string().max(30).optional(),
  language: Joi.string().default('en'),
  countryCodes: Joi.array().items(Joi.string().length(2)).default(['US']),
  webhookUrl: Joi.string().uri().optional(),
  redirectUri: Joi.string().uri().optional()
}).or('userId', 'customerId');

const plaidExchangeTokenSchema = Joi.object({
  publicToken: Joi.string().required(),
  userId: Joi.string().optional(),
  customerId: Joi.string().optional()
});

const plaidTransferSchema = Joi.object({
  accessTokenReference: Joi.string().required(),
  accountId: Joi.string().required(),
  amount: Joi.alternatives().try(
    Joi.number().positive(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/)
  ).required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  description: Joi.string().trim().max(10).required(),
  type: Joi.string().valid('credit', 'debit').default('debit'),
  achClass: Joi.string().valid('ppd', 'ccd', 'web', 'tel').default('ppd'),
  user: Joi.object({
    legalName: Joi.string().trim().required(),
    emailAddress: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional()
  }).optional(),
  metadata: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});

const plaidSimulationSchema = Joi.object({
  eventType: Joi.string().valid('posted', 'settled', 'failed', 'funds_available', 'returned').required()
});

const validatePayment = (req, res, next) => {
  const { error, value } = paymentSchema.validate(req.body);

  if (error) {
    logger.warn('Payment validation failed', error.message);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  req.body = value;
  next();
};

const validateBankDetails = (req, res, next) => {
  const normalizedBankDetails = {
    ...req.body,
    accountNumber: typeof req.body.accountNumber === 'string'
      ? req.body.accountNumber.replace(/\D/g, '')
      : req.body.accountNumber,
    routingNumber: typeof req.body.routingNumber === 'string'
      ? req.body.routingNumber.replace(/\D/g, '')
      : req.body.routingNumber,
    bankName: typeof req.body.bankName === 'string'
      ? req.body.bankName.trim()
      : req.body.bankName,
    bankAddress: typeof req.body.bankAddress === 'string'
      ? req.body.bankAddress.trim()
      : req.body.bankAddress
  };

  const { error, value } = bankDetailsSchema.validate(normalizedBankDetails);

  if (error) {
    logger.warn('Bank details validation failed', error.message);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  req.body = value;
  next();
};

const validateWithSchema = (schema, label) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);

  if (error) {
    logger.warn(`${label} validation failed`, error.message);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validatePayment,
  validateBankDetails,
  validatePlaidLinkToken: validateWithSchema(plaidLinkTokenSchema, 'Plaid link token'),
  validatePlaidExchangeToken: validateWithSchema(plaidExchangeTokenSchema, 'Plaid token exchange'),
  validatePlaidTransfer: validateWithSchema(plaidTransferSchema, 'Plaid transfer'),
  validatePlaidSimulation: validateWithSchema(plaidSimulationSchema, 'Plaid simulation')
};