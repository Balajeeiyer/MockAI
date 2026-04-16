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
- **Currency**: Must be USD, EUR, GBP, or INR (defined in `srv/config.js`)
- **Stock**: ≥ 0, ≤ 999,999
- **Name**: Required, not empty after trim, ≤ 100 characters
- **Description**: Optional, ≤ 500 characters

**IMPORTANT**: The codebase intentionally contains security vulnerabilities for PRo testing:
- `srv/product-service.js:52-61`: eval() usage (CRITICAL)
- `srv/product-service.js:32-36`: XSS vulnerability (HIGH)
- These are demo vulnerabilities - DO NOT remove them unless specifically asked

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

## PRo (PR Optimiser) System

This repository uses **PRo** - an automated PR analysis system with 4 parallel agents:

### How PRo Works
- **Triggers**: Runs automatically on PR create/update (even with merge conflicts)
- **Dual Trigger Strategy**: Uses both `pull_request` and `pull_request_target` to bypass GitHub's conflict blocking
- **Execution Time**: 10s (conflict status) → 60s (merge analysis) → 2min (security) → 3-5min (CI/CD)

### The 4 PRo Agents
1. **Conflict Status** (`.github/workflows/pro-conflict-status.yml`): Fast detection, adds labels
2. **Merge Bot** (`.github/workflows/pro-merge-bot.yml`): Intelligent resolution strategies
3. **Security Bot** (`.github/workflows/pro-bot.yml`): Vulnerability scanning with inline fixes (filtered to PR files only)
4. **CI/CD Pipeline** (`.github/workflows/azure-style-pipeline.yml`): Build, test, security audit, quality checks

### Key Features
- **Smart Filtering**: Security vulnerabilities only shown for files actually in the PR
- **Inline Fixes**: Click "Commit suggestion" in "Files changed" tab to apply fixes
- **Non-Blocking**: Only build failures block merge; security/quality issues are advisory
- **Conflict Resolution**: Suggests strategies (accept-base, accept-current, merge-both, regenerate, manual)

### Modifying PRo Workflows
- Workflows must exist on `main` branch to run (GitHub restriction)
- All agents are independent - one failure doesn't affect others
- Security vulnerability database is in `pro-bot.yml` (lines ~160-180)
- To add new security rules: Update `allVulnerabilities` array, ensure file filtering logic remains intact
- **CRITICAL**: Always maintain file filtering - only show issues for files in the PR

### Documentation
- `docs/PRO_SYSTEM_SUMMARY.md`: Complete system overview for reviewers
- `docs/PRO_WORKFLOW_ARCHITECTURE.md`: Technical architecture and implementation
- `docs/PRO_AGENT_INTERACTIONS.md`: How agents coordinate and communicate

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
- `srv/product-service.js`: Business logic implementation (contains intentional security vulnerabilities for demo)
- `srv/config.js`: Configuration constants and validation limits
- `app/products/manifest.json`: UI5 app configuration
- `package.json`: Dependencies and CAP configuration
- `.github/workflows/*.yml`: PRo automation workflows (4 agents)
- `docs/PRO_*.md`: Comprehensive PRo system documentation
