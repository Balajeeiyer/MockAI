using { cuid, managed } from '@sap/cds/common';

namespace com.sap.mock.products;

/**
 * Product entity
 * Represents products in the catalog
 */
entity Products : cuid, managed {
  name        : String(100) @mandatory;
      description : String(500);
      price       : Decimal(10, 2) @mandatory;
      currency    : String(3) default 'USD';
      stock       : Integer default 0;
      maxStock    : Integer default 1000; // Maximum stock capacity for warehouse
      category    : Association to Categories;
      supplier    : Association to Suppliers;
      isActive    : Boolean default true;
}

/**
 * Category entity
 * Product categories for organization
 */
entity Categories : cuid, managed {
  name        : String(50) @mandatory;
      description : String(200);
      products    : Association to many Products
                      on products.category = $self;
}

/**
 * Supplier entity
 * Suppliers of products
 */
entity Suppliers : cuid, managed {
  name        : String(100) @mandatory;
      email       : String(100);
      phone       : String(20);
      address     : String(200);
      products    : Association to many Products
                      on products.supplier = $self;
}

/**
 * Order entity
 * Customer orders
 */
entity Orders : cuid, managed {
  orderNumber : String(20) @mandatory;
      orderDate   : Date @mandatory;
      customer    : String(100) @mandatory;
      totalAmount : Decimal(10, 2);
      status      : String(20) default 'PENDING';
      items       : Composition of many OrderItems
                      on items.order = $self;
}

/**
 * OrderItem entity
 * Individual items in an order
 */
entity OrderItems : cuid {
  order    : Association to Orders;
      product  : Association to Products;
      quantity : Integer @mandatory;
      price    : Decimal(10, 2);
}
