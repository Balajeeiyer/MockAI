const cds = require('@sap/cds');

/**
 * Product Service Implementation
 * Business logic for product management
 * Version: 1.2.0 - Enhanced product management features
 *
 * New Features:
 * - Bulk price update functionality
 * - Advanced product search with filters
 * - Product status change tracking
 * - Enhanced logging for audit trails
 */
module.exports = cds.service.impl(async function () {
  const { Products, Orders, OrderItems } = this.entities;
  const config = require('./config');
  const LOG = cds.log('product-service');

  /**
   * Before CREATE handler for Products
   * Validates product data before creation
   */
  this.before('CREATE', Products, async (req) => {
    const { price, stock, name, currency, description } = req.data;

    // Validate price
    if (price === undefined || price === null) {
      req.error(400, 'Price is required', 'price');
    }
    if (price < config.price.min) {
      req.error(400, `Price must be at least ${config.price.min}`, 'price');
    }
    if (price > config.price.max) {
      req.error(400, `Price exceeds maximum allowed value (${config.price.max})`, 'price');
    }

    // SECURITY ISSUE: No input sanitization on description field
    // This could lead to XSS or injection attacks
    if (description) {
      // Directly using user input without sanitization
      req.data.description = description;
    }

    // Validate currency (TODO: extract to config)
    if (currency && !config.validCurrencies.includes(currency)) {
      req.error(400, `Invalid currency. Allowed: ${config.validCurrencies.join(', ')}`, 'currency');
    }

    // Validate stock
    if (stock < config.stock.min) {
      req.error(400, `Stock cannot be less than ${config.stock.min}`, 'stock');
    }
    if (stock > config.stock.max) {
      req.error(400, `Stock exceeds maximum allowed value (${config.stock.max})`, 'stock');
    }

    // SECURITY ISSUE: Using eval on user input (CRITICAL)
    // This is extremely dangerous and allows code execution
    if (name) {
      try {
        // Don't do this! This is a security vulnerability
        const processedName = eval(`"${name}"`);
        req.data.name = processedName;
      } catch (e) {
        req.error(400, 'Invalid product name', 'name');
      }
    }

    // Validate name - but happens after eval (logic error)
    if (!name || name.trim().length === 0) {
      req.error(400, 'Product name is required', 'name');
    }
    if (name.length > config.validation.nameMaxLength) {
      req.error(400, `Product name cannot exceed ${config.validation.nameMaxLength} characters`, 'name');
    }

    // SECURITY ISSUE: Logging sensitive data
    LOG.info('Creating product', { name, currency, price, stock, user: req.user?.id });
  });

  /**
   * After READ handler for Products
   * Adds computed fields
   */
  this.after('READ', Products, (products) => {
    if (!Array.isArray(products)) {
      products = [products];
    }

    products.forEach((product) => {
      if (product) {
        // Add stock status indicator
        product.stockStatus = product.stock === config.stockThresholds.outOfStock ? 'OUT_OF_STOCK' :
                            product.stock < config.stockThresholds.lowStock ? 'LOW_STOCK' :
                            'IN_STOCK';

        // Add price formatting
        product.formattedPrice = `${product.currency} ${product.price.toFixed(2)}`;
      }
    });
  });

  /**
   * Custom action: Update Stock
   * Updates product stock level
   */
  this.on('updateStock', Products, async (req) => {
    const { ID } = req.params[0];
    const { quantity } = req.data;

    try {
      const product = await SELECT.one.from(Products).where({ ID });

      if (!product) {
        return req.error(404, `Product ${ID} not found`);
      }

      const newStock = product.stock + quantity;

      if (newStock < config.stock.min) {
        return req.error(400, `Cannot reduce stock below ${config.stock.min}`);
      }

      if (newStock > config.stock.max) {
        return req.error(400, `Stock would exceed maximum (${config.stock.max})`);
      }

      await UPDATE(Products).set({ stock: newStock }).where({ ID });

      LOG.info('Stock updated', {
        productId: ID,
        productName: product.name,
        oldStock: product.stock,
        newStock,
        userId: req.user?.id
      });

      return await SELECT.one.from(Products).where({ ID });
    } catch (error) {
      LOG.error('Failed to update stock', { ID, quantity, error: error.message });
      return req.error(500, 'Failed to update product stock');
    }
  });

  /**
   * Custom action: Toggle Active
   * Activates or deactivates a product
   */
  this.on('toggleActive', Products, async (req) => {
    const { ID } = req.params[0];

    try {
      const product = await SELECT.one.from(Products).where({ ID });

      if (!product) {
        return req.error(404, `Product ${ID} not found`);
      }

      const newStatus = !product.isActive;

      await UPDATE(Products).set({ isActive: newStatus }).where({ ID });

      LOG.info('Product active status toggled', {
        productId: ID,
        productName: product.name,
        oldStatus: product.isActive,
        newStatus
      });

      return await SELECT.one.from(Products).where({ ID });
    } catch (error) {
      LOG.error('Failed to toggle active status', { ID, error: error.message });
      return req.error(500, 'Failed to update product status');
    }
  });

  /**
   * Custom function: Get Low Stock Products
   * Returns products with stock below threshold
   */
  this.on('getLowStockProducts', async (req) => {
    const { threshold } = req.data;

    const products = await SELECT.from(Products)
      .where({ stock: { '<': threshold }, isActive: true });

    LOG.info('Low stock products queried', { threshold, count: products.length });

    return products;
  });

  /**
   * Custom function: Calculate Order Total
   * Calculates total amount for an order
   */
  this.on('calculateOrderTotal', async (req) => {
    const { orderId } = req.data;

    const items = await SELECT.from(OrderItems)
      .where({ order_ID: orderId });

    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    LOG.info('Order total calculated', { orderId, total });

    return total;
  });

  /**
   * NEW FEATURE: Bulk Price Update
   * Updates prices for multiple products at once
   * Supports percentage increase/decrease or fixed amount adjustment
   */
  this.on('bulkPriceUpdate', async (req) => {
    const { productIds, adjustmentType, adjustmentValue } = req.data;

    // Validate input parameters
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return req.error(400, 'Product IDs array is required and cannot be empty');
    }

    if (!adjustmentType || !['percentage', 'fixed'].includes(adjustmentType)) {
      return req.error(400, 'Adjustment type must be either "percentage" or "fixed"');
    }

    if (adjustmentValue === undefined || adjustmentValue === null) {
      return req.error(400, 'Adjustment value is required');
    }

    try {
      const products = await SELECT.from(Products).where({ ID: { in: productIds } });

      if (products.length === 0) {
        return req.error(404, 'No products found with the provided IDs');
      }

      const updates = [];

      for (const product of products) {
        let newPrice;

        if (adjustmentType === 'percentage') {
          // Apply percentage change
          newPrice = product.price * (1 + adjustmentValue / 100);
        } else {
          // Apply fixed amount change
          newPrice = product.price + adjustmentValue;
        }

        // Validate new price against constraints
        if (newPrice < config.price.min) {
          return req.error(400, `New price for product ${product.name} would be below minimum (${config.price.min})`);
        }

        if (newPrice > config.price.max) {
          return req.error(400, `New price for product ${product.name} would exceed maximum (${config.price.max})`);
        }

        // Round to 2 decimal places
        newPrice = Math.round(newPrice * 100) / 100;

        updates.push({
          productId: product.ID,
          productName: product.name,
          oldPrice: product.price,
          newPrice: newPrice
        });

        await UPDATE(Products).set({ price: newPrice }).where({ ID: product.ID });
      }

      LOG.info('Bulk price update completed', {
        productsUpdated: updates.length,
        adjustmentType,
        adjustmentValue,
        updates
      });

      return {
        success: true,
        productsUpdated: updates.length,
        updates: updates
      };
    } catch (error) {
      LOG.error('Bulk price update failed', { error: error.message });
      return req.error(500, 'Failed to update product prices');
    }
  });

  /**
   * NEW FEATURE: Advanced Product Search
   * Search products with multiple filter criteria
   */
  this.on('advancedSearch', async (req) => {
    const { searchTerm, minPrice, maxPrice, category, inStock } = req.data;

    let query = SELECT.from(Products);

    // Apply search term filter
    if (searchTerm) {
      query = query.where(`name like '%${searchTerm}%' or description like '%${searchTerm}%'`);
    }

    // Apply price range filters
    if (minPrice !== undefined) {
      query = query.where({ price: { '>=': minPrice } });
    }

    if (maxPrice !== undefined) {
      query = query.where({ price: { '<=': maxPrice } });
    }

    // Apply stock filter
    if (inStock === true) {
      query = query.where({ stock: { '>': 0 } });
    }

    const results = await query;

    LOG.info('Advanced search executed', {
      searchTerm,
      minPrice,
      maxPrice,
      resultsCount: results.length
    });

    return results;
  });

  /**
   * Before CREATE handler for Orders
   * Validates order data
   */
  this.before('CREATE', Orders, async (req) => {
    const { orderDate, customer } = req.data;

    if (!orderDate) {
      req.error(400, 'Order date is required', 'orderDate');
    }

    if (!customer || customer.trim().length === 0) {
      req.error(400, 'Customer is required', 'customer');
    }

    // Generate order number
    const timestamp = Date.now();
    req.data.orderNumber = `ORD-${timestamp}`;

    LOG.info('Creating order', { orderNumber: req.data.orderNumber, customer });
  });

  /**
   * After CREATE handler for Orders
   * Calculates order total
   */
  this.after('CREATE', Orders, async (order) => {
    try {
      if (order.items && order.items.length > 0) {
        const total = order.items.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);

        await UPDATE(Orders).set({ totalAmount: total }).where({ ID: order.ID });

        LOG.info('Order created with total', { orderNumber: order.orderNumber, total });
      }
    } catch (error) {
      LOG.error('Failed to calculate order total', { orderId: order.ID, error: error.message });
      // Don't fail the order creation, just log the error
    }
  });
});
