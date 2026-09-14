# Branch Protection Rules Documentation

This document outlines the branch protection rules for the **QuickBooks Payments Flow** repository to ensure code quality, security, and team collaboration standards.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Protected Branches](#protected-branches)
3. [Protection Rules](#protection-rules)
4. [Pull Request Requirements](#pull-request-requirements)
5. [Code Review Standards](#code-review-standards)
6. [Status Checks](#status-checks)
7. [Dismissal Rules](#dismissal-rules)
8. [Restrictions](#restrictions)
9. [Troubleshooting](#troubleshooting)
10. [Admin Bypass](#admin-bypass)

---

## 🎯 Overview

Branch protection rules enforce code quality standards and prevent accidental or unauthorized changes to critical branches. These rules ensure:

- ✅ All changes go through code review
- ✅ Automated tests pass before merging
- ✅ Code quality standards are maintained
- ✅ Multiple team members review critical code
- ✅ No direct pushes to main branch
- ✅ Consistent commit history

---

## 🔒 Protected Branches

### Main Branch (`main`)
- **Protection Level:** Critical
- **Purpose:** Production-ready code
- **Policy:** Strict review and testing requirements
- **Who Can Merge:** Team leads, maintainers

### Development Branch (`develop`)
- **Protection Level:** High
- **Purpose:** Integration branch for features
- **Policy:** Review and testing required
- **Who Can Merge:** Team leads, senior developers

### Release Branch (`release/*`)
- **Protection Level:** High
- **Purpose:** Release preparation
- **Policy:** Review and testing required
- **Who Can Merge:** Release managers

---

## 🛡️ Protection Rules

### Rule 1: Require Pull Request Reviews

**Setting:** ✅ Enabled

**Configuration:**
- **Require pull request reviews before merging:** YES
- **Dismiss stale pull request approvals when new commits are pushed:** YES
- **Require review from Code Owners:** YES
- **Require status checks to pass before merging:** YES

**Details:**
- At least **2 approvals** required for `main` branch
- At least **1 approval** required for `develop` branch
- Reviewers can dismiss stale reviews if new commits are pushed
- CODEOWNERS file determines required reviewers

### Rule 2: Require Status Checks to Pass

**Setting:** ✅ Enabled

**Required Status Checks:**
- ✅ `tests` - Unit and integration tests
- ✅ `lint` - Code style and quality checks
- ✅ `coverage` - Minimum code coverage threshold
- ✅ `build` - Build process verification
- ✅ `security` - Security vulnerability scanning

**Details:**
- All checks must pass before PR can be merged
- GitHub waits for checks to complete
- Cannot merge if checks fail
- Require branches to be up to date before merging

### Rule 3: Require Branches to Be Up to Date

**Setting:** ✅ Enabled

**Details:**
- Branch must be updated with base branch before merging
- Prevents merge conflicts
- Ensures latest code is included
- Automatically checked by GitHub

### Rule 4: Require Conversation Resolution

**Setting:** ✅ Enabled

**Details:**
- All conversations in PR must be resolved
- Reviewers must mark comments as resolved
- Prevents accidental merge with unresolved feedback

### Rule 5: Require Code Owner Review

**Setting:** ✅ Enabled

**Details:**
- Defined in `.github/CODEOWNERS` file
- Specific file/directory ownership assigned
- Code owners must review changes to their files
- Ensures domain expertise in reviews

### Rule 6: Require Commit Signature Verification

**Setting:** ✅ Enabled (for `main` branch)

**Details:**
- All commits must be GPG signed
- Ensures commit authenticity
- Prevents unsigned commits
- Developers must configure GPG keys

### Rule 7: Restrict Who Can Push

**Setting:** ✅ Enabled

**Details:**
- Only designated users/teams can push
- Prevents accidental direct commits
- Bypasses PR review process when not enforced
- Applied to `main` branch only

---

## 📝 Pull Request Requirements

### PR Title Format

Follow conventional commits format:

```
feat(scope): description
fix(scope): description
docs: description
refactor(scope): description
```

### PR Description Requirements

- [ ] Clear description of changes
- [ ] Related issue number (Closes #123)
- [ ] Type of change selected
- [ ] Testing information provided
- [ ] Documentation updates noted
- [ ] All checklist items completed

### Before PR Can Be Merged

1. ✅ PR title follows conventional format
2. ✅ PR description is complete
3. ✅ Related issue is linked
4. ✅ At least 2 approvals (main) or 1 approval (develop)
5. ✅ All status checks pass
6. ✅ Branch is up to date with base branch
7. ✅ All conversations are resolved
8. ✅ Commits are signed (for main)
9. ✅ Code coverage meets minimum threshold

---

## 👥 Code Review Standards

### Minimum Reviews Required

| Branch | Minimum Reviews | Dismissable | Code Owners Required |
|--------|-----------------|-------------|----------------------|
| `main` | 2 | Yes (with new commits) | Yes |
| `develop` | 1 | Yes (with new commits) | No |
| `release/*` | 1 | Yes (with new commits) | Yes |

### Review Checklist

Reviewers should verify:

- ✅ Code follows project standards
- ✅ Logic is correct and efficient
- ✅ Tests are adequate and passing
- ✅ Documentation is updated
- ✅ No security vulnerabilities
- ✅ No breaking changes (or documented)
- ✅ Performance impact is acceptable
- ✅ Error handling is appropriate
- ✅ No console.log() statements left
- ✅ No sensitive data in code

### Review Timeline

- **First review:** Within 24 hours
- **Subsequent reviews:** Within 12 hours after changes
- **Expedited:** Critical security fixes (within 2 hours)

### Dismissing Stale Reviews

When are reviews dismissed?
- When new commits are pushed to PR
- After conversation resolution if changes requested

When are reviews NOT dismissed?
- Approval reviews remain valid
- Unless explicitly overridden

---

## ✅ Status Checks

### Required Checks (All Must Pass)

#### 1. Tests (`tests`)
- **Purpose:** Run all unit and integration tests
- **Tool:** Jest / Mocha / Other test runner
- **Command:** `npm run test`
- **Pass Criteria:** All tests pass, no skipped tests
- **Timeout:** 15 minutes

#### 2. Lint (`lint`)
- **Purpose:** Check code style and quality
- **Tool:** ESLint, Prettier
- **Command:** `npm run lint`
- **Pass Criteria:** No linting errors or warnings
- **Timeout:** 5 minutes

#### 3. Code Coverage (`coverage`)
- **Purpose:** Verify minimum code coverage
- **Tool:** Coverage tools (Istanbul, Codecov)
- **Command:** `npm run test:coverage`
- **Pass Criteria:** ≥80% overall, ≥100% for critical functions
- **Timeout:** 10 minutes

#### 4. Build (`build`)
- **Purpose:** Verify build succeeds
- **Tool:** Build tool (Webpack, Vite, etc.)
- **Command:** `npm run build`
- **Pass Criteria:** Build completes without errors
- **Timeout:** 10 minutes

#### 5. Security (`security`)
- **Purpose:** Scan for vulnerabilities
- **Tool:** npm audit, Snyk, OWASP
- **Command:** `npm audit` / Security scanning tools
- **Pass Criteria:** No critical/high vulnerabilities
- **Timeout:** 5 minutes

### Status Check Configuration

**Require status checks to pass before merging:** YES

**Require branches to be up to date before merging:** YES

**Consider approval with push:** NO (stale reviews dismissed)

---

## 🗑️ Dismissal Rules

### When Stale Reviews Are Dismissed

```
IF (new commits pushed to PR) THEN
  dismiss all previous reviews
  require new approvals
END IF
```

**Rationale:** New commits may change logic requiring re-review

### When Reviews Are NOT Dismissed

- Final approval before merge
- Code owner approval (for CODEOWNERS files)
- Conversations marked resolved

### Override Stale Review Dismissal

**Only for:** Code owners reviewing their domains
**How:** Use "Request changes" to require explicit re-review

---

## 🚫 Restrictions

### Direct Pushes to Protected Branches

**Blocked:** All direct pushes to `main` and `develop`

**Required:** All changes must go through pull requests

**Exception:** Admins can override (not recommended)

### Force Pushes

**Blocked:** Force pushes to protected branches

**Reason:** Prevents history rewriting and data loss

### Deletion of Protected Branches

**Blocked:** Cannot delete protected branches

**How to Delete:** Remove protection rule first (admin only)

### Who Can Push

**Allowed Users/Teams:**
- ✅ Team leads
- ✅ Maintainers
- ✅ Release managers (for release branches)

**Blocked Users:**
- ❌ Individual developers
- ❌ External contributors
- ❌ Automated bots (unless specifically approved)

---

## 🔐 Code Owners

### CODEOWNERS File

**Location:** `.github/CODEOWNERS`

**Purpose:** Designate domain experts for code review

**Format:**
```
# Syntax: path @username @team/name

# Payment Processing
src/services/payment-processing/ @team/payment-team
src/services/payment-confirmation/ @team/payment-team

# Authentication
src/services/auth/ @alice @bob

# API
src/api/ @charlie

# All files
* @maintainers
```

**How It Works:**
- When PR changes files in listed paths
- Those code owners are automatically requested for review
- Review from code owners is required for merge

**Managing Code Owners:**
- Update `.github/CODEOWNERS` via PR
- Requires approval before changes take effect
- Document responsibility assignments

---

## 🔄 Workflow Example

### Scenario: Merge to Main

```
Developer starts work:
  1. Create branch from main: feature/new-payment-flow
  2. Make changes and push commits

Developer opens PR:
  3. PR template auto-populates
  4. Developer fills all sections
  5. GitHub checks trigger:
     - Tests run
     - Lint checks run
     - Build verifies
     - Security scan runs
     - Coverage calculated

Status Check Phase:
  ✓ All checks must PASS
  ✗ If any check fails → Cannot merge yet
    → Fix and push new commits
    → Checks re-run automatically

Code Review Phase:
  6. PR assigned to code owners/reviewers
  7. First reviewer checks code quality
  8. If changes needed → Request changes
     → Developer fixes → Reviewer re-reviews
  9. Second reviewer approves (for main)
  10. All conversations marked resolved

Stale Review Check:
  - If new commits pushed after reviews
  - Previous reviews dismissed
  - New reviews required

Merge Check:
  ✓ Branch up to date with main
  ✓ All status checks pass
  ✓ Required approvals received
  ✓ All conversations resolved
  ✓ Commits signed (for main)

Merge:
  11. Developer or reviewer clicks "Merge"
  12. PR merged to main
  13. Branch deletion offered
  14. CI/CD deployment pipeline triggered
```

---

## 🐛 Troubleshooting

### "Branch is out of date" Error

**Problem:** Branch is behind main/develop

**Solution:**
```bash
git fetch upstream
git rebase upstream/main
git push -f origin feature/your-branch
```

**Why:** Ensures your code is based on latest main

### "Status checks failed"

**Problem:** Tests, lint, build, or security checks failed

**Solution:**
1. Check the failing check details
2. Fix the issue locally
3. Push fix to same branch
4. Checks re-run automatically
5. Once all pass, can be merged

### "Need additional reviews"

**Problem:** Not enough approvals yet

**Solution:**
1. Ensure all code owners reviewed
2. Wait for second approval (main branch)
3. Ensure no changes requested
4. Respond to all review comments

### "Conversations need to be resolved"

**Problem:** Comments in PR not marked resolved

**Solution:**
1. Go to PR conversation tab
2. Read each comment
3. Respond to comment if needed
4. Click "Resolve conversation"
5. All must be resolved before merge

### "Commit signature verification failed"

**Problem:** Commits not signed with GPG

**Solution:**
1. Configure GPG signing locally
2. Amend commits with signature
3. Force push with signed commits
4. See: https://docs.github.com/en/authentication/managing-commit-signature-verification

### "Cannot merge due to protection rules"

**Problem:** Trying to merge but rules prevent it

**Solution:**
- Verify all checks passed
- Verify required reviews received
- Verify branch is up to date
- Verify all conversations resolved
- Contact repo admin if issue persists

---

## 👨‍💼 Admin Bypass

### When Admins Can Bypass Rules

**For emergencies only:**
- Critical production bugs
- Security vulnerabilities
- Time-sensitive hotfixes

**How to Bypass:** (Admin only)
1. Go to PR page
2. Scroll to merge section
3. Look for "Merge without waiting for required reviews"
4. Click to bypass (if available)

**Important:** 
- ⚠️ Only use in emergencies
- ⚠️ Document the bypass reason
- ⚠️ Plan for code review after merge
- ⚠️ Log in security audit trail

### Policy for Bypass Usage

- **Maximum bypasses per month:** 2
- **Reason required:** Document in PR or commit
- **Notification:** Team lead must be informed
- **Post-merge review:** Still review after merge
- **Audit trail:** All bypasses logged

---

## 📊 Monitoring Protection Rules

### View Protection Rules

1. Go to repository → **Settings** → **Branches**
2. Find branch under "Branch protection rules"
3. Click to view/edit settings

### Test Protection Rules

To verify rules work:

1. Create test branch
2. Try direct push (should fail)
3. Create PR without approval (should block merge)
4. Create PR with failing tests (should block merge)
5. Verify all rules enforce as expected

### Update Protection Rules

When to update:
- Team size changes
- Code complexity increases
- Security requirements change
- Process improvements identified

How to update:
1. Go to Settings → Branches
2. Edit rule
3. Make changes
4. Save and verify impact

---

## 📞 Questions?

Refer to:
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contributing guidelines
- [PROJECT_GUIDE.md](../PROJECT_GUIDE.md) - Project overview
- [GitHub Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches) - Official GitHub docs

---

## ✅ Checklist for Repository Admins

To implement these protection rules:

- [ ] Go to repository Settings
- [ ] Navigate to Branches section
- [ ] Create/edit protection rule for `main`
- [ ] Enable: Require PR reviews (2 required)
- [ ] Enable: Dismiss stale reviews
- [ ] Enable: Require status checks to pass
- [ ] Enable: Require branches up to date
- [ ] Enable: Require conversation resolution
- [ ] Enable: Require code owner review
- [ ] Enable: Commit signature verification
- [ ] Restrict push access to admins
- [ ] Repeat for `develop` branch (1 review required)
- [ ] Create `.github/CODEOWNERS` file
- [ ] Document in this file
- [ ] Communicate rules to team

---

**Branch Protection Rules v1.0**
**Last Updated:** 2026-09-14

For implementation help, contact your repository administrator.
