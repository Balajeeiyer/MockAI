/**
 * Service Configuration
 * Centralized constants for product service
 */

module.exports = {
  /**
   * Environment configuration
   * Load from environment variables for security
   * Updated: Enhanced with additional environment variables
   */
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4004,
    logLevel: process.env.LOG_LEVEL || 'info',
    // Secure: Load from environment, never hardcode
    databaseUrl: process.env.DATABASE_URL || 'sqlite://db/products.db',
    apiKey: process.env.API_KEY || '',
    secretKey: process.env.SECRET_KEY || ''
  },

  /**
   * Valid currency codes (ISO 4217)
   */
  validCurrencies: ['USD', 'EUR', 'GBP', 'INR'],

  /**
   * Price constraints
   */
  price: {
    min: 0.01,
    max: 999999.99
  },

  /**
   * Stock constraints
   */
  stock: {
    min: 0,
    max: 999999
  },

  /**
   * Stock status thresholds
   */
  stockThresholds: {
    outOfStock: 0,
    lowStock: 10
  },

  /**
   * Validation limits
   */
  validation: {
    nameMaxLength: 100,
    descriptionMaxLength: 500,
    categoryNameMaxLength: 50,
    categoryDescriptionMaxLength: 200,
    supplierNameMaxLength: 100,
    orderNumberMaxLength: 20,
    customerNameMaxLength: 100
  }
};
