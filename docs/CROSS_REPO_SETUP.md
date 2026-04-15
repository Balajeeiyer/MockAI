# Cross-Repository Integration Testing Setup

This document explains how to configure the cross-repository integration testing system for MockAI.

## Overview

The cross-repository integration testing system automatically tests dependent microservices when MockAI API changes are made. When a PR modifies API-related files (`srv/*.cds`, `srv/*.js`, `db/schema.cds`), the system:

1. Dispatches integration test workflows to dependent repositories
2. Waits for test results
3. Reports results back to the MockAI PR via GitHub Checks API
4. Notifies code owners and creates issues on failures

## Prerequisites

- GitHub organization or personal account: `Balajeeiyer`
- Admin access to MockAI repository
- Admin access to all dependent repositories (e.g., OrderService)
- GitHub Actions enabled on all repositories

## Setup Steps

### 1. Create GitHub Personal Access Token (PAT)

The dispatcher workflow requires a GitHub PAT with permissions to send `repository_dispatch` events to dependent repositories.

**Steps:**

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Configure token:
   - **Name:** `MockAI Cross-Repo Integration Token`
   - **Expiration:** 90 days (or longer, depending on your security policy)
   - **Repository access:** Select "Only select repositories"
   - **Selected repositories:** Add:
     - `Balajeeiyer/MockAI`
     - `Balajeeiyer/order-service` (and any other dependent repos)
   - **Permissions:**
     - Repository permissions:
       - **Contents:** Read and write (to dispatch events)
       - **Metadata:** Read-only (default)

4. Click "Generate token"
5. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!

### 2. Add Token as Repository Secret

1. Go to MockAI repository settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Add secret:
   - **Name:** `CROSS_REPO_TOKEN`
   - **Value:** Paste the PAT you created in Step 1
5. Click "Add secret"

### 3. Configure Dependent Repositories

Edit `.github/dependent-repos.yml` to list dependent repositories:

```yaml
version: '1.0'

settings:
  timeout: 600000  # 10 minutes
  parallel: true
  warning_threshold: 95

dependent_repos:
  - name: OrderService
    repository: Balajeeiyer/order-service
    branch: main
    code_owners:
      - '@Balajeeiyer'
    
    dependencies:
      - service: MockAI Products API
        endpoints:
          - GET /products/Products
          - GET /products/Products({ID})
          - POST /products/Products
          - PATCH /products/Products({ID})
          - DELETE /products/Products({ID})
    
    estimated_duration: 300  # 5 minutes
    critical: true

notifications:
  create_issues: true
  issue_labels:
    - integration-test-failure
    - cross-repo
  issue_title_template: '[Integration Test] Failure in {{repo}} due to {{source_pr}}'
```

### 4. Set Up Dependent Repository Workflows

Each dependent repository (e.g., OrderService) must have a workflow that listens for `repository_dispatch` events:

**.github/workflows/external-integration-test.yml** (in dependent repo):

```yaml
name: External Integration Test

on:
  repository_dispatch:
    types: [external-integration-test]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup environment
        run: |
          echo "Testing against MockAI PR: ${{ github.event.client_payload.source_pr }}"
          echo "Source SHA: ${{ github.event.client_payload.source_sha }}"
      
      - name: Run integration tests
        run: npm test  # Replace with your test command
      
      - name: Report results
        if: always()
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Report back to MockAI PR via GitHub API
          echo "Integration tests completed"
```

## Verification

Test the setup by creating a PR in MockAI that modifies an API file:

1. Create a branch: `git checkout -b test/cross-repo-integration`
2. Modify a file: `echo "// test" >> srv/product-service.js`
3. Commit: `git commit -am "test: trigger cross-repo integration"`
4. Push: `git push -u origin test/cross-repo-integration`
5. Create PR on GitHub
6. Verify:
   - Hyperspace Bot runs and completes
   - Cross-repo dispatcher job runs
   - Tracking comment appears on PR listing dispatched repos
   - Dependent repository workflows trigger (check Actions tab in dependent repos)
   - Results are reported back to MockAI PR

## Troubleshooting

### Dispatcher job fails with "Bad credentials"

**Cause:** Invalid or expired `CROSS_REPO_TOKEN`

**Solution:**
1. Generate a new PAT (see Step 1)
2. Update the `CROSS_REPO_TOKEN` secret (see Step 2)
3. Re-run the workflow

### Dispatcher job skips dependent repos

**Possible causes:**
- No API files changed (check `git diff` output in workflow logs)
- `.github/dependent-repos.yml` is missing or invalid
- YAML syntax error in config file

**Solution:**
1. Verify API files were modified (`srv/*.cds`, `srv/*.js`, `db/schema.cds`)
2. Validate `.github/dependent-repos.yml` syntax: `npm install js-yaml && node -e "require('js-yaml').load(require('fs').readFileSync('.github/dependent-repos.yml', 'utf8'))"`
3. Check workflow logs for specific error messages

### Dependent repository workflow doesn't trigger

**Possible causes:**
- PAT doesn't have permission to dispatch to that repository
- Dependent repository doesn't have `repository_dispatch` workflow
- Repository name mismatch in config

**Solution:**
1. Verify PAT has access to the dependent repository (check token settings)
2. Ensure dependent repo has `.github/workflows/external-integration-test.yml`
3. Verify repository name in `.github/dependent-repos.yml` matches exactly: `owner/repo`

### Results not reported back to MockAI PR

**Cause:** Dependent repository doesn't have reporting logic

**Solution:**
Implement GitHub Checks API reporting in dependent repository workflow (covered in future tasks)

## Security Considerations

- **Token Expiration:** Rotate PAT every 90 days (set calendar reminder)
- **Least Privilege:** Token only has access to specified repositories
- **Audit Logging:** Review Actions logs regularly for unauthorized dispatch events
- **Secret Scanning:** Ensure token is stored as repository secret, never committed to code

## Maintenance

- **Adding New Dependent Repos:**
  1. Add repository to PAT's repository access list
  2. Add entry to `.github/dependent-repos.yml`
  3. Set up workflow in new dependent repository
  4. Test by creating a PR

- **Removing Dependent Repos:**
  1. Remove entry from `.github/dependent-repos.yml`
  2. Optionally remove repository from PAT access list

## Related Documentation

- [Hyperspace Bot Documentation](../.github/HYPERSPACE_BOT.md)
- [Design Specification](./superpowers/specs/2026-04-15-cross-repo-integration-testing-design.md)
- [Implementation Plan](./superpowers/plans/2026-04-15-cross-repo-integration-testing.md)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions tab
2. Verify configuration in `.github/dependent-repos.yml`
3. Review this document's Troubleshooting section
4. Create issue in MockAI repository with:
   - PR number
   - Workflow run URL
   - Error messages from logs
