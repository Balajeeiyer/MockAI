using com.sap.mock.products as db from '../db/schema';

/**
 * Initial data for Categories
 */
entity com.sap.mock.products.Categories {
  ID          : UUID;
  name        : String;
  description : String;
}

/**
 * Initial data for Suppliers
 */
entity com.sap.mock.products.Suppliers {
  ID      : UUID;
  name    : String;
  email   : String;
  phone   : String;
  address : String;
}

/**
 * Initial data for Products
 */
entity com.sap.mock.products.Products {
  ID          : UUID;
  name        : String;
  description : String;
  price       : Decimal;
  currency    : String;
  stock       : Integer;
  isActive    : Boolean;
}
