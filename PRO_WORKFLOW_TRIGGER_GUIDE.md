# PRo Bot Workflow Trigger Guide

## How PRo (PR Optimiser) Workflows Are Triggered

### Workflow Files

1. **`.github/workflows/pro-bot.yml`** - Security & code quality analysis
2. **`.github/workflows/pro-merge-bot.yml`** - Merge conflict detection & resolution
3. **`.github/workflows/azure-style-pipeline.yml`** - Azure DevOps style CI/CD

### Trigger Events

All PRo workflows are configured to run on:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - master
```

**When they run:**
- `opened` - When a new PR is created
- `synchronize` - When new commits are pushed to the PR branch
- `reopened` - When a closed PR is reopened

### Merge Conflict Detection

The `pro-merge-bot.yml` workflow uses **dual detection** to ensure it catches conflicts:

#### 1. GitHub API Detection (Primary)
```javascript
const { data: pr } = await github.rest.pulls.get({...});

if (pr.mergeable === false || pr.mergeable_state === 'dirty') {
  // Conflicts detected via API
}
```

**API States:**
- `mergeable: false` - PR has conflicts
- `mergeable_state: 'dirty'` - PR cannot be merged cleanly
- `mergeable_state: 'clean'` - PR can be merged
- `mergeable_state: 'unstable'` - Checks failing but no conflicts
- `mergeable_state: 'blocked'` - Blocked by branch protection

#### 2. Git Merge Test (Secondary)
```bash
git merge --no-commit --no-ff origin/main
git diff --name-only --diff-filter=U | grep -q .
```

This attempts a merge and checks for unmerged files (conflict markers).

### Current PR Status (#21)

**Branch:** `feature/api-breaking-change-demo`  
**Base:** `main`

**Known Conflict:**
- File: `srv/config.js`
- Conflict: Lines 7-36
- Reason: 
  - Main branch: Uses `process.env` for configuration (secure)
  - Feature branch: Has hardcoded credentials (demo vulnerabilities)

**Expected Workflow Behavior:**

1. **On Push:**
   - All three PRo workflows trigger
   - `pro-merge-bot.yml` runs conflict detection
   - API reports: `mergeable: false` or `mergeable_state: 'dirty'`
   - Git merge test confirms conflicts

2. **PRo Merge Bot Actions:**
   - Detects conflict in `srv/config.js`
   - Analyzes both versions
   - Determines strategy: "merge-config" (use secure env vars)
   - Posts main comment with expandable sections
   - Adds detailed resolution suggestions
   - Labels PR with: `merge-conflict`, `needs-resolution`

3. **Comment Format:**
```markdown
## 🔀 PRo Merge Conflict Analysis

### ⚠️ Conflicts Found
- srv/config.js (Line 8)

### 🔧 Inline Resolution Suggestions

<details>
<summary>📍 srv/config.js:8 - Accept main branch (secure config)</summary>

[Full analysis with code comparison]
[Recommended resolution]
[Step-by-step instructions]

</details>
```

### Testing the Workflow

**To trigger on existing PR:**
```bash
# Make any change to the branch
git commit --allow-empty -m "chore: trigger workflow"
git push origin feature/api-breaking-change-demo
```

**To verify workflow ran:**
1. Go to PR page on GitHub
2. Click "Checks" tab at the top
3. Look for:
   - ✅ PRo Analysis Engine
   - ✅ PRo Merge Conflict Resolver  
   - ✅ Build & Dependency Check

**To see conflict analysis:**
1. Go to PR "Conversation" tab
2. Look for comment from `github-actions[bot]`
3. Title: "🔀 PRo Merge Conflict Analysis"
4. Expand the details section for resolution

### Debugging Workflow Issues

**If workflow doesn't run:**

1. **Check PR base branch:**
   ```bash
   # Workflow only runs for PRs to main/master
   gh pr view 21 --json baseRefName
   ```

2. **Check workflow syntax:**
   ```bash
   # Validate YAML syntax
   yamllint .github/workflows/pro-merge-bot.yml
   ```

3. **Check Actions logs:**
   - Go to PR → Checks tab
   - Click on failed workflow
   - View logs for error messages

4. **Verify permissions:**
   ```yaml
   permissions:
     contents: read
     pull-requests: write
     checks: write
     issues: write
   ```

**If conflict not detected:**

1. **Check API response:**
   - Look for log: "PR mergeable state: dirty, mergeable: false"
   - If `mergeable: null`, API hasn't computed yet (wait ~30s)

2. **Check git merge test:**
   - Look for log: "✅ Conflicts detected in:"
   - Should list conflicted files

3. **Manual test:**
   ```bash
   git checkout feature/api-breaking-change-demo
   git fetch origin main
   git merge --no-commit origin/main
   # Should show conflicts
   git merge --abort
   ```

### Expected Output

When workflow runs successfully, you should see:

**Console Logs:**
```
🔍 Analyzing PR #21: feature/api-breaking-change-demo -> main
PR mergeable state: dirty, mergeable: false
✅ Conflicts detected in:
srv/config.js
```

**PR Comment:**
- Main comment with conflict analysis
- Expandable sections for each conflict
- Step-by-step resolution instructions
- Copy-paste ready code blocks

**PR Labels:**
- `merge-conflict` 🏷️
- `needs-resolution` 🏷️
- `pro-analyzed` 🏷️

**PR Checks:**
- ✅ PRo Merge Conflict Resolver (Success - analysis complete)
- ⚠️ PRo Analysis Engine (Warning - security issues)
- ⚠️ Azure Pipeline (Warning - coverage below threshold)

### Next Steps

After workflow runs and posts conflict analysis:

1. **Review the suggested resolution**
2. **Open `srv/config.js` locally**
3. **Copy the recommended code**
4. **Replace conflict section**
5. **Remove conflict markers**
6. **Commit and push:**
   ```bash
   git add srv/config.js
   git commit -m "fix: resolve config merge conflict - use env vars"
   git push
   ```
7. **PRo will detect resolution and remove conflict labels**

---

**Note:** The workflow is configured and ready. The push to `feature/api-breaking-change-demo` should trigger all workflows including merge conflict detection. Check the PR's "Checks" tab to see the results!
