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

module.exports = {
  validatePayment,
  validateBankDetails
};