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
   - **After handlers**: Computed fields (stockStatus, formattedPrice), business logic
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
- **Actions**: Bound to entity instances (updateStock, toggleActive)
- **Functions**: Unbound operations (getLowStockProducts, calculateOrderTotal)
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

## AI-Powered PR Reviews (PRo System)

This repository uses **PRo (PR Optimiser)** - a multi-workflow automated PR analysis system:

### Four Workflows Working Together

1. **pro-conflict-status.yml** (~10-30s) - Fast conflict detection
2. **pro-merge-bot.yml** (~1-2min) - Detailed conflict resolution strategies
3. **pro-bot.yml** (~2-3min) - Security vulnerability scanning with inline fixes
4. **azure-style-pipeline.yml** (~3-5min) - CI/CD with build, test, and code quality

### Key Features

- **Dual-trigger strategy**: Uses both `pull_request` and `pull_request_target` to run even when PRs have merge conflicts
- **File-filtered analysis**: Only shows security issues for files actually changed in the PR
- **Inline commit suggestions**: One-click fixes via GitHub's commit suggestion feature
- **Intelligent conflict resolution**: Provides strategy-based merge conflict resolutions (e.g., prefer secure config over hardcoded credentials)
- **Comment cleanup**: Automatically deletes old comments to prevent clutter

### Labels Added by PRo

- `pro-analyzed` - Analysis complete
- `merge-conflict` / `needs-resolution` - Conflicts detected
- `security-review` - Security issues found
- `code-quality-review` - Code quality suggestions
- `changes-required` - Action needed before merge

### Documentation

- Architecture: `docs/PRO_WORKFLOW_ARCHITECTURE.md`
- User guide: `.github/PRO_BOT.md`
- Implementation: `docs/IMPLEMENTATION_SUMMARY.md`
- Quick reference: `docs/QUICK_REFERENCE.md`

### Intentional Security Vulnerabilities (Demo Only)

**IMPORTANT**: This repository contains intentional security vulnerabilities for PRo demonstration purposes:

- `srv/config.js` - Hardcoded credentials and API keys
- `srv/product-service.js` - Input validation issues (TODO comments mark locations)
- These are **NOT** production code - they exist solely to demonstrate PRo's detection capabilities

**When working on this codebase**: Always use environment variables for sensitive data, sanitize user inputs, and follow the security fixes suggested by PRo

## Database

- **Development**: SQLite (`db/products.db`)
- **Production**: SAP HANA (deploy format: hdbtable)
- Schema changes: Update `db/schema.cds` → run `npm run deploy`
- Sample data: `db/data-model.cds` (loaded on deploy)

## Configuration Files

- `srv/config.js` - Service configuration (validation rules, thresholds, constraints)
- `package.json` - Dependencies and CAP configuration
- `.eslintrc.json` - ESLint rules (SAP CDS plugin)
- `jest.config.js` - Test configuration

## Current State (Test Scenario)

This repository currently has a **merge conflict test scenario** active:

- **Feature branch**: `feature/test-merge-conflict-demo`
- **Conflict location**: `db/schema.cds` - Product entity has diverged between branches
  - Main branch: Added `minStock` field (minimum stock threshold)
  - Feature branch: Added `maxStock` field (maximum warehouse capacity)
- **Purpose**: Demonstrate PRo's conflict detection and resolution capabilities

To test PRo workflows, create a PR from the feature branch to main. PRo will detect the conflict and provide resolution strategies.

Documentation: `docs/MERGE_CONFLICT_RESOLUTION_GUIDE.md`

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

- `db/schema.cds` - Data model definitions (entities, aspects, associations)
- `srv/product-service.cds` - Service API definitions (projections, actions, functions)
- `srv/product-service.js` - Business logic implementation (event handlers)
- `srv/config.js` - Service configuration constants
- `app/products/manifest.json` - UI5 app configuration (OData V4 model)
- `app/products/view/*.xml` - UI5 views
- `app/products/controller/*.js` - UI5 controllers
- `test/**/*.test.js` - Jest unit tests
- `.github/workflows/*.yml` - PRo automation workflows
