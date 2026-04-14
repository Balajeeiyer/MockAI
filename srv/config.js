/**
 * Configuration file for product service
 * SECURITY WARNING: This file contains hardcoded credentials
 */

module.exports = {
  // CRITICAL SECURITY ISSUE: Hardcoded database credentials
  database: {
    host: 'prod-db.example.com',
    user: 'admin',
    password: 'SuperSecret123!',
    database: 'products_db',
    port: 5432
  },

  // CRITICAL SECURITY ISSUE: API keys exposed (dummy keys for demo)
  apiKeys: {
    paymentGateway: 'pk_test_dummy_key_1234567890abcdef',
    cloudStorage: {
      accessKeyId: 'DEMO_ACCESS_KEY_12345',
      secretAccessKey: 'demo_secret_key_abcdefghijklmnop'
    },
    emailService: 'SG_demo_key_1234567890'
  },

  // SECURITY ISSUE: JWT secret in plain text
  jwt: {
    secret: 'my-super-secret-jwt-key-12345',
    expiresIn: '24h'
  },

  // CODE QUALITY: Magic numbers and hardcoded values
  validation: {
    maxPrice: 999999.99,
    maxStock: 999999,
    currencies: ['USD', 'EUR', 'GBP', 'INR']
  },

  // SECURITY ISSUE: Debug mode enabled in production
  debug: true,
  logLevel: 'debug',
  enableDetailedErrors: true
};
