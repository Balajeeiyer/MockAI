# MockAI - SAP CAP + UI5 Product Management Application

A full-stack product management application built with SAP Cloud Application Programming Model (CAP) and SAPUI5.

🚀 **Powered by Hyperspace Bot** - Automated AI PR reviews with multi-agent analysis and auto-assignment. [Learn more](.github/HYPERSPACE_BOT.md)

## Features

- **Backend**: SAP CAP with CDS models
  - Product management (CRUD operations)
  - Category and supplier management  
  - Order processing
  - Custom actions and functions
  - OData V4 service

- **Frontend**: SAPUI5 Fiori application
  - Responsive product list
  - Search and filter capabilities
  - Master-detail navigation
  - Inline editing and delete

- **🤖 AI-Powered PR Reviews**: Hyperspace Bot
  - Automated security scanning
  - Code quality analysis
  - Specific fixes with line numbers
  - Multi-agent validation

## Project Structure

```
MockAI/
├── db/                     # Database models
│   ├── schema.cds         # CDS data models
│   └── data-model.cds     # Initial data
├── srv/                    # Service layer
│   ├── product-service.cds # Service definitions
│   └── product-service.js  # Business logic
├── app/                    # UI applications
│   └── products/          # SAPUI5 Product app
│       ├── view/          # XML views
│       ├── controller/    # Controllers
│       ├── model/         # Formatters & models
│       └── manifest.json  # App descriptor
├── test/                   # Test files
└── .github/
    ├── workflows/
    │   └── hyperspace-bot.yml  # 🚀 AI PR Analysis
    └── HYPERSPACE_BOT.md       # Bot documentation
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- SAP CDS CLI (`@sap/cds-dk`)

## Installation

```bash
# Clone the repository
git clone https://github.tools.sap/I335962/MockAI.git
cd MockAI

# Install dependencies
npm install

# Install CDS globally (if not already installed)
npm install -g @sap/cds-dk
```

## Development

```bash
# Start the application in watch mode
npm run watch

# The application will be available at:
# - Backend API: http://localhost:4004
# - Fiori App: http://localhost:4004/products/webapp/index.html
```

## Build and Deploy

```bash
# Build the application
npm run build

# Deploy to database
npm run deploy
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linting
npm run lint
```

## API Endpoints

### OData Services

- **Product Service**: `/products/`
  - `/Products` - Product entities
  - `/Categories` - Category entities
  - `/Suppliers` - Supplier entities
  - `/Orders` - Order entities
  - `/ProductAnalytics` - Analytics view

### Custom Actions

- `updateStock` - Update product stock
- `toggleActive` - Activate/deactivate product

### Custom Functions

- `getLowStockProducts` - Get products below stock threshold
- `calculateOrderTotal` - Calculate order total amount

## Data Validation

### Product Validation Rules

The application enforces the following validation rules for products:

#### Price
- **Required**: Price must be provided
- **Minimum**: Must be greater than 0
- **Maximum**: Cannot exceed 999,999.99
- **Format**: Decimal with 2 decimal places

#### Currency
- **Allowed Values**: USD, EUR, GBP, INR
- **Default**: USD

#### Stock
- **Minimum**: Cannot be negative (>= 0)
- **Maximum**: Cannot exceed 999,999
- **Default**: 0

#### Name
- **Required**: Product name must be provided
- **Minimum Length**: Cannot be empty
- **Maximum Length**: 100 characters

#### Description
- **Optional**: Not required
- **Maximum Length**: 500 characters

### Example Valid Product

```json
{
  "name": "Premium Laptop",
  "description": "High-performance laptop for professionals",
  "price": 1299.99,
  "currency": "USD",
  "stock": 50,
  "isActive": true
}
```

### Example Validation Errors

```json
{
  "error": "Price must be greater than zero",
  "field": "price"
}

{
  "error": "Invalid currency. Allowed: USD, EUR, GBP, INR",
  "field": "currency"
}

{
  "error": "Product name cannot exceed 100 characters",
  "field": "name"
}
```

### Custom Functions

- `getLowStockProducts` - Get products below stock threshold
- `calculateOrderTotal` - Calculate order total amount

## PR Automation

This repository includes automated PR review workflows:

1. **Code Review** - Analyzes code changes in repository context
2. **Security & Quality** - Scans for vulnerabilities and quality issues
3. **Decision Making** - Routes PRs based on findings

The automation runs automatically on PR creation/update.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Create a pull request
5. Wait for automated review
6. Address any feedback
7. Get approval and merge

## License

ISC