# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Technology Stack

This is a **SAP Cloud Application Programming Model (CAP)** application with a **SAPUI5** frontend for product management. The stack consists of:

- **Backend**: SAP CAP (Node.js) with CDS (Core Data Services)
- **Database**: SQLite (development), designed for HANA (production)
- **Frontend**: SAPUI5 Fiori application with OData V4
- **Testing**: Jest for backend unit tests
- **Linting**: ESLint with SAP CDS plugin

## Development Commands

```bash
# Start development server with live reload (backend + UI)
npm run watch

# Start server without live reload
npm start

# Build the application (generates CSN, EDMX, etc.)
npm run build

# Deploy database schema and data
npm run deploy

# Run tests with coverage
npm test

# Run tests without coverage
npm test -- --no-coverage

# Run a specific test file
npm test -- test/product-service.test.js

# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Application URLs (Development)

- Backend OData Service: `http://localhost:4004/products/`
- Fiori UI: `http://localhost:4004/products/webapp/index.html`
- Service Metadata: `http://localhost:4004/products/$metadata`

## Architecture Overview

### Product Entity Extensions (Recent)

The Products entity has been enhanced with additional fields:
- **sku**: Product SKU/identifier (String, max 50 chars)
- **minimumOrderQuantity**: Minimum order quantity (Integer, default 1, range 1-10,000)
- **bulkPriceUpdate**: Custom action for updating prices across multiple products
- **advancedSearch**: Custom function with filters for name, category, price range, stock level

These additions support bulk operations and advanced filtering capabilities.

### Backend Architecture

The backend follows **SAP CAP's three-tier architecture**:

1. **Data Model Layer** (`db/`)
   - `schema.cds`: Entity definitions with aspects (managed, cuid)
   - Entities: Products, Categories, Suppliers, Orders, OrderItems
   - Key patterns: UUID keys, managed aspects for audit fields, associations/compositions

2. **Service Layer** (`srv/`)
   - `product-service.cds`: Service definitions, projections, custom actions/functions
   - `product-service.js`: Event handlers (before/after CREATE/READ, custom actions)
   - Two services: ProductService (CRUD) and AnalyticsService (read-only)

3. **Custom Logic Patterns**
   - **Before handlers**: Validation logic (price, stock, currency, name length)
   - **After handlers**: Computed fields (stockStatus, available, formattedPrice), business logic
   - **Custom actions**: updateStock, toggleActive (bound to Products entity)
   - **Custom functions**: getLowStockProducts, calculateOrderTotal (unbound operations)

### Frontend Architecture

SAPUI5 application (`app/products/`) with standard Fiori structure:

- **manifest.json**: App descriptor with OData V4 model configuration
- **view/**: XML views (App.view.xml, Main.view.xml)
- **controller/**: Controllers (App.controller.js, Main.controller.js)
- **model/**: Formatters and custom models
- **i18n/**: Internationalization resource bundles
- **css/**: Custom styles

The UI communicates with the backend via OData V4 protocol with automatic expand/select optimization.

## Important Patterns and Conventions

### CDS Patterns

1. **Aspects for Reusability**
   - `managed`: Adds createdAt, createdBy, modifiedAt, modifiedBy (auto-populated)
   - `cuid`: Adds UUID primary key
   - Use these on entities: `entity Products : managed { ... }`

2. **Associations vs Compositions**
   - Associations: References (category, supplier on Products)
   - Compositions: Owned children (items on Orders) - cascade delete

3. **Service Projections**
   - Services expose entities as projections: `entity Products as projection on db.Products`
   - This separates persistence from API exposure

### Validation Rules

Product validation (enforced in `srv/product-service.js` before CREATE):

- **Price**: Required, > 0, ≤ 999,999.99
- **Currency**: Must be USD, EUR, GBP, or INR
- **Stock**: ≥ 0, ≤ 999,999
- **Name**: Required, not empty after trim, ≤ 100 characters
- **Description**: Optional, ≤ 500 characters

### Business Logic Handlers

CAP event handler registration pattern:
```javascript
this.before('CREATE', Products, async (req) => { /* validation */ });
this.after('READ', Products, (products) => { /* compute fields */ });
this.on('updateStock', Products, async (req) => { /* custom action */ });
```

### OData V4 Features

- **Draft Mode**: Enabled on all writable entities (`@odata.draft.enabled`)
- **Actions**: Bound to entity instances (updateStock, toggleActive, bulkPriceUpdate)
- **Functions**: Unbound operations (getLowStockProducts, calculateOrderTotal, advancedSearch)
- **Analytics**: Aggregated views (ProductAnalytics with group by)

## Testing

- Test files: `test/**/*.test.js`
- Coverage thresholds: 70% (branches, functions, lines, statements)
- Mock CDS runtime for service testing
- Test pattern: Arrange-Act-Assert

## Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line endings**: Unix (LF)
- **Console logs**: Warning level (use logging framework in production)

## AI-Powered PR Reviews & Cross-Repository Testing

### Hyperspace Bot

This repository uses **Hyperspace Bot** for automated PR analysis:

- Runs on PR creation/update automatically
- Provides multi-agent analysis (security, quality, standards)
- Generates detailed comments with file locations, line numbers, and specific fixes
- Adds labels: `hyperspace-analyzed`, `ready-to-merge`, `needs-fixes`, `security-review`
- See `.github/HYPERSPACE_BOT.md` for details

### Cross-Repository Integration Testing

When PRs modify API-related files (`srv/product-service.cds`, `srv/product-service.js`, `db/schema.cds`), the workflow automatically:

1. Detects API changes
2. Dispatches integration test events to dependent repositories (configured in `.github/dependent-repos.yml`)
3. Reports results back to the PR via comments and GitHub Checks

**Configuration**: Requires `CROSS_REPO_TOKEN` secret (Personal Access Token with `repo` scope)
- Without token: Graceful degradation with setup instructions
- With token: Full bidirectional communication between repositories

**Dependent repositories**: OrderService (`Balajeeiyer/OrderService`) - integration tests for Products API endpoints

## Database

- **Development**: SQLite (`db/products.db`)
- **Production**: SAP HANA (deploy format: hdbtable)
- Schema changes: Update `db/schema.cds` → run `npm run deploy`

## Common Development Tasks

### Adding a New Entity

1. Define entity in `db/schema.cds`
2. Expose in service in `srv/product-service.cds`
3. Add handlers in `srv/product-service.js` if needed
4. Run `npm run deploy` to update database

### Adding Custom Actions/Functions

1. Define in service CDS file: `action myAction() returns MyEntity;`
2. Implement handler: `this.on('myAction', MyEntity, async (req) => { ... });`
3. Test the endpoint via OData

### Modifying UI5 Application

1. Views: Update XML in `app/products/view/`
2. Logic: Update controllers in `app/products/controller/`
3. Data binding configured in manifest.json
4. Changes reflected automatically in watch mode

## Key Files

- `db/schema.cds`: Data model definitions
- `srv/product-service.cds`: Service API definitions
- `srv/product-service.js`: Business logic implementation
- `app/products/manifest.json`: UI5 app configuration
- `package.json`: Dependencies and CAP configuration
- `.github/workflows/hyperspace-bot.yml`: PR automation workflow with cross-repo integration
- `.github/dependent-repos.yml`: Cross-repository testing configuration

## Security & Authentication

### CROSS_REPO_TOKEN Setup

For cross-repository integration testing, configure a Personal Access Token:

1. Create GitHub PAT with `repo` scope (access to private/public repositories)
2. Add as repository secret: `CROSS_REPO_TOKEN`
3. Token enables:
   - Dispatching integration tests to dependent repositories (MockAI → OrderService)
   - Posting results back to source PR (OrderService → MockAI)
   - Creating GitHub Checks on commits

Without this token, the workflow provides graceful degradation with setup instructions in PR comments.
