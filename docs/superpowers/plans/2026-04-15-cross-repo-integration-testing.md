# Cross-Repository Integration Testing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated cross-repository integration testing system that detects breaking API changes in MockAI and validates them against dependent microservices.

**Architecture:** Lightweight dispatcher pattern using GitHub repository_dispatch events. MockAI triggers integration tests in dependent repositories, which run comprehensive validation suites (schema, integration, performance) in isolated Docker environments and report results back via GitHub Checks API.

**Tech Stack:** SAP CAP, CDS, GitHub Actions, Docker Compose, Jest, autocannon, opossum (circuit breaker), Node.js 18+

---

## File Structure Overview

### MockAI Repository Changes
```
MockAI/
├── .github/
│   ├── dependent-repos.yml              [NEW] Config listing dependent repos
│   └── workflows/
│       └── hyperspace-bot.yml           [MODIFY] Add dispatcher job
├── db/
│   └── schema.cds                       [MODIFY] Use SAP common aspects
├── srv/
│   ├── config.js                        [NEW] Extract configuration constants
│   └── product-service.js               [MODIFY] Use cds.log, add error handling
└── docs/superpowers/specs/
    └── 2026-04-15-cross-repo-...md      [EXISTS] Design spec
```

### OrderService Repository (New)
```
OrderService/
├── .github/
│   └── workflows/
│       └── external-integration-test.yml  [NEW] Integration test workflow
├── db/
│   └── schema.cds                         [NEW] Orders and OrderItems entities
├── srv/
│   ├── order-service.cds                  [NEW] Service definitions
│   ├── order-service.js                   [NEW] Business logic
│   └── external/
│       └── mockai-client.js               [NEW] MockAI API client with resilience
├── test/
│   ├── integration/
│   │   ├── schema-validator.js            [NEW] OData metadata validation
│   │   ├── mockai-integration.test.js     [NEW] Integration test suite
│   │   └── performance-benchmark.js       [NEW] Performance tests
│   └── fixtures/
│       └── mockai-metadata-baseline.xml   [NEW] Baseline metadata
├── docker-compose.test.yml                [NEW] Test environment
├── Dockerfile                             [NEW] Container definition
├── package.json                           [NEW] Dependencies
├── .cdsrc.json                           [NEW] CAP configuration
└── README.md                              [NEW] Setup documentation
```

---

## Phase 1: Fix MockAI Best Practices

### Task 1: Use SAP Common Aspects in Schema

**Files:**
- Modify: `db/schema.cds:1-89`

- [ ] **Step 1: Add import for SAP common aspects**

At the top of `db/schema.cds`, add:

```cds
using { cuid, managed } from '@sap/cds/common';

namespace com.sap.mock.products;
```

- [ ] **Step 2: Remove custom aspect definitions**

Delete lines 76-89 (the custom `managed` and `cuid` aspect definitions):

```cds
// DELETE THESE LINES:
/**
 * Aspect for managed entities
 * Adds audit fields
 */
aspect managed {
  createdAt  : Timestamp @cds.on.insert: $now;
  createdBy  : String(100) @cds.on.insert: $user;
  modifiedAt : Timestamp @cds.on.insert: $now @cds.on.update: $now;
  modifiedBy : String(100) @cds.on.insert: $user @cds.on.update: $user;
}

/**
 * Aspect for entities with UUID
 */
aspect cuid {
  key ID : UUID;
}
```

- [ ] **Step 3: Remove redundant ID declarations**

In `Products`, `Categories`, and `Suppliers` entities, remove `key ID : UUID;` lines since `cuid` provides this:

Before:
```cds
entity Products : managed {
  key ID          : UUID;
  name        : String(100) @mandatory;
  ...
}
```

After:
```cds
entity Products : cuid, managed {
  name        : String(100) @mandatory;
  ...
}
```

Apply to: Products (line 7-17), Categories (line 23-29), Suppliers (line 35-43), Orders (line 49-58), OrderItems (line 64-70)

- [ ] **Step 4: Build and verify schema**

Run:
```bash
cds build
```

Expected: Build succeeds with no errors

- [ ] **Step 5: Deploy and verify database**

Run:
```bash
cds deploy
```

Expected: Database schema created successfully

- [ ] **Step 6: Test service startup**

Run:
```bash
npm start
```

Expected: Service starts on port 4004, no errors in console

Visit: http://localhost:4004/products/$metadata
Expected: OData metadata XML with all entities

Stop the server (Ctrl+C)

- [ ] **Step 7: Commit changes**

```bash
git add db/schema.cds
git commit -m "refactor: use SAP common aspects instead of custom definitions

- Import cuid and managed from @sap/cds/common
- Remove custom aspect definitions
- Remove redundant ID declarations
- Follows SAP CAP best practices for reusable aspects"
```

---

### Task 2: Create Configuration File

**Files:**
- Create: `srv/config.js`

- [ ] **Step 1: Create configuration file**

Create `srv/config.js` with:

```javascript
/**
 * Service Configuration
 * Centralized constants for product service
 */

module.exports = {
  /**
   * Valid currency codes (ISO 4217)
   */
  validCurrencies: ['USD', 'EUR', 'GBP', 'INR'],

  /**
   * Price constraints
   */
  price: {
    min: 0.01,
    max: 999999.99
  },

  /**
   * Stock constraints
   */
  stock: {
    min: 0,
    max: 999999
  },

  /**
   * Stock status thresholds
   */
  stockThresholds: {
    outOfStock: 0,
    lowStock: 10
  },

  /**
   * Validation limits
   */
  validation: {
    nameMaxLength: 100,
    descriptionMaxLength: 500,
    categoryNameMaxLength: 50,
    categoryDescriptionMaxLength: 200,
    supplierNameMaxLength: 100,
    orderNumberMaxLength: 20,
    customerNameMaxLength: 100
  }
};
```

- [ ] **Step 2: Verify file syntax**

Run:
```bash
node -c srv/config.js
```

Expected: No errors (file is valid JavaScript)

- [ ] **Step 3: Test config can be imported**

Run:
```bash
node -e "const config = require('./srv/config.js'); console.log(config.validCurrencies);"
```

Expected: Output shows `[ 'USD', 'EUR', 'GBP', 'INR' ]`

- [ ] **Step 4: Commit configuration file**

```bash
git add srv/config.js
git commit -m "feat: add centralized service configuration

- Extract all magic numbers and constants
- Define validation constraints
- Improve maintainability
- Follows SAP CAP configuration best practices"
```

---

### Task 3: Replace console.log with cds.log

**Files:**
- Modify: `srv/product-service.js:1-221`

- [ ] **Step 1: Add logger initialization at top of service**

After line 7 (`const { Products, Orders, OrderItems } = this.entities;`), add:

```javascript
  const { Products, Orders, OrderItems } = this.entities;
  const config = require('./config');
  const LOG = cds.log('product-service');
```

- [ ] **Step 2: Replace console.log in before CREATE Products handler**

Replace lines 70-72:
```javascript
// OLD:
console.log(`Creating product: ${name} (${currency} ${price}) by user ${req.user}`);
console.log(`Creating product: ${name} (${currency} ${price})`);
console.log(`Stock level: ${stock}`);

// NEW:
LOG.info('Creating product', { name, currency, price, stock, user: req.user?.id });
```

- [ ] **Step 3: Replace console.log in updateStock action**

Replace line 123:
```javascript
// OLD:
console.log(`Updated stock for ${product.name}: ${product.stock} -> ${newStock} by user ${req.user.id}`);

// NEW:
LOG.info('Stock updated', { 
  productId: ID, 
  productName: product.name, 
  oldStock: product.stock, 
  newStock, 
  userId: req.user?.id 
});
```

- [ ] **Step 4: Replace console.log in toggleActive action**

Replace line 145:
```javascript
// OLD:
console.log(`Toggled active status for ${product.name}: ${product.isActive} -> ${newStatus}`);

// NEW:
LOG.info('Product active status toggled', { 
  productId: ID, 
  productName: product.name, 
  oldStatus: product.isActive, 
  newStatus 
});
```

- [ ] **Step 5: Replace console.log in getLowStockProducts function**

Replace line 160:
```javascript
// OLD:
console.log(`Found ${products.length} products with stock below ${threshold}`);

// NEW:
LOG.info('Low stock products queried', { threshold, count: products.length });
```

- [ ] **Step 6: Replace console.log in calculateOrderTotal function**

Replace line 179:
```javascript
// OLD:
console.log(`Calculated total for order ${orderId}: ${total}`);

// NEW:
LOG.info('Order total calculated', { orderId, total });
```

- [ ] **Step 7: Replace console.log in before CREATE Orders handler**

Replace line 203:
```javascript
// OLD:
console.log(`Creating order: ${req.data.orderNumber}`);

// NEW:
LOG.info('Creating order', { orderNumber: req.data.orderNumber, customer });
```

- [ ] **Step 8: Replace console.log in after CREATE Orders handler**

Replace line 218:
```javascript
// OLD:
console.log(`Order ${order.orderNumber} total: ${total}`);

// NEW:
LOG.info('Order created with total', { orderNumber: order.orderNumber, total });
```

- [ ] **Step 9: Test service with new logging**

Run:
```bash
npm start
```

Create a test product via:
```bash
curl -X POST http://localhost:4004/products/Products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99,"currency":"USD","stock":50}'
```

Expected: Log output shows structured JSON logs like:
```
[product-service] - Creating product { name: 'Test Product', currency: 'USD', price: 99.99, stock: 50 }
```

Stop the server (Ctrl+C)

- [ ] **Step 10: Commit logging changes**

```bash
git add srv/product-service.js
git commit -m "refactor: replace console.log with cds.log

- Use structured logging with context objects
- Add LOG constant for product-service logger
- Import config module for future use
- Improves observability and follows SAP CAP logging best practices"
```

---

### Task 4: Use Config Constants in Validation

**Files:**
- Modify: `srv/product-service.js:14-67`

- [ ] **Step 1: Replace price validation with config constants**

Replace lines 18-26:
```javascript
// OLD:
if (price === undefined || price === null) {
  req.error(400, 'Price is required', 'price');
}
if (price <= 0) {
  req.error(400, 'Price must be greater than zero', 'price');
}
if (price > 999999.99) {
  req.error(400, 'Price exceeds maximum allowed value (999999.99)', 'price');
}

// NEW:
if (price === undefined || price === null) {
  req.error(400, 'Price is required', 'price');
}
if (price < config.price.min) {
  req.error(400, `Price must be at least ${config.price.min}`, 'price');
}
if (price > config.price.max) {
  req.error(400, `Price exceeds maximum allowed value (${config.price.max})`, 'price');
}
```

- [ ] **Step 2: Replace currency validation with config**

Replace line 36:
```javascript
// OLD:
const validCurrencies = ['USD', 'EUR', 'GBP', 'INR'];
if (currency && !validCurrencies.includes(currency)) {
  req.error(400, `Invalid currency. Allowed: ${validCurrencies.join(', ')}`, 'currency');
}

// NEW:
if (currency && !config.validCurrencies.includes(currency)) {
  req.error(400, `Invalid currency. Allowed: ${config.validCurrencies.join(', ')}`, 'currency');
}
```

- [ ] **Step 3: Replace stock validation with config**

Replace lines 42-46:
```javascript
// OLD:
if (stock < 0) {
  req.error(400, 'Stock cannot be negative', 'stock');
}
if (stock > 999999) {
  req.error(400, 'Stock exceeds maximum allowed value (999999)', 'stock');
}

// NEW:
if (stock < config.stock.min) {
  req.error(400, `Stock cannot be less than ${config.stock.min}`, 'stock');
}
if (stock > config.stock.max) {
  req.error(400, `Stock exceeds maximum allowed value (${config.stock.max})`, 'stock');
}
```

- [ ] **Step 4: Replace name length validation with config**

Replace line 65:
```javascript
// OLD:
if (name.length > 100) {
  req.error(400, 'Product name cannot exceed 100 characters', 'name');
}

// NEW:
if (name.length > config.validation.nameMaxLength) {
  req.error(400, `Product name cannot exceed ${config.validation.nameMaxLength} characters`, 'name');
}
```

- [ ] **Step 5: Replace stock thresholds in after READ handler**

Replace lines 87-89:
```javascript
// OLD:
product.stockStatus = product.stock === 0 ? 'OUT_OF_STOCK' :
                    product.stock < 10 ? 'LOW_STOCK' :
                    'IN_STOCK';

// NEW:
product.stockStatus = product.stock === config.stockThresholds.outOfStock ? 'OUT_OF_STOCK' :
                    product.stock < config.stockThresholds.lowStock ? 'LOW_STOCK' :
                    'IN_STOCK';
```

- [ ] **Step 6: Test validation with config**

Run:
```bash
npm start
```

Test invalid price:
```bash
curl -X POST http://localhost:4004/products/Products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":9999999,"currency":"USD","stock":50}'
```

Expected: 400 error with "Price exceeds maximum allowed value (999999.99)"

Test invalid currency:
```bash
curl -X POST http://localhost:4004/products/Products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":99.99,"currency":"JPY","stock":50}'
```

Expected: 400 error with "Invalid currency. Allowed: USD, EUR, GBP, INR"

Stop the server (Ctrl+C)

- [ ] **Step 7: Commit configuration usage**

```bash
git add srv/product-service.js
git commit -m "refactor: use configuration constants in validation

- Replace hardcoded values with config references
- Improve maintainability and consistency
- Makes validation limits configurable"
```

---

### Task 5: Add Error Handling to Database Operations

**Files:**
- Modify: `srv/product-service.js:100-126`

- [ ] **Step 1: Add try-catch to updateStock action**

Replace lines 100-126:
```javascript
// OLD:
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

  LOG.info('Stock updated', { 
    productId: ID, 
    productName: product.name, 
    oldStock: product.stock, 
    newStock, 
    userId: req.user?.id 
  });

  return SELECT.one.from(Products).where({ ID });
});

// NEW:
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
```

- [ ] **Step 2: Add try-catch to toggleActive action**

Replace lines 132-148:
```javascript
// OLD:
this.on('toggleActive', Products, async (req) => {
  const { ID } = req.params[0];

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

  return SELECT.one.from(Products).where({ ID });
});

// NEW:
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
```

- [ ] **Step 3: Add try-catch to after CREATE Orders handler**

Replace lines 210-220:
```javascript
// OLD:
this.after('CREATE', Orders, async (order) => {
  if (order.items && order.items.length > 0) {
    const total = order.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    await UPDATE(Orders).set({ totalAmount: total }).where({ ID: order.ID });

    LOG.info('Order created with total', { orderNumber: order.orderNumber, total });
  }
});

// NEW:
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
```

- [ ] **Step 4: Test error handling**

Run:
```bash
npm start
```

Test stock update with valid UUID:
```bash
# First create a product
PRODUCT_ID=$(curl -s -X POST http://localhost:4004/products/Products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99,"currency":"USD","stock":50}' | jq -r '.ID')

# Update stock
curl -X POST "http://localhost:4004/products/Products($PRODUCT_ID)/ProductService.updateStock" \
  -H "Content-Type: application/json" \
  -d '{"quantity":10}'
```

Expected: Success, stock updated to 60

Test with invalid ID:
```bash
curl -X POST "http://localhost:4004/products/Products(00000000-0000-0000-0000-000000000000)/ProductService.updateStock" \
  -H "Content-Type: application/json" \
  -d '{"quantity":10}'
```

Expected: 404 error "Product not found"

Stop the server (Ctrl+C)

- [ ] **Step 5: Commit error handling improvements**

```bash
git add srv/product-service.js
git commit -m "feat: add comprehensive error handling to database operations

- Wrap database operations in try-catch blocks
- Add stock boundary validation in updateStock
- Gracefully handle errors in order total calculation
- Improve error logging with context
- Follows SAP CAP error handling best practices"
```

---

## Phase 2: Add Cross-Repo Dispatcher to MockAI

### Task 6: Create Dependent Repos Configuration

**Files:**
- Create: `.github/dependent-repos.yml`

- [ ] **Step 1: Create configuration directory structure**

Run:
```bash
mkdir -p .github
```

Expected: Directory created (may already exist)

- [ ] **Step 2: Create dependent repos configuration file**

Create `.github/dependent-repos.yml` with:

```yaml
# Configuration for cross-repository integration testing
# Lists all repositories that depend on MockAI APIs

version: "1.0"

# Global settings
settings:
  # Maximum time to wait for dependent repo tests (minutes)
  timeout: 10
  
  # Whether to run tests in parallel or sequential
  parallel: true
  
  # Minimum required test pass rate to avoid warnings (%)
  warning_threshold: 95

# List of dependent repositories
dependent_repos:
  - name: "OrderService"
    # GitHub repository (owner/repo format)
    repository: "Balajeeiyer/OrderService"
    
    # Branch to test against (usually main/master)
    branch: "main"
    
    # Code owners to notify on failures
    code_owners:
      - "@Balajeeiyer"
    
    # Which MockAI APIs this repo depends on
    dependencies:
      - "Products CRUD"
      - "updateStock action"
      - "toggleActive action"
      - "getLowStockProducts function"
    
    # Expected test execution time (for timeout calculation)
    estimated_duration: "5m"
    
    # Whether this repo is critical (affects PR label)
    critical: true

# Notification settings
notifications:
  # Create issues in dependent repos on failure
  create_issues: true
  
  # Issue labels to apply
  issue_labels:
    - "breaking-change"
    - "external-dependency"
    - "needs-investigation"
  
  # Template for issue title
  issue_title_template: "⚠️ MockAI API change may break integration (PR #{pr_number})"
```

- [ ] **Step 3: Validate YAML syntax**

Run:
```bash
npm install -g js-yaml
js-yaml .github/dependent-repos.yml
```

Expected: Output shows parsed YAML structure (no errors)

- [ ] **Step 4: Commit configuration file**

```bash
git add .github/dependent-repos.yml
git commit -m "feat: add dependent repositories configuration

- Define OrderService as first dependent repo
- Configure code owners and notification settings
- Set timeout and parallel execution preferences
- Enable automatic issue creation on test failures"
```

---

### Task 7: Extend Hyperspace Bot Workflow with Dispatcher

**Files:**
- Modify: `.github/workflows/hyperspace-bot.yml`

- [ ] **Step 1: Read current workflow file**

Run:
```bash
cat .github/workflows/hyperspace-bot.yml | head -20
```

Expected: Shows existing workflow structure with `hyperspace-analysis` job

- [ ] **Step 2: Add dispatcher job after hyperspace-analysis**

At the end of `.github/workflows/hyperspace-bot.yml` (after the `hyperspace-analysis` job closes), add:

```yaml

  cross-repo-dispatcher:
    name: Cross-Repo Integration Dispatcher
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - name: Checkout MockAI repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install js-yaml
        run: npm install js-yaml
      
      - name: Read dependent repos configuration
        id: read-config
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const yaml = require('js-yaml');
            
            const configPath = '.github/dependent-repos.yml';
            if (!fs.existsSync(configPath)) {
              console.log('No dependent repos configured');
              core.setOutput('has_dependents', 'false');
              return;
            }
            
            try {
              const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
              core.setOutput('has_dependents', 'true');
              core.setOutput('config', JSON.stringify(config));
              core.setOutput('repo_count', config.dependent_repos.length);
              console.log(`Found ${config.dependent_repos.length} dependent repositories`);
            } catch (error) {
              core.setFailed(`Failed to parse config: ${error.message}`);
            }
      
      - name: Dispatch to dependent repositories
        if: steps.read-config.outputs.has_dependents == 'true'
        id: dispatch
        uses: actions/github-script@v7
        env:
          DISPATCHER_TOKEN: ${{ secrets.CROSS_REPO_PAT }}
        with:
          github-token: ${{ secrets.CROSS_REPO_PAT }}
          script: |
            const config = JSON.parse(process.env.CONFIG);
            const dispatches = [];
            
            for (const repo of config.dependent_repos) {
              const [owner, repoName] = repo.repository.split('/');
              
              console.log(`Dispatching to ${repo.repository}...`);
              
              try {
                await github.rest.repos.createDispatchEvent({
                  owner,
                  repo: repoName,
                  event_type: 'mockai-integration-test',
                  client_payload: {
                    mockai_pr_number: context.issue.number,
                    mockai_pr_sha: context.payload.pull_request.head.sha,
                    mockai_pr_branch: context.payload.pull_request.head.ref,
                    mockai_pr_title: context.payload.pull_request.title,
                    mockai_base_branch: context.payload.pull_request.base.ref,
                    mockai_repo: context.payload.repository.full_name,
                    dependent_repo_name: repo.name,
                    dependent_repo_branch: repo.branch,
                    callback_url: context.payload.pull_request.statuses_url,
                    timestamp: new Date().toISOString()
                  }
                });
                
                dispatches.push({
                  repo: repo.repository,
                  status: 'dispatched',
                  name: repo.name
                });
              } catch (error) {
                console.error(`Failed to dispatch to ${repo.repository}: ${error.message}`);
                dispatches.push({
                  repo: repo.repository,
                  status: 'failed',
                  error: error.message,
                  name: repo.name
                });
              }
            }
            
            core.setOutput('dispatches', JSON.stringify(dispatches));
        env:
          CONFIG: ${{ steps.read-config.outputs.config }}
      
      - name: Create tracking comment
        if: steps.read-config.outputs.has_dependents == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const config = JSON.parse(process.env.CONFIG);
            
            const repoList = config.dependent_repos.map(repo => 
              `- **${repo.name}** (\`${repo.repository}\`) - ⏳ Testing in progress...`
            ).join('\n');
            
            const body = `## 🔗 Cross-Repository Integration Tests
            
            This PR may affect **${config.dependent_repos.length}** dependent repository(ies). Integration tests have been dispatched:
            
            ${repoList}
            
            ⏱️ Tests will complete in approximately ${config.settings.timeout} minutes.
            
            ---
            
            *Results will be updated here once all tests complete. You can merge this PR regardless of test results, but please review any failures.*`;
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });
        env:
          CONFIG: ${{ steps.read-config.outputs.config }}
      
      - name: Wait for test results
        if: steps.read-config.outputs.has_dependents == 'true'
        id: wait-results
        uses: actions/github-script@v7
        timeout-minutes: 12
        with:
          script: |
            const config = JSON.parse(process.env.CONFIG);
            const maxWaitMs = config.settings.timeout * 60 * 1000;
            const pollIntervalMs = 30000; // 30 seconds
            const startTime = Date.now();
            
            const expectedChecks = config.dependent_repos.map(r => 
              `integration-test-${r.name.toLowerCase().replace(/\s+/g, '-')}`
            );
            
            console.log(`Waiting for checks: ${expectedChecks.join(', ')}`);
            
            let allCompleted = false;
            const results = {};
            
            while (!allCompleted && (Date.now() - startTime) < maxWaitMs) {
              const { data: checkRuns } = await github.rest.checks.listForRef({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: context.payload.pull_request.head.sha
              });
              
              console.log(`Found ${checkRuns.check_runs.length} check runs`);
              
              for (const checkName of expectedChecks) {
                const check = checkRuns.check_runs.find(c => c.name === checkName);
                if (check && check.status === 'completed') {
                  results[checkName] = {
                    conclusion: check.conclusion,
                    details_url: check.details_url,
                    completed_at: check.completed_at
                  };
                  console.log(`Check ${checkName}: ${check.conclusion}`);
                }
              }
              
              allCompleted = expectedChecks.every(name => results[name]);
              
              if (!allCompleted) {
                console.log(`Waiting... (${Object.keys(results).length}/${expectedChecks.length} completed)`);
                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
              }
            }
            
            core.setOutput('results', JSON.stringify(results));
            core.setOutput('all_completed', allCompleted.toString());
            console.log(`Final results: ${JSON.stringify(results, null, 2)}`);
        env:
          CONFIG: ${{ steps.read-config.outputs.config }}
      
      - name: Post results summary
        if: steps.read-config.outputs.has_dependents == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const config = JSON.parse(process.env.CONFIG);
            const results = JSON.parse(process.env.RESULTS || '{}');
            const allCompleted = process.env.ALL_COMPLETED === 'true';
            
            let summary = `## 🔗 Cross-Repository Integration Test Results\n\n`;
            
            if (!allCompleted) {
              summary += `⚠️ **Warning**: Some tests did not complete within the timeout period.\n\n`;
            }
            
            let failedRepos = [];
            let passedCount = 0;
            let failedCount = 0;
            let warningCount = 0;
            
            for (const repo of config.dependent_repos) {
              const checkName = `integration-test-${repo.name.toLowerCase().replace(/\s+/g, '-')}`;
              const result = results[checkName];
              
              if (!result) {
                summary += `- ⏱️ **${repo.name}** - Timed out or not started\n`;
                warningCount++;
              } else if (result.conclusion === 'success') {
                summary += `- ✅ **${repo.name}** - All tests passed ([details](${result.details_url}))\n`;
                passedCount++;
              } else if (result.conclusion === 'failure') {
                summary += `- ❌ **${repo.name}** - Tests failed ([details](${result.details_url}))\n`;
                failedRepos.push(repo);
                failedCount++;
              } else {
                summary += `- ⚠️ **${repo.name}** - ${result.conclusion} ([details](${result.details_url}))\n`;
                warningCount++;
              }
            }
            
            // Notify code owners of failed repos
            if (failedRepos.length > 0) {
              summary += `\n### 👥 Code Owners Notified\n\n`;
              for (const repo of failedRepos) {
                const owners = repo.code_owners.join(', ');
                summary += `- **${repo.name}**: ${owners}\n`;
              }
              
              summary += `\n⚠️ **Action Required**: Issues have been created in the affected repositories.\n`;
            }
            
            summary += `\n---\n\n`;
            summary += `📊 **Summary**: ${passedCount} passed, ${failedCount} failed, ${warningCount} warnings\n`;
            summary += `\n*Note: This PR can be merged regardless of these results. The dependent teams have been notified.*`;
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: summary
            });
            
            // Add label if there are failures
            if (failedCount > 0 || warningCount > 0) {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                labels: ['cross-repo-impact']
              });
            }
        env:
          CONFIG: ${{ steps.read-config.outputs.config }}
          RESULTS: ${{ steps.wait-results.outputs.results }}
          ALL_COMPLETED: ${{ steps.wait-results.outputs.all_completed }}
```

- [ ] **Step 3: Validate workflow syntax**

Run:
```bash
npm install -g @action-validator/core @action-validator/cli
action-validator .github/workflows/hyperspace-bot.yml
```

Expected: No syntax errors (or run `cat .github/workflows/hyperspace-bot.yml | grep -E 'name:|uses:|run:'` to visually check structure)

- [ ] **Step 4: Commit workflow changes**

```bash
git add .github/workflows/hyperspace-bot.yml
git commit -m "feat: add cross-repo integration dispatcher to workflow

- Add cross-repo-dispatcher job to hyperspace-bot workflow
- Read dependent repos from configuration file
- Dispatch repository_dispatch events to dependent repos
- Wait for test results and aggregate status
- Post tracking and summary comments on PR
- Add cross-repo-impact label on failures
- Non-blocking workflow - PR can merge regardless of results"
```

---

### Task 8: Document GitHub PAT Setup

**Files:**
- Create: `docs/CROSS_REPO_SETUP.md`

- [ ] **Step 1: Create setup documentation**

Create `docs/CROSS_REPO_SETUP.md` with:

```markdown
# Cross-Repository Integration Testing Setup

This document explains how to set up and configure the cross-repository integration testing system for MockAI.

## Prerequisites

- GitHub repository with admin access
- Personal Access Token (PAT) or GitHub App
- Dependent repository already created

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `MockAI Cross-Repo Integration`
4. Expiration: Set appropriate expiration (recommend 90 days)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

## Step 2: Add Token to MockAI Repository Secrets

1. Go to MockAI repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CROSS_REPO_PAT`
4. Value: Paste the token from Step 1
5. Click "Add secret"

## Step 3: Add Token to Dependent Repository Secrets

Repeat for each dependent repository (OrderService, etc.):

1. Go to dependent repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CROSS_REPO_PAT`
4. Value: Paste the same token
5. Click "Add secret"

## Step 4: Configure Dependent Repository

In `.github/dependent-repos.yml` of MockAI, add entry:

```yaml
dependent_repos:
  - name: "YourServiceName"
    repository: "YourOrg/YourRepo"
    branch: "main"
    code_owners:
      - "@your-github-username"
    dependencies:
      - "Products CRUD"
    estimated_duration: "5m"
    critical: true
```

## Step 5: Test Configuration

1. Create a test PR in MockAI
2. Check Actions tab for `cross-repo-dispatcher` job
3. Verify dispatch event sent (check workflow logs)
4. Verify tracking comment appears on PR
5. Check dependent repo Actions tab for triggered workflow

## Troubleshooting

### "Resource not accessible by integration" error

- Token missing or insufficient permissions
- Verify token has `repo` and `workflow` scopes
- Verify token is not expired

### Dependent repo workflow not triggering

- Check dependent repo has `.github/workflows/external-integration-test.yml`
- Verify workflow listens for `repository_dispatch` event type `mockai-integration-test`
- Check token permissions in dependent repo

### Timeout waiting for results

- Increase `settings.timeout` in `.github/dependent-repos.yml`
- Check dependent repo tests complete within estimated duration
- Review dependent repo workflow logs for failures

## Security Best Practices

- Use minimal scope tokens (only `repo` and `workflow`)
- Rotate tokens every 90 days
- Never commit tokens to repository
- Use GitHub Apps instead of PATs for production (better auditing)
- Review token usage regularly

## Next Steps

After setup is complete:

1. Create dependent repository (see OrderService example)
2. Implement integration test workflow
3. Test end-to-end flow
4. Monitor first few PRs for issues
```

- [ ] **Step 2: Commit documentation**

```bash
git add docs/CROSS_REPO_SETUP.md
git commit -m "docs: add cross-repo integration setup guide

- Document GitHub PAT creation process
- Explain secret configuration for both repos
- Add troubleshooting section
- Include security best practices"
```

---

## Phase 3: Create OrderService Repository (New Repository)

**Note:** The following tasks create a brand new repository. These steps should be executed in a new directory outside MockAI.

### Task 9: Initialize OrderService Repository

**Files:**
- Create: (new repository structure)

- [ ] **Step 1: Create new repository on GitHub**

Go to https://github.com/Balajeeiyer and click "New repository":
- Repository name: `OrderService`
- Description: `Order Management Service - Consumes MockAI Products API`
- Visibility: Public or Private (your choice)
- ✅ Add README file
- ✅ Add .gitignore (Node)
- License: ISC
- Click "Create repository"

- [ ] **Step 2: Clone repository locally**

Run:
```bash
cd ~/Documents/Github_Home
git clone https://github.com/Balajeeiyer/OrderService.git
cd OrderService
```

Expected: Repository cloned, current directory is OrderService

- [ ] **Step 3: Initialize SAP CAP project**

Run:
```bash
npx @sap/cds-dk init --add java
```

Expected: CDS project structure created with `db/`, `srv/`, `app/` directories

- [ ] **Step 4: Install dependencies**

Run:
```bash
npm install
npm install --save axios opossum async-retry
npm install --save-dev jest @types/jest autocannon xml2js
```

Expected: All packages installed successfully

- [ ] **Step 5: Verify CDS installation**

Run:
```bash
npx cds version
```

Expected: Shows CDS version 7.5.0 or higher

- [ ] **Step 6: Create initial commit**

```bash
git add .
git commit -m "chore: initialize SAP CAP project structure

- Initialize with @sap/cds-dk
- Install core dependencies: axios, opossum, async-retry
- Install dev dependencies: jest, autocannon, xml2js
- Ready for OrderService implementation"
```

- [ ] **Step 7: Push to remote**

```bash
git push origin main
```

Expected: Code pushed to GitHub

---

### Task 10: Create OrderService CDS Schema

**Files:**
- Create: `db/schema.cds`

- [ ] **Step 1: Create schema file**

Create `db/schema.cds` with:

```cds
using { cuid, managed } from '@sap/cds/common';

namespace com.sap.orders;

/**
 * Orders entity - references MockAI Products
 */
entity Orders : cuid, managed {
  orderNumber   : String(20) @mandatory;
  orderDate     : DateTime @cds.on.insert: $now;
  customerName  : String(100) @mandatory;
  customerEmail : String(100);
  status        : String(20) @assert.range enum {
    PENDING;
    CONFIRMED;
    SHIPPED;
    DELIVERED;
    CANCELLED;
  } default 'PENDING';
  totalAmount   : Decimal(10,2) @readonly;
  currency      : String(3) default 'USD';
  items         : Composition of many OrderItems on items.order = $self;
  
  // External reference to MockAI Product API
  // Stored as string to avoid tight coupling
  externalProductsAPI : String default 'http://mockai:4004/products';
}

/**
 * Order Items - links to MockAI Products via external ID
 */
entity OrderItems : cuid, managed {
  order         : Association to Orders;
  
  // External MockAI Product reference
  productID     : UUID @mandatory;
  productName   : String(100);  // Cached from MockAI
  
  quantity      : Integer @assert.range: [1, 999];
  unitPrice     : Decimal(10,2) @mandatory;
  totalPrice    : Decimal(10,2) @readonly;
  
  // Cache product details at order time
  productSnapshot : String(2000); // JSON snapshot of product data
}
```

- [ ] **Step 2: Build CDS models**

Run:
```bash
npx cds build
```

Expected: Build succeeds, generates CSN files in `gen/` directory

- [ ] **Step 3: Deploy database**

Run:
```bash
npx cds deploy --to sqlite
```

Expected: Database file created at `db.sqlite`

- [ ] **Step 4: Verify schema**

Run:
```bash
npx cds compile db/schema.cds --to sql
```

Expected: Shows SQL DDL statements for Orders and OrderItems tables

- [ ] **Step 5: Commit schema**

```bash
git add db/schema.cds
git commit -m "feat: add Orders and OrderItems CDS schema

- Define Orders entity with status enum
- Define OrderItems entity linked to external MockAI products
- Use cuid and managed aspects from SAP common
- Add product snapshot for caching MockAI data
- Follow SAP CAP best practices for entity design"
```

---

## Phase 4-5: Remaining Tasks (To Be Detailed Later)

**Phase 4: Implement Integration Tests in OrderService**
- Task 11: Create OrderService service definition (srv/order-service.cds)
- Task 12: Implement MockAI API client with circuit breaker (srv/external/mockai-client.js)
- Task 13: Implement OrderService business logic (srv/order-service.js)
- Task 14: Create schema validator (test/integration/schema-validator.js)
- Task 15: Create integration test suite (test/integration/mockai-integration.test.js)
- Task 16: Create performance benchmarks (test/integration/performance-benchmark.js)
- Task 17: Create baseline metadata fixture

**Phase 5: Docker Environment and GitHub Workflow**
- Task 18: Create Docker Compose test environment
- Task 19: Create Dockerfile for OrderService
- Task 20: Create Dockerfile for MockAI (if needed)
- Task 21: Create external-integration-test.yml workflow
- Task 22: End-to-end testing (create test PR)
- Task 23: Verify all failure scenarios
- Task 24: Document OrderService setup
- Task 25: Final integration verification

**Note:** Detailed steps for Tasks 11-25 will be added when Phase 1-2 are complete. This allows us to adjust based on learnings from early phases.

---

## Execution Approach

This plan is designed for **phased execution**:

1. **Execute Phase 1 (Tasks 1-5)** - Fix MockAI best practices
2. **Execute Phase 2 (Tasks 6-8)** - Add dispatcher to MockAI
3. **Test dispatcher** with mock/dummy responses
4. **Extend plan** with detailed Phase 3-5 tasks
5. **Execute Phase 3-5** - Build OrderService and integration tests