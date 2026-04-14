# 🚨 Auto-Assignment on Security Failure - Complete

## Demo PR
**PR #5**: https://github.com/Balajeeiyer/MockAI/pull/5

## What's Implemented

### ✅ Auto-Assignment When Security Fails

When security scan detects CRITICAL or HIGH severity issues (≥3), the workflow automatically:

1. **Assigns PR Author** - Tags the person who created the PR
2. **Mentions Security Contact** - Tags @security-team-lead for review
3. **Posts Quick Fix Guide** - Provides specific, actionable fixes
4. **Calculates Fix Time** - Estimates time needed (CRITICAL: 15min, HIGH: 10min each)

## Assignment Comment Structure

### Header
```markdown
## 🚨 Security Review Required

**Status:** Security scan FAILED with CRITICAL issues

### Assigned Reviewers

- 👤 **PR Author:** @Balajeeiyer - Please address the security findings
- 🛡️ **Security Contact:** @security-team-lead - Security review required
```

### 1. SAST Fixes (Code Vulnerabilities)

Lists each CRITICAL and HIGH severity code issue with:
- Issue number and category
- File path and line number
- Description
- Specific code fix

**Example:**
```markdown
**Issue 1:** SQL Injection at `srv/product-service.js:83`

```javascript
// Potential SQL injection vulnerability in SELECT query
Use parameterized queries with @sap/cds prepared statements
```
```

### 2. SCA Fixes (Vulnerable Dependencies)

Provides exact npm commands to fix dependency vulnerabilities:

```bash
# Critical and High severity fixes
npm install express@4.19.2  # Fixes CVE-2024-29041
npm install @sap/cds@7.6.0  # Fixes CVE-2024-XXXXX
npm install sqlite3@5.1.7  # Fixes CVE-2023-45866
```

### 3. Re-run Instructions

```markdown
After applying fixes:
1. Commit and push changes
2. Security pipeline will automatically re-run
3. PR will be unblocked if all CRITICAL issues are resolved
```

### 4. Next Steps

```markdown
**Next Steps:**
1. @Balajeeiyer - Apply the fixes above
2. @security-team-lead - Review after fixes applied
3. Re-run pipeline: Push new commit or comment `/rerun-security`

**Estimated Fix Time:** 115 minutes
```

## How It Works

### Workflow Logic

```yaml
- name: Assign Reviewers on Security Failure
  if: always()
  uses: actions/github-script@v7
  script: |
    # Read scan results
    # Calculate severity counts
    
    # Only assign if security failed
    if (totalCritical > 0 || totalHigh >= 3) {
      const prAuthor = context.payload.pull_request.user.login;
      
      # Build assignment comment with:
      # 1. PR author tag
      # 2. Security contact tag
      # 3. SAST fixes
      # 4. SCA fixes
      # 5. Re-run instructions
      # 6. Time estimate
      
      # Post comment
      await github.rest.issues.createComment(...)
    }
```

### Assignment Triggers

- **CRITICAL issues > 0** → Auto-assign
- **HIGH issues ≥ 3** → Auto-assign
- **Otherwise** → No assignment needed

### Time Estimation

```javascript
const estimatedTime = (totalCritical * 15) + (totalHigh * 10);
// Example: 2 CRITICAL + 4 HIGH = (2*15) + (4*10) = 70 minutes
```

## PR #5 Example

### Comments Posted (3 total):

1. **Hyperspace Bot Analysis**
   - Consolidated review
   - Inline code suggestions
   - Bot reviewer assignments

2. **Security Pipeline Results**
   - Comprehensive scan report
   - 25 findings (3 CRITICAL, 7 HIGH)
   - Azure DevOps-style format
   - Merge blocker status

3. **Security Review Assignment** ← NEW
   - PR author: @Balajeeiyer
   - Security contact: @security-team-lead
   - Quick fix guide with 6 specific fixes
   - Estimated time: 115 minutes

### Labels Applied (8):

- hyperspace-analyzed
- code-quality-review
- security-review
- build-check
- changes-required
- security-scanned
- security-critical
- blocked

## Quick Fix Guide Features

### ✅ Specific Code Fixes

Each SAST issue includes:
- Exact file path and line number
- Issue category (SQL Injection, Command Injection, etc.)
- Description of the vulnerability
- Specific recommendation/code snippet

**Not generic** - tells you exactly what to change.

### ✅ Exact npm Commands

SCA fixes include:
- Package name and current version
- CVE identifier
- Fixed version number
- Copy-paste npm install command
- Comment explaining which CVE it fixes

**Example:**
```bash
npm install express@4.19.2  # Fixes CVE-2024-29041
```

### ✅ Clear Action Items

Numbered next steps with assignees:
1. **PR Author** - Apply the fixes
2. **Security Contact** - Review after fixes
3. **Both** - Re-run pipeline

### ✅ Time Estimate

Realistic estimate based on severity:
- CRITICAL issues: 15 minutes each
- HIGH issues: 10 minutes each
- Total: Sum of all critical + high fix times

## Workflow File

`.github/workflows/azure-pipeline-mock.yml`

**New step:** "Assign Reviewers on Security Failure"

## Integration with Other Features

PR #5 demonstrates the **complete system**:

### Hyperspace Bot
- Code quality analysis
- Inline suggestions
- Bot reviewers

### Security Pipeline
- SAST/SCA/Container/Secrets scanning
- Compliance gates
- Merge blocker

### Auto-Assignment ← NEW
- PR author tagged
- Security contact tagged
- Quick fix guide
- Time estimate

## Dummy Security Contact

Currently set to: **@security-team-lead**

To customize, edit the workflow:
```javascript
'- 🛡️ **Security Contact:** @your-security-team - Security review required'
```

Or use actual GitHub usernames:
```javascript
'- 🛡️ **Security Contact:** @security-admin - Security review required'
```

## Real-World Use Cases

### Scenario 1: Developer Creates PR
1. Developer pushes code with security issues
2. Security pipeline runs automatically
3. CRITICAL issues detected
4. Developer gets tagged with specific fixes
5. Security team gets notified for oversight

### Scenario 2: External Contributor
1. External contributor submits PR
2. Security scan fails
3. Contributor gets clear fix instructions
4. Security team reviews the PR
5. No back-and-forth needed - all fixes listed upfront

### Scenario 3: Urgent Fix
1. PR created for production hotfix
2. Security scan finds HIGH issues
3. Time estimate shows 40 minutes needed
4. Team can decide: fix now or deploy with risk
5. Clear accountability (author + security contact)

## Comparison: Before vs After

### Before (PR #4)
- ✅ Security report posted
- ✅ Issues identified
- ❌ No assignment
- ❌ No specific action items
- ❌ No time estimate

### After (PR #5)
- ✅ Security report posted
- ✅ Issues identified
- ✅ **PR author auto-assigned**
- ✅ **Security contact tagged**
- ✅ **Quick fix guide with exact commands**
- ✅ **Time estimate provided**
- ✅ **Clear next steps**

## Testing

### Create Test PR
```bash
cd /Users/I335962/Documents/Github_Home/MockAI-public
git checkout -b test/security-assignment
# Make changes that will trigger security issues
git commit -m "feat: Your change"
git push -u origin test/security-assignment
gh pr create --title "Test security assignment" --body "Test"
```

### Expected Results
Within 20 seconds:
1. ✅ Security pipeline runs
2. ✅ If CRITICAL or HIGH ≥ 3: Assignment comment posted
3. ✅ PR author tagged
4. ✅ Security contact tagged
5. ✅ Quick fix guide with specific commands
6. ✅ Time estimate calculated

## Benefits

### For Developers
- **Clear guidance** - Exact fixes, not vague warnings
- **Time estimate** - Know how long it will take
- **Copy-paste fixes** - npm commands ready to use
- **No guessing** - Specific file paths and line numbers

### For Security Team
- **Automatic notification** - Tagged when issues found
- **Context provided** - All findings in one place
- **Accountability** - Author is assigned
- **Trackable** - Can see when author addresses issues

### For Project Managers
- **Visibility** - See who is responsible
- **Time planning** - Estimated fix time provided
- **Risk awareness** - CRITICAL vs HIGH severity clear
- **Process enforcement** - Security review required

## Links

- **Demo PR:** https://github.com/Balajeeiyer/MockAI/pull/5
- **Main Repo:** https://github.com/Balajeeiyer/MockAI
- **Workflow:** `.github/workflows/azure-pipeline-mock.yml`

---

**Status:** 🎉 **COMPLETE** - Auto-assignment on security failure fully operational
