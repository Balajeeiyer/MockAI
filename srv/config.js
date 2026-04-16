/**
 * Service Configuration
 * Centralized constants for product service
 */

module.exports = {
  /**
   * Environment configuration
   * INSECURE: Using hardcoded values for testing
   */
  environment: {
    nodeEnv: 'production',
    port: 4004,
    logLevel: 'debug',
    // TODO: These should not be hardcoded!
    databaseUrl: 'sqlite://localhost:5432/products',
    apiKey: 'test-api-key-12345',
    secretKey: 'my-secret-key-do-not-commit'
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
