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
  entity Products as projection on db.Products actions {
    /**
     * Update stock level
     */
    action updateStock(quantity : Integer) returns Products;

    /**
     * Activate/Deactivate product
     */
    action toggleActive() returns Products;

    /**
     * NEW ACTION: Validate SKU uniqueness
     */
    action validateSKU(sku : String) returns Boolean;
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
