// dotenv
require('dotenv').config();

module.export = {
  goatPricingEnabled: process.env.GOAT_PRICING_ENABLED === 'true',
};
