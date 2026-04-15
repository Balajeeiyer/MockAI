# PRo Merge Conflict Resolution Demo

## Scenario

This demonstrates how **PRo (PR Optimiser)** intelligently detects and resolves merge conflicts with inline commit suggestions.

## Conflict Created

**File**: `srv/config.js`

**Feature Branch** (`feature/api-breaking-change-demo`):
- Contains hardcoded database credentials (lines 10-15)
- Contains hardcoded API keys (lines 18-26)
- **Security Risk**: Credentials exposed in source code

**Main Branch**:
- Uses environment variables for configuration
- Loads NODE_ENV, PORT, LOG_LEVEL from process.env
- **Secure Approach**: No credentials in code

## Merge Conflict

When trying to merge main into feature branch:

```javascript
module.exports = {
  /**
<<<<<<< HEAD (feature branch)
   * SECURITY ISSUE: Hardcoded Database Credentials (Lines 10-13)
   * Credentials should be in environment variables, not in code
   */
  database: {
    host: 'prod-db.company.com',
    username: 'admin',
    password: 'SuperSecret123!', // CRITICAL: Hardcoded password
  },

  /**
   * SECURITY ISSUE: Hardcoded API Keys (Lines 18-23)
   * API keys exposed in source code
   */
  apiKeys: {
    openai: 'sk-proj-1234567890abcdef', // CRITICAL: Exposed API key
    stripe: 'sk_live_51H1234567890', // CRITICAL: Live Stripe key
    aws: 'AKIAIOSFODNN7EXAMPLE', // CRITICAL: AWS access key
    awsSecret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' // CRITICAL: AWS secret
=======
   * Environment configuration
   * Load from environment variables for security
   */
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4004,
    logLevel: process.env.LOG_LEVEL || 'info'
>>>>>>> main
  },

  /**
   * Valid currency codes (ISO 4217)
   */
  validCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
  // ... rest of config
```

## PRo Bot Analysis

When the PR workflows run, PRo's merge conflict bot will:

1. **Detect the conflict** in `srv/config.js`
2. **Analyze both versions**:
   - Feature branch: Hardcoded credentials (insecure)
   - Main branch: Environment variables (secure)
3. **Determine strategy**: "merge-config" - Use secure environment approach
4. **Generate inline suggestion** at the conflict location

## Inline Commit Suggestion

PRo will post this inline comment on the conflicted lines:

---

**🔀 MERGE CONFLICT: Configuration Security Improvement**

**Resolution Strategy**: Use environment-based configuration (main branch)

**Your branch**:
```javascript
  /**
   * SECURITY ISSUE: Hardcoded Database Credentials (Lines 10-13)
   * Credentials should be in environment variables, not in code
   */
  database: {
    host: 'prod-db.company.com',
    username: 'admin',
    password: 'SuperSecret123!', // CRITICAL: Hardcoded password
  },
  // ... more hardcoded credentials
```
*Contains hardcoded credentials - security risk!*

**Main branch**:
```javascript
  /**
   * Environment configuration
   * Load from environment variables for security
   */
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4004,
    logLevel: process.env.LOG_LEVEL || 'info'
  },
```
*Uses environment variables - secure approach!*

**Recommended resolution**:
```suggestion
  /**
   * Environment configuration
   * Load from environment variables for security
   */
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4004,
    logLevel: process.env.LOG_LEVEL || 'info'
  },
```

**Why this resolution?**
- ✅ Removes hardcoded credentials
- ✅ Uses environment variables (secure)
- ✅ Follows security best practices
- ✅ Prevents credential leaks in version control

**Note**: After merging, configure these environment variables:
```bash
export NODE_ENV=production
export PORT=4004
export LOG_LEVEL=info
```

_Click "Commit suggestion" to apply secure configuration._

---

## Summary Comment

PRo will also post a summary comment:

---

## 🔀 PRo Merge Conflict Analysis

### ⚠️ Conflicts Found

This PR has **1 file(s)** with merge conflicts that need resolution:

- **`srv/config.js`** (Line 8)
  - Strategy: Configuration Security Improvement
  - Use environment-based configuration (main branch)

### 📍 Inline Resolution Suggestions

I've added **1 inline suggestion(s)** to help resolve these conflicts:

**To view**: Go to the **Files changed** tab and look for 💬 comment icons on conflicted files.
**To apply**: Review each suggestion and click **"Commit suggestion"** to accept the resolution.

### 🔧 How to Resolve Locally

If you prefer to resolve conflicts locally:

```bash
# Fetch latest changes
git fetch origin main

# Merge base branch into your branch
git merge origin/main

# Resolve conflicts in your editor
# Then stage and commit
git add .
git commit -m "fix: resolve merge conflicts with main"
git push
```

### 📚 Resources

- [GitHub: Resolving merge conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts)
- [Git merge conflict resolution](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)

---

*🤖 PRo detected merge conflicts • Review inline suggestions in Files changed tab*

---

## User Experience

1. User creates PR with conflicting changes
2. PRo merge bot runs automatically
3. PRo detects `srv/config.js` conflict
4. PRo analyzes: feature branch has hardcoded credentials, main has env vars
5. PRo determines: main branch approach is more secure
6. PRo posts inline suggestion with one-click fix
7. User reviews the suggestion
8. User clicks "Commit suggestion" button
9. Conflict resolved automatically with secure configuration! ✅

## Benefits

- **Intelligent Analysis**: PRo understands security implications
- **One-Click Resolution**: No manual conflict editing needed
- **Security-First**: Automatically prefers secure patterns
- **Educational**: Explains why each resolution is recommended
- **Time-Saving**: Instant conflict resolution with commit button

## Files Modified in Demo

- `.github/workflows/pro-merge-bot.yml` - Enhanced merge conflict detection
- `srv/config.js` (main) - Secure environment configuration
- `srv/config.js` (feature) - Hardcoded credentials (for demo)

---

**Note**: The hardcoded credentials in the feature branch are intentional demo vulnerabilities to showcase PRo's capabilities. Never commit real credentials to version control!
