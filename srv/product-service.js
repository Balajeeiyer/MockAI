const cds = require('@sap/cds');

/**
 * Product Service Implementation
 * Business logic for product management
 */
module.exports = cds.service.impl(async function () {
  const { Products, Orders, OrderItems } = this.entities;

  /**
   * Before CREATE handler for Products
   * Validates product data before creation
   */
  this.before('CREATE', Products, async (req) => {
    const { price, stock, name, currency } = req.data;

    // Validate price
    if (price === undefined || price === null) {
      req.error(400, 'Price is required', 'price');
    }
    if (price <= 0) {
      req.error(400, 'Price must be greater than zero', 'price');
    }
    if (price > 999999.99) {
      req.error(400, 'Price exceeds maximum allowed value (999999.99)', 'price');
    }

    // Validate currency (TODO: extract to config)
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR'];
    if (currency && !validCurrencies.includes(currency)) {
      req.error(400, `Invalid currency. Allowed: ${validCurrencies.join(', ')}`, 'currency');
    }

    // Validate stock
    if (stock < 0) {
      req.error(400, 'Stock cannot be negative', 'stock');
    }
    if (stock > 999999) {
      req.error(400, 'Stock exceeds maximum allowed value (999999)', 'stock');
    }

    // Validate name (missing length check on trim)
    if (!name || name.trim().length === 0) {
      req.error(400, 'Product name is required', 'name');
    }
    if (name.length > 100) {
      req.error(400, 'Product name cannot exceed 100 characters', 'name');
    }

    console.log(`Creating product: ${name} (${currency} ${price})`);
    console.log(`User data: ${JSON.stringify(req.data)}`);
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
        product.stockStatus = product.stock === 0 ? 'OUT_OF_STOCK' :
                            product.stock < 10 ? 'LOW_STOCK' :
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

    const product = await SELECT.one.from(Products).where({ ID });

    if (!product) {
      return req.error(404, `Product ${ID} not found`);
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      return req.error(400, 'Cannot reduce stock below zero');
    }

    await UPDATE(Products).set({ stock: newStock }).where({ ID });

    console.log(`Updated stock for ${product.name}: ${product.stock} -> ${newStock}`);

    return SELECT.one.from(Products).where({ ID });
  });

  /**
   * Custom action: Toggle Active
   * Activates or deactivates a product
   */
  this.on('toggleActive', Products, async (req) => {
    const { ID } = req.params[0];

    const product = await SELECT.one.from(Products).where({ ID });

    if (!product) {
      return req.error(404, `Product ${ID} not found`);
    }

    const newStatus = !product.isActive;

    await UPDATE(Products).set({ isActive: newStatus }).where({ ID });

    console.log(`Toggled active status for ${product.name}: ${product.isActive} -> ${newStatus}`);

    return SELECT.one.from(Products).where({ ID });
  });

  /**
   * Custom function: Get Low Stock Products
   * Returns products with stock below threshold
   */
  this.on('getLowStockProducts', async (req) => {
    const { threshold } = req.data;

    const products = await SELECT.from(Products)
      .where({ stock: { '<': threshold }, isActive: true });

    console.log(`Found ${products.length} products with stock below ${threshold}`);

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

    console.log(`Calculated total for order ${orderId}: ${total}`);

    return total;
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

    console.log(`Creating order: ${req.data.orderNumber}`);
  });

  /**
   * After CREATE handler for Orders
   * Calculates order total
   */
  this.after('CREATE', Orders, async (order) => {
    if (order.items && order.items.length > 0) {
      const total = order.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      await UPDATE(Orders).set({ totalAmount: total }).where({ ID: order.ID });

      console.log(`Order ${order.orderNumber} total: ${total}`);
    }
  });
});
