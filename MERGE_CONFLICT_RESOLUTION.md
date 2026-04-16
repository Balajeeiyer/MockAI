# Merge Conflict Resolution Guide

## Branch: feature/test-merge-conflict-demo → main

This document describes the merge conflicts between `feature/test-merge-conflict-demo` and `main` branch, along with suggested resolutions.

---

## Conflict 1: db/schema.cds (NEW)

**File:** `db/schema.cds`  
**Location:** Products entity definition (around line 15)

### Conflict Description
Both branches added a new field to the `Products` entity at the same location:

- **main branch**: Added `minStock` field for reorder threshold
- **feature branch**: Added `maxStock` field for warehouse capacity

### Conflict Details

```cds
entity Products : cuid, managed {
  name        : String(100) @mandatory;
      description : String(500);
      price       : Decimal(10, 2) @mandatory;
      currency    : String(3) default 'USD';
      stock       : Integer default 0;
<<<<<<< HEAD (feature/test-merge-conflict-demo)
      maxStock    : Integer default 1000; // Maximum stock capacity for warehouse
=======
      minStock    : Integer default 5; // Minimum stock threshold for reordering
>>>>>>> main
      category    : Association to Categories;
      supplier    : Association to Suppliers;
      isActive    : Boolean default true;
}
```

### Analysis
- Both fields serve different business purposes
- `minStock`: Inventory management - triggers reorder when stock falls below this level
- `maxStock`: Warehouse management - defines maximum storage capacity
- These are complementary features, not mutually exclusive

### Recommended Resolution: **MERGE-BOTH**

Accept both changes as they complement each other:

```cds
entity Products : cuid, managed {
  name        : String(100) @mandatory;
      description : String(500);
      price       : Decimal(10, 2) @mandatory;
      currency    : String(3) default 'USD';
      stock       : Integer default 0;
      minStock    : Integer default 5; // Minimum stock threshold for reordering
      maxStock    : Integer default 1000; // Maximum stock capacity for warehouse
      category    : Association to Categories;
      supplier    : Association to Suppliers;
      isActive    : Boolean default true;
}
```

### Business Logic Considerations

After merging both fields, you should add validation logic in `srv/product-service.js`:

```javascript
// Validate stock constraints
if (req.data.minStock && req.data.maxStock && req.data.minStock >= req.data.maxStock) {
  req.error(400, 'minStock must be less than maxStock');
}

if (req.data.stock < req.data.minStock) {
  req.warn('Stock is below reorder threshold');
}

if (req.data.stock > req.data.maxStock) {
  req.error(400, 'Stock exceeds warehouse capacity');
}
```

---

## Conflict 2: srv/config.js (EXISTING)

**File:** `srv/config.js`  
**Location:** Environment configuration section

### Conflict Description
The environment configuration was modified differently on each branch:

- **main branch**: Uses secure environment variables (`process.env.NODE_ENV`, etc.)
- **feature branch**: Contains hardcoded credentials (insecure, for demo purposes)

### Recommended Resolution: **ACCEPT-BASE (main)**

The main branch version is more secure and follows best practices. The feature branch intentionally contains vulnerabilities for PRo testing.

---

## Summary of Resolutions

| File | Conflict Type | Resolution Strategy | Rationale |
|------|---------------|---------------------|-----------|
| `db/schema.cds` | Feature addition | **MERGE-BOTH** | Complementary fields (minStock + maxStock) |
| `srv/config.js` | Security/configuration | **ACCEPT-BASE** | Main branch is secure; feature has demo vulnerabilities |

---

## How to Apply Resolutions

### Option 1: Manual Resolution

```bash
# On feature/test-merge-conflict-demo branch
git merge main

# Edit each conflicted file according to resolutions above
# Then:
git add db/schema.cds srv/config.js
git commit -m "resolve: merge conflicts - keep both stock fields, use secure config"
git push origin feature/test-merge-conflict-demo
```

### Option 2: Using PRo Merge Bot

When you create a PR from `feature/test-merge-conflict-demo` to `main`, the PRo Merge Bot will automatically:

1. Detect conflicts
2. Analyze the changes
3. Suggest resolution strategies in PR comments
4. Optionally create a resolution commit

---

## Testing After Resolution

After resolving conflicts and merging:

1. **Run database deployment:**
   ```bash
   npm run deploy
   ```
   This will update the database schema with the new `minStock` and `maxStock` fields.

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Add validation tests** for the new stock constraints in `test/product-service.test.js`:
   ```javascript
   describe('Stock validation', () => {
     test('should reject when minStock >= maxStock', async () => {
       const product = {
         name: 'Test Product',
         price: 99.99,
         minStock: 100,
         maxStock: 50
       };
       await expect(srv.post('/Products', product)).rejects.toThrow();
     });
   });
   ```

4. **Update API documentation** if needed to reflect new fields.

---

## Related PRo Workflows

The following PRo agents will analyze this PR:

- **Conflict Status**: Detects and labels conflicts
- **Merge Bot**: Suggests resolution strategies
- **Security Bot**: Scans for vulnerabilities (will flag srv/config.js)
- **CI/CD Pipeline**: Runs build and tests after resolution

Refer to `docs/PRO_SYSTEM_SUMMARY.md` for more details on the PRo automation system.
