# Cross-Repository Integration Testing System Design

**Version:** 1.0  
**Date:** 2026-04-15  
**Status:** Design Approved  
**Author:** System Design Team

---

## Executive Summary

This design specifies a **cross-repository integration testing system** that automatically detects breaking changes in MockAI APIs when changes affect dependent microservices. The system uses a **lightweight dispatcher pattern** where MockAI triggers integration tests in dependent repositories via GitHub's `repository_dispatch` events, collects results, and reports back with actionable feedback.

**Key Innovation:** Non-blocking, distributed testing that maintains clean separation of concerns while providing comprehensive validation (schema compatibility, integration tests, performance benchmarks) across the microservice ecosystem.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Specifications](#component-specifications)
3. [SAP CAP Integration Patterns](#sap-cap-integration-patterns)
4. [Test Suite Structure](#test-suite-structure)
5. [Error Handling and Resilience](#error-handling-and-resilience)
6. [Monitoring and Observability](#monitoring-and-observability)
7. [Configuration Management](#configuration-management)
8. [Implementation Phases](#implementation-phases)
9. [Success Criteria](#success-criteria)

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer creates PR in MockAI (changes to Products API)       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  MockAI: Hyperspace Bot Workflow                                │
│  ├─ Job 1: Existing hyperspace-analysis                         │
│  └─ Job 2: cross-repo-integration-dispatcher (NEW)              │
│      ├─ Read .github/dependent-repos.yml                        │
│      ├─ For each dependent repo:                                │
│      │   └─ Dispatch repository_dispatch event with PR context  │
│      ├─ Wait for status check callbacks (max 10 min)            │
│      └─ Aggregate results                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬─────────────────┐
         ▼                       ▼                 ▼
┌─────────────────────┐ ┌─────────────────┐  ┌──────────────┐
│ Dependent Repo #1   │ │ Dependent Repo  │  │ Dependent    │
│ (OrderService)      │ │ #2 (...)        │  │ Repo #N      │
└──────┬──────────────┘ └────────┬────────┘  └──────┬───────┘
       │                         │                   │
       ▼                         ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Dependent Repo: external-integration-test.yml                   │
│  (Triggered by repository_dispatch)                              │
│  ├─ Checkout dependent repo code                                │
│  ├─ Spin up test environment (docker-compose):                  │
│  │   ├─ MockAI service (from MockAI repo @ PR branch)          │
│  │   └─ Dependent service + test database                      │
│  ├─ Wait for services healthy                                   │
│  ├─ Run validation suite:                                       │
│  │   ├─ Schema validation (OData $metadata)                    │
│  │   ├─ Integration tests (Jest/Mocha)                         │
│  │   └─ Performance benchmarks (response times)                │
│  ├─ Report status to MockAI PR via GitHub Checks API           │
│  ├─ If failed: Create issue in dependent repo                  │
│  └─ Cleanup test environment                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  MockAI: Aggregator                                              │
│  ├─ Collect all status checks                                   │
│  ├─ Post summary comment on PR:                                 │
│  │   ├─ ✅ Repo X: All tests passed (120 tests, 2.3s avg)     │
│  │   ├─ ⚠️  Repo Y: Schema validation failed                   │
│  │   └─ ❌ Repo Z: Integration tests failed (3/50)             │
│  ├─ Tag code owners from failed repos (@team-orders)           │
│  └─ Add label: cross-repo-impact                               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Configuration File** | YAML | Lists dependent repos, code owners, test settings |
| **Dispatcher Job** | GitHub Actions | Reads config, dispatches events, aggregates results |
| **Dependent Repo Workflow** | GitHub Actions | Runs comprehensive test suite |
| **Test Environment** | Docker Compose | Isolated MockAI + dependent service |
| **Schema Validator** | Node.js/xml2js | OData $metadata compatibility checks |
| **Integration Tests** | Jest + @sap/cds | SAP CAP service testing |
| **Performance Benchmarks** | autocannon | Response time validation |
| **Reporting System** | GitHub API | Checks API, PR comments, issue creation |

---

## Component Specifications

### 1. Configuration File (`.github/dependent-repos.yml`)

```yaml
version: "1.0"

settings:
  timeout: 10
  parallel: true
  warning_threshold: 95

dependent_repos:
  - name: "OrderService"
    repository: "Balajeeiyer/OrderService"
    branch: "main"
    code_owners:
      - "@Balajeeiyer"
      - "@team-orders"
    dependencies:
      - "Products CRUD"
      - "getLowStockProducts"
    estimated_duration: "5m"
    critical: true

notifications:
  create_issues: true
  issue_labels:
    - "breaking-change"
    - "external-dependency"
  issue_title_template: "⚠️ MockAI API change may break integration (PR #{pr_number})"
```

**Validation Rules:**
- Repository must exist and be accessible
- Branch must exist
- Code owners must be valid GitHub users/teams
- No duplicate repository entries

### 2. Dispatcher Job (Extended `hyperspace-bot.yml`)

**Key Steps:**
1. **Read Configuration** - Parse YAML, validate structure
2. **Dispatch Events** - Send `repository_dispatch` to each dependent repo with:
   - MockAI PR number, SHA, branch
   - Dependent repo name and branch
   - Callback URL for status reporting
3. **Create Tracking Comment** - Initial PR comment listing all dispatched tests
4. **Wait for Results** - Poll GitHub Checks API for test completion (max 10 min)
5. **Aggregate Results** - Collect pass/fail status from all repos
6. **Post Summary** - Final PR comment with:
   - Pass/fail status per repo
   - Code owner notifications
   - Links to detailed logs
   - Label: `cross-repo-impact` if failures detected

**Non-Blocking Behavior:**
- PR can merge regardless of test results
- Results are informational/warning only
- Code owners notified for remediation

### 3. Dependent Repo Workflow (`.github/workflows/external-integration-test.yml`)

**Triggers:**
- `repository_dispatch` event type: `mockai-integration-test`
- Manual `workflow_dispatch` for testing

**Environment Variables:**
```bash
CDS_ENV=test
NODE_ENV=test
MOCKAI_SERVICE_URL=http://mockai:4004/products
```

**Test Execution Sequence:**
1. **Setup** - Checkout repos, install dependencies, install SAP CDS CLI
2. **Build Test Environment** - Create docker-compose.test.yml with:
   - MockAI service (from PR branch)
   - Dependent service
   - Test database (PostgreSQL/SQLite)
3. **Wait for Health** - Poll MockAI $metadata endpoint until ready
4. **Schema Validation** - Compare OData metadata against baseline
5. **Integration Tests** - Run Jest tests using @sap/cds framework
6. **Contract Tests** - Verify entity fields, actions, functions exist
7. **Performance Tests** - Run autocannon benchmarks, check thresholds
8. **Report Results** - Create GitHub Check on MockAI PR
9. **Create Issue** - If failed, create issue in dependent repo
10. **Cleanup** - Tear down docker-compose environment

### 4. Test Environment (Docker Compose)

```yaml
services:
  mockai:
    build: ./external/MockAI
    ports: ["4004:4004"]
    environment:
      - NODE_ENV=test
      - CDS_ENV=test
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4004/products/$metadata"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
  
  dependent-service:
    build: .
    ports: ["4005:4005"]
    environment:
      - MOCKAI_SERVICE_URL=http://mockai:4004
    depends_on:
      mockai:
        condition: service_healthy
  
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
```

**Key Features:**
- Health checks ensure services ready before testing
- Isolated network for service communication
- Volume mounts for live code updates during development
- Automatic cleanup after test completion

---

## SAP CAP Integration Patterns

### OrderService Example (Dependent Repository)

**Project Structure:**
```
OrderService/
├── .github/workflows/external-integration-test.yml
├── db/schema.cds                      # Order entities
├── srv/
│   ├── order-service.cds              # Service definitions
│   ├── order-service.js               # Business logic
│   └── external/mockai-client.js      # MockAI API client
├── test/
│   ├── integration/
│   │   ├── mockai-integration.test.js
│   │   ├── schema-validator.js
│   │   └── performance-benchmark.js
│   └── fixtures/mockai-metadata-baseline.xml
├── docker-compose.test.yml
├── Dockerfile
└── .cdsrc.json
```

### CDS Schema Pattern

```cds
namespace com.sap.orders;
using { cuid, managed } from '@sap/cds/common';

entity Orders : cuid, managed {
  orderNumber   : String(20) @mandatory;
  orderDate     : DateTime @cds.on.insert: $now;
  customerName  : String(100) @mandatory;
  status        : String(20) default 'PENDING';
  totalAmount   : Decimal(10,2) @readonly;
  items         : Composition of many OrderItems on items.order = $self;
  
  // External reference to MockAI
  externalProductsAPI : String default 'http://mockai:4004/products';
}

entity OrderItems : cuid, managed {
  order         : Association to Orders;
  productID     : UUID @mandatory;  // MockAI Product ID
  productName   : String(100);      // Cached from MockAI
  quantity      : Integer @assert.range: [1, 999];
  unitPrice     : Decimal(10,2) @mandatory;
  totalPrice    : Decimal(10,2) @readonly;
  productSnapshot : String;         // JSON snapshot at order time
}
```

### Service Definition Pattern

```cds
service OrderService @(path: '/orders') {
  @odata.draft.enabled
  entity Orders as projection on db.Orders actions {
    action addProduct(productID : UUID, quantity : Integer) returns Orders;
    action validateProductAvailability() returns {
      valid : Boolean;
      issues : array of String;
    };
    action submitOrder() returns Orders;
  };
  
  function getProductFromMockAI(productID : UUID) returns {
    ID : UUID;
    name : String;
    price : Decimal(10,2);
    stock : Integer;
    isActive : Boolean;
  };
}
```

### MockAI Client Pattern (External Service Integration)

**Key Features:**
- Circuit breaker for fault tolerance
- Retry logic with exponential backoff
- Request/response interceptors for logging
- Graceful degradation with caching
- Health check endpoint

**Core Methods:**
```javascript
class MockAIClient {
  async getProduct(productID)
  async getProducts(filter)
  async checkStock(productID)
  async updateStock(productID, quantity)
  async getLowStockProducts(threshold)
  async validateProducts(productIDs)
  async healthCheck()
}
```

### Service Implementation Pattern

**Before CREATE Validation:**
```javascript
this.before('CREATE', OrderItems, async (req) => {
  const { productID, quantity } = req.data;
  
  // Validate product exists and is active in MockAI
  const product = await mockAI.getProduct(productID);
  
  if (!product.isActive) {
    req.error(400, `Product ${product.name} is not available`);
  }
  
  if (product.stock < quantity) {
    req.error(400, `Insufficient stock for ${product.name}`);
  }
  
  // Cache product details
  req.data.productName = product.name;
  req.data.unitPrice = product.price;
  req.data.productSnapshot = JSON.stringify(product);
});
```

**Custom Actions:**
```javascript
this.on('addProduct', Orders, async (req) => {
  const { productID, quantity } = req.data;
  const orderID = req.params[0].ID;
  
  const product = await mockAI.getProduct(productID);
  
  await INSERT.into(OrderItems).entries({
    order_ID: orderID,
    productID: product.ID,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    totalPrice: product.price * quantity
  });
  
  await this.updateOrderTotal(orderID);
  return SELECT.one.from(Orders).where({ ID: orderID });
});
```

---

## Test Suite Structure

### 1. Schema Validator (`test/integration/schema-validator.js`)

**Purpose:** Validate OData $metadata compatibility to detect breaking changes in entity structure.

**Key Validations:**
- Entity existence
- Property type compatibility (Edm.String, Edm.Decimal, etc.)
- Nullable constraint changes
- Navigation property existence (associations/compositions)
- Custom action/function availability

**Output:**
```javascript
[
  {
    type: 'MISSING_PROPERTY',
    severity: 'CRITICAL',
    message: "Property 'price' is missing from Products",
    property: 'price'
  },
  {
    type: 'TYPE_MISMATCH',
    severity: 'CRITICAL',
    message: "Property 'stock' type changed from Edm.Int32 to Edm.String",
    property: 'stock',
    expected: 'Edm.Int32',
    actual: 'Edm.String'
  }
]
```

### 2. Integration Tests (`test/integration/mockai-integration.test.js`)

**Test Categories:**

**A. Schema Validation**
- Products entity schema compatibility
- Navigation properties intact
- Custom operations available

**B. CRUD Operations**
- Create product (POST)
- Read products list (GET)
- Read single product (GET with ID)
- Update product (PATCH)
- Delete product (DELETE)

**C. OData Query Options**
- `$filter` - Filter by conditions
- `$expand` - Expand associations
- `$select` - Select specific fields
- `$orderby` - Sort results
- `$top` / `$skip` - Pagination

**D. Custom Actions**
- `updateStock` - Modify inventory
- `toggleActive` - Enable/disable product

**E. Custom Functions**
- `getLowStockProducts` - Query inventory
- `calculateOrderTotal` - Compute totals

**F. Error Handling**
- Invalid product creation
- Non-existent product lookup
- Business rule violations

**G. Business Logic Validation**
- Price validation (> 0, <= 999,999.99)
- Currency validation (USD, EUR, GBP, INR)
- Stock validation (>= 0)
- Name length validation (<= 100 chars)

### 3. Performance Benchmarks (`test/integration/performance-benchmark.js`)

**Metrics Collected:**
- Average latency
- P95 latency (95th percentile)
- P99 latency (99th percentile)
- Throughput (requests/second)
- Error rate

**Thresholds:**
- Avg latency: 500ms
- P95 latency: 1000ms
- Error rate: 1%

**Tested Endpoints:**
- `/Products` - Product list
- `/Products?$filter=isActive eq true` - Filtered query
- `/Products?$expand=category` - Expanded query
- `/ProductAnalytics` - Analytics view

**Tool:** autocannon (10 connections, 10 second duration)

---

## Error Handling and Resilience

### 1. Circuit Breaker Pattern

**Library:** opossum

**Configuration:**
- Timeout: 5 seconds
- Error threshold: 50%
- Reset timeout: 30 seconds
- Rolling window: 10 seconds

**States:**
- **CLOSED** - Normal operation, requests pass through
- **OPEN** - Too many failures, requests fail fast
- **HALF-OPEN** - Testing recovery, limited requests allowed

**Events:**
```javascript
breaker.on('open', () => {
  cds.log('mockai-client').error('Circuit breaker opened');
});

breaker.on('close', () => {
  cds.log('mockai-client').info('Circuit breaker closed - service recovered');
});
```

**Fallback Strategy:**
- Return cached data if available
- Mark response with `_cached: true` flag
- Log fallback usage for monitoring

### 2. Retry Logic with Exponential Backoff

**Library:** async-retry

**Configuration:**
- Max retries: 3
- Min timeout: 1 second
- Max timeout: 5 seconds
- Factor: 2 (exponential)
- Randomize: true (jitter)

**Behavior:**
- Retry on 5xx errors (server errors)
- Don't retry on 4xx errors (client errors)
- Log each retry attempt

### 3. Graceful Degradation Strategy

**Degraded Mode Configuration:**
```bash
ALLOW_DEGRADED_MODE=true
```

**Behavior When MockAI Unavailable:**
- Allow order creation with `requiresManualValidation` flag
- Use cached product data if available
- Mark products with `(CACHED)` suffix
- Return 503 warning (not error) to client
- Create alerts for manual review queue

**Strict Mode (Production):**
```bash
ALLOW_DEGRADED_MODE=false
```

**Behavior:**
- Fail requests immediately if MockAI unavailable
- Return 503 error to client
- No order creation without validation

### 4. Timeout Management

**Request Timeout:** 5 seconds (default)
**Health Check Timeout:** 3 seconds
**Test Workflow Timeout:** 15 minutes
**Dispatcher Wait Timeout:** 10 minutes

---

## Monitoring and Observability

### 1. Logging Strategy

**Log Levels:**
- **Development:** DEBUG
- **Test:** INFO
- **Production:** WARN

**Log Categories:**
```javascript
cds.log('mockai-client').info('Request:', { method, url, params });
cds.log('mockai-client').error('Response error:', { status, message });
cds.log('order-service').warn('MockAI unavailable, degraded mode');
```

**Configuration (`.cdsrc.json`):**
```json
{
  "log": {
    "levels": {
      "mockai-client": "info",
      "order-service": "info",
      "[development]": {
        "mockai-client": "debug"
      }
    }
  }
}
```

### 2. Metrics Collection

**Tracked Metrics:**
- Total requests to MockAI
- Error count and rate
- Cache hits/misses and hit rate
- Average response time
- Circuit breaker trip count

**Metrics Endpoint:**
```javascript
GET /orders/health

{
  "service": "OrderService",
  "status": "UP",
  "timestamp": "2026-04-15T10:30:00Z",
  "dependencies": {
    "mockAI": {
      "status": "UP",
      "responseTime": "45ms"
    }
  },
  "metrics": {
    "mockAI": {
      "requests": 1523,
      "errors": 12,
      "errorRate": 0.79,
      "cacheHitRate": 23.5,
      "avgResponseTime": 87.3
    }
  }
}
```

### 3. Alerting

**Alert Conditions:**
- Error rate > 5%
- Average response time > 1 second
- Circuit breaker open
- Cache hit rate < 10% (possible cache issue)

**Alert Destinations:**
- GitHub issue creation
- Slack/Teams notifications (if configured)
- Email to code owners

---

## Configuration Management

### 1. Environment Variables

```bash
# Service Configuration
NODE_ENV=development
CDS_ENV=development

# MockAI Integration
MOCKAI_SERVICE_URL=http://localhost:4004/products
MOCKAI_TIMEOUT=5000
MOCKAI_RETRY_ATTEMPTS=3
MOCKAI_CIRCUIT_BREAKER_THRESHOLD=50
MOCKAI_CIRCUIT_BREAKER_TIMEOUT=30000

# Feature Flags
ALLOW_DEGRADED_MODE=false

# GitHub Integration
CROSS_REPO_PAT=<github-token>

# Logging
DEBUG=*
LOG_LEVEL=info
```

### 2. CAP Configuration (`.cdsrc.json`)

```json
{
  "requires": {
    "[production]": {
      "db": "hana",
      "auth": "xsuaa"
    },
    "[development]": {
      "db": "sqlite",
      "auth": "mocked"
    },
    "[test]": {
      "db": "sqlite",
      "auth": "mocked"
    }
  },
  "mockai": {
    "kind": "rest",
    "impl": "./srv/external/mockai-client.js",
    "[production]": {
      "credentials": {
        "url": "${env:MOCKAI_SERVICE_URL}"
      }
    },
    "[test]": {
      "credentials": {
        "url": "http://mockai:4004/products"
      }
    }
  }
}
```

### 3. GitHub Secrets

**MockAI Repository:**
- `CROSS_REPO_PAT` - Personal Access Token with scopes:
  - `repo` (full control)
  - `workflow` (trigger workflows)

**Dependent Repositories:**
- `CROSS_REPO_PAT` - Same token for reporting back

**Token Creation:**
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy token
5. Add to repository secrets in Settings → Secrets and variables → Actions

---

## Implementation Phases

### Phase 1: MockAI Dispatcher Setup (Week 1)

**Tasks:**
1. Create `.github/dependent-repos.yml` configuration file
2. Extend `hyperspace-bot.yml` with `cross-repo-dispatcher` job
3. Implement dispatcher logic:
   - Read and validate configuration
   - Dispatch repository_dispatch events
   - Create tracking comment
   - Wait for results
   - Aggregate and post summary
4. Test dispatcher with dummy repository
5. Verify GitHub PAT permissions and access

**Deliverables:**
- Working dispatcher job in MockAI
- Configuration file with schema validation
- Test run against dummy repo

**Success Criteria:**
- Dispatcher successfully sends events
- Tracking comment appears on PR
- Results aggregation works

### Phase 2: OrderService Repository Creation (Week 1-2)

**Tasks:**
1. Initialize new SAP CAP project: `cds init OrderService`
2. Create CDS schema for Orders and OrderItems
3. Implement order-service.cds with actions/functions
4. Create MockAI client with basic methods
5. Implement order-service.js with business logic
6. Add `.github/workflows/external-integration-test.yml`
7. Create docker-compose.test.yml
8. Write Dockerfile for OrderService

**Deliverables:**
- Functional OrderService with MockAI integration
- Integration test workflow
- Docker test environment

**Success Criteria:**
- OrderService can call MockAI APIs
- Workflow triggers on repository_dispatch
- Tests run in isolated environment

### Phase 3: Integration Testing Suite (Week 2-3)

**Tasks:**
1. Implement schema-validator.js with OData metadata parsing
2. Create mockai-integration.test.js with comprehensive tests:
   - Schema validation tests
   - CRUD operation tests
   - OData query option tests
   - Custom action/function tests
   - Error handling tests
   - Business logic tests
3. Implement performance-benchmark.js with autocannon
4. Create baseline metadata file
5. Test end-to-end flow: MockAI PR → dispatch → tests → report

**Deliverables:**
- Complete test suite with 50+ test cases
- Schema validation module
- Performance benchmarking module
- Baseline metadata for comparison

**Success Criteria:**
- All test types execute successfully
- Schema validation detects breaking changes
- Performance tests measure and enforce thresholds
- Test results reported back to MockAI PR

### Phase 4: Error Handling and Resilience (Week 3)

**Tasks:**
1. Add circuit breaker to MockAI client (opossum)
2. Implement retry logic with exponential backoff
3. Add graceful degradation mode
4. Implement caching strategy for fallback
5. Test failure scenarios:
   - MockAI service down
   - Slow response times
   - Intermittent failures
   - Network errors
6. Document recovery procedures

**Deliverables:**
- Resilient MockAI client
- Circuit breaker implementation
- Graceful degradation mode
- Failure scenario test results

**Success Criteria:**
- Service continues operating when MockAI unavailable (degraded mode)
- Circuit breaker prevents cascade failures
- Retries succeed on transient errors
- Fallback to cached data works

### Phase 5: Monitoring and Documentation (Week 4)

**Tasks:**
1. Add metrics collection to MockAI client
2. Implement health check endpoint
3. Create monitoring dashboard (optional)
4. Write runbooks for common failure scenarios
5. Document setup process for new dependent repos
6. Create developer guide for integration patterns
7. Train team on workflow and troubleshooting
8. Conduct end-to-end demonstration

**Deliverables:**
- Metrics collection system
- Health check endpoint
- Complete documentation suite
- Runbooks for operations team
- Developer onboarding guide

**Success Criteria:**
- Metrics accurately reflect system health
- Health check endpoint returns correct status
- Team trained and confident using system
- Documentation complete and accurate

---

## Success Criteria

### Functional Requirements

✅ **Breaking Change Detection**
- Schema changes detected within 10 minutes of MockAI PR creation
- Integration test failures reported accurately
- Performance regressions identified

✅ **Non-Blocking Workflow**
- MockAI PRs can merge regardless of test results
- Dependent repo code owners notified on failures
- Issues created in dependent repos for remediation

✅ **Comprehensive Validation**
- OData $metadata schema validation
- 50+ integration test cases covering CRUD, queries, actions, functions
- Performance benchmarks for key endpoints

✅ **SAP CAP Best Practices**
- Uses @sap/cds framework and patterns
- Follows CDS entity and service conventions
- Implements proper error handling and validation
- Uses CAP configuration and logging

### Non-Functional Requirements

✅ **Performance**
- Test suite completes within 15 minutes
- Minimal impact on MockAI PR workflow (parallel execution)
- Performance tests measure sub-500ms average latency

✅ **Reliability**
- Circuit breaker prevents cascade failures
- Retry logic handles transient errors
- Graceful degradation when MockAI unavailable
- 99% success rate for test execution

✅ **Maintainability**
- Clear separation of concerns (dispatcher vs. tests)
- Easy to add new dependent repositories (config change only)
- Comprehensive logging and metrics
- Well-documented code and processes

✅ **Scalability**
- Supports multiple dependent repositories (parallel execution)
- Efficient resource usage (docker-compose cleanup)
- No single point of failure

---

## Appendices

### A. Configuration File Example

See Section 2, Component Specifications

### B. GitHub Actions Workflow Examples

See Section 2 and Section 3 for complete workflow YAML

### C. Test Suite Examples

See Section 4 for complete test code

### D. MockAI Client Implementation

See Section 5 for complete client code

### E. Failure Scenarios and Recovery

| Scenario | Detection | Recovery | Impact |
|----------|-----------|----------|--------|
| MockAI service down | Health check fails | Circuit breaker opens, use cached data | Degraded mode, manual review |
| Slow responses | Request timeout | Retry with backoff, then fail | Delayed test results |
| Schema breaking change | Schema validator fails | Alert code owners, block merge (optional) | Requires dependent repo update |
| Integration test failure | Test assertion fails | Issue created in dependent repo | Non-blocking, requires fix |
| Performance regression | Benchmark threshold exceeded | Warning comment on PR | Non-blocking, investigate |
| GitHub API rate limit | 403 response | Wait and retry | Delayed results |

### F. Security Considerations

- **GitHub PAT:** Stored as repository secret, limited scope (repo + workflow)
- **Service-to-service auth:** Consider OAuth/JWT for production
- **Secrets in logs:** Sanitize all logs, never log tokens
- **Docker images:** Use official base images, scan for vulnerabilities
- **Test data:** Use synthetic data only, no production data in tests

---

## Conclusion

This cross-repository integration testing system provides **automated, comprehensive validation** of MockAI API changes across dependent microservices while maintaining **clean architectural boundaries** and **non-blocking workflows**. By leveraging SAP CAP best practices, circuit breakers, and distributed testing, the system ensures **reliable detection of breaking changes** with minimal operational overhead.

The lightweight dispatcher pattern scales efficiently, supports graceful degradation, and provides actionable feedback through GitHub's native interfaces (PR comments, checks, issues). This design balances **automation with developer control**, enabling teams to maintain API compatibility while moving quickly.

**Next Steps:** Proceed to implementation planning phase (writing-plans skill).
