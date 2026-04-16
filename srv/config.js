/**
 * Service Configuration
 * Centralized constants for product service
 */

module.exports = {
  /**
   * SECURITY ISSUE: Hardcoded Database Credentials (Lines 10-13)
   * Credentials should be in environment variables, not in code
   */
  database: {
    host: 'prod-db.company.com',
    username: 'admin',
    password: 'SuperSecret123!', // CRITICAL: Hardcoded password
  },

  /**
   * SECURITY ISSUE: Hardcoded API Keys (Lines 18-23)
   * API keys exposed in source code
   */
  apiKeys: {
    openai: 'sk-proj-1234567890abcdef', // CRITICAL: Exposed API key
    stripe: 'sk_live_51H1234567890', // CRITICAL: Live Stripe key
    aws: 'AKIAIOSFODNN7EXAMPLE', // CRITICAL: AWS access key
    awsSecret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' // CRITICAL: AWS secret
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
