using com.sap.mock.products as db from '../db/schema';

/**
 * Product Service
 * Main service for product management
 */
service ProductService @(path: '/products') {

  /**
   * Products - Read and write access
   * Allows full CRUD operations on products
   */
  @odata.draft.enabled
  entity Products as projection on db.Products {
    *,
    virtual available : Boolean  // Computed field: isActive && stock > 0
  } actions {
    /**
     * Update stock level
     */
    action updateStock(quantity : Integer) returns Products;

    /**
     * Activate/Deactivate product
     */
    action toggleActive() returns Products;
  };

  /**
   * Categories - Read and write access
   */
  @odata.draft.enabled
  entity Categories as projection on db.Categories;

  /**
   * Suppliers - Read and write access
   */
  @odata.draft.enabled
  entity Suppliers as projection on db.Suppliers;

  /**
   * Orders - Read and write access
   */
  @odata.draft.enabled
  entity Orders as projection on db.Orders;

  /**
   * Order Items - Read only via orders
   */
  entity OrderItems as projection on db.OrderItems;

  /**
   * Product Analytics - Calculated view
   */
  @readonly
  entity ProductAnalytics as
    select from db.Products {
      category.name     as categoryName,
      count(*)          as productCount : Integer,
      avg(price)        as avgPrice : Decimal(10, 2),
      sum(stock)        as totalStock : Integer
    }
    group by
      category.name;

  /**
   * Function: Get low stock products
   */
  function getLowStockProducts(threshold : Integer) returns array of Products;

  /**
   * Function: Calculate order total
   */
  function calculateOrderTotal(orderId : UUID) returns Decimal(10, 2);

  /**
   * NEW FEATURE: Bulk Price Update
   * Updates prices for multiple products at once
   */
  type PriceUpdateResult {
    success : Boolean;
    productsUpdated : Integer;
    updates : array of {
      productId : UUID;
      productName : String;
      oldPrice : Decimal(10, 2);
      newPrice : Decimal(10, 2);
    };
  };

  function bulkPriceUpdate(
    productIds : array of UUID,
    adjustmentType : String,
    adjustmentValue : Decimal(10, 2)
  ) returns PriceUpdateResult;

  /**
   * NEW FEATURE: Advanced Product Search
   * Search products with multiple filter criteria
   */
  function advancedSearch(
    searchTerm : String,
    minPrice : Decimal(10, 2),
    maxPrice : Decimal(10, 2),
    category : String,
    inStock : Boolean
  ) returns array of Products;
}

/**
 * Analytics Service
 * Read-only analytics and reporting
 */
service AnalyticsService @(path: '/analytics') {

  @readonly
  entity ProductSummary as
    select from db.Products {
      ID,
      name,
      price,
      stock,
      category.name     as categoryName : String,
      supplier.name     as supplierName : String,
      isActive
    };

  @readonly
  entity SalesAnalytics as
    select from db.Orders {
      key ID,
      orderNumber,
      orderDate,
      customer,
      totalAmount,
      status,
      items.quantity as itemCount : Integer
    };
}
