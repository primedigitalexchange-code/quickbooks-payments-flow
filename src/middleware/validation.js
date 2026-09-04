const Joi = require('joi');
const logger = require('../utils/logger');

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  customerId: Joi.string().required(),
  description: Joi.string().optional()
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

module.exports = {
  validatePayment
};