# Contributing to QuickBooks Payments Flow

Thank you for your interest in contributing to the QuickBooks Payments Flow project! This guide will help you understand how to contribute effectively.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Making Changes](#making-changes)
4. [Commit Guidelines](#commit-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Code Standards](#code-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)
9. [Code Review Process](#code-review-process)
10. [Reporting Issues](#reporting-issues)
11. [Community Guidelines](#community-guidelines)

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **npm** or **yarn** (latest version)
- **Git** (latest version)
- A GitHub account with access to the repository

### Fork and Clone

1. Fork the repository to your GitHub account
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quickbooks-payments-flow.git
   cd quickbooks-payments-flow
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/primedigitalexchange-code/quickbooks-payments-flow.git
   ```

---

## 💻 Development Setup

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Environment Setup

1. Create a `.env.local` file in the project root
2. Add required environment variables (ask your team lead for details)
3. Never commit `.env.local` to the repository

### Verify Setup

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` (or appropriate port) to verify the application runs.

---

## ✏️ Making Changes

### Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/bug-description
```

### Branch Naming Convention

Follow these patterns:

- **Features:** `feature/descriptive-name`
- **Bug Fixes:** `fix/bug-description`
- **Hotfixes:** `hotfix/urgent-fix`
- **Documentation:** `docs/what-you-documented`
- **Tests:** `test/test-description`
- **Refactoring:** `refactor/what-you-refactored`

### Branch Naming Examples

✅ Good:
- `feature/payment-processing-enhancement`
- `fix/handle-null-payment-response`
- `docs/add-payment-flow-documentation`

❌ Bad:
- `feature/update`
- `fix/bug`
- `my-changes`

---

## 📝 Commit Guidelines

### Commit Message Format

Use the conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that don't affect code meaning (formatting, semicolons, etc.)
- **refactor:** Code change that neither fixes a bug nor adds a feature
- **perf:** Code change that improves performance
- **test:** Adding or updating tests
- **chore:** Changes to build process, dependencies, etc.
- **ci:** Changes to CI configuration files

### Scopes

Common scopes:
- `payment-processing`
- `payment-confirmation`
- `auth`
- `api`
- `ui`
- `database`
- `tests`

### Examples

```
feat(payment-processing): add transaction retry logic

Add exponential backoff retry mechanism for failed payment transactions.
Retries up to 3 times before marking transaction as failed.

Closes #123
```

```
fix(payment-confirmation): handle null payment response

Check for null response before accessing payment status field.
Prevents crashes when payment gateway returns unexpected response.

Fixes #456
```

```
docs(readme): add setup instructions

Add detailed setup and installation steps for new developers.
```

### Commit Best Practices

- ✅ Make logical, atomic commits (one change per commit)
- ✅ Write clear, descriptive commit messages
- ✅ Reference issues in commit messages: `Closes #123`
- ✅ Keep commits small and focused
- ❌ Don't mix features and fixes in one commit
- ❌ Avoid large commits with multiple unrelated changes

---

## 🔄 Pull Request Process

### Before Opening a PR

1. **Update your branch** with latest main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests locally:**
   ```bash
   npm run test
   ```

3. **Check code quality:**
   ```bash
   npm run lint
   ```

4. **Build to verify:**
   ```bash
   npm run build
   ```

### Opening a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to GitHub and create a Pull Request
3. The PR template will auto-populate
4. **Fill out all sections** of the template
5. Link the related issue(s)
6. Request reviewers from the team
7. Submit for review

### PR Title Format

Follow conventional commits for PR titles:

```
feat(payment-processing): add transaction retry logic
fix(payment-confirmation): handle null payment response
docs: update contribution guide
```

### PR Description Template

See [.github/pull_request_template.md](.github/pull_request_template.md) for details.

Key sections:
- Clear description of changes
- Link to related issues
- Type of change
- Testing information
- Documentation updates
- Completed checklist

---

## 🎨 Code Standards

### JavaScript/TypeScript Style

- Use **ESLint** for code linting
- Use **Prettier** for code formatting
- Follow the existing code style in the project

```bash
npm run lint       # Check code style
npm run lint:fix   # Auto-fix style issues
npm run format     # Format with Prettier
```

### Naming Conventions

**Variables & Functions:**
```javascript
// ✅ Good
const userPaymentStatus = getUserPaymentStatus();
function handlePaymentConfirmation() { }
const MAX_RETRIES = 3;

// ❌ Bad
const ups = getUPS();
function hp() { }
const maxRetries = 3;
```

**Components (React):**
```javascript
// ✅ Good
const PaymentProcessingForm.jsx
const usePaymentTransaction.js
const paymentService.js

// ❌ Bad
const form.jsx
const hook.js
const service.js
```

### Code Organization

```
src/
├── components/      # React components
├── hooks/           # Custom React hooks
├── services/        # Business logic & API calls
├── utils/           # Utility functions
├── constants/       # Constants and enums
├── types/           # TypeScript types
├── styles/          # CSS/SCSS files
└── __tests__/       # Test files
```

### Comments & Documentation

- Write clear comments for complex logic
- Use JSDoc for functions and components
- Keep comments up-to-date with code changes

```javascript
/**
 * Process a payment transaction with retry logic
 * @param {string} paymentId - Unique payment identifier
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<PaymentResult>} Payment processing result
 */
async function processPaymentTransaction(paymentId, retries = 3) {
  // Implementation
}
```

---

## 🧪 Testing Guidelines

### Write Tests For

- ✅ New features
- ✅ Bug fixes
- ✅ Critical functions
- ✅ Edge cases
- ✅ API integrations

### Test Command

```bash
npm run test          # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Test Naming Convention

```javascript
describe('PaymentService', () => {
  describe('processTransaction', () => {
    it('should successfully process a valid payment', () => {
      // Test implementation
    });

    it('should retry on temporary failure', () => {
      // Test implementation
    });

    it('should throw error on max retries exceeded', () => {
      // Test implementation
    });
  });
});
```

### Coverage Requirements

- Aim for **80%+ code coverage**
- Critical payment logic should have **100% coverage**
- All public APIs should be tested

---

## 📚 Documentation

### Update Documentation When

- Adding new features
- Changing existing behavior
- Adding new APIs or endpoints
- Making breaking changes

### Documentation Files to Update

- `README.md` - Overview and setup
- `docs/GETTING_STARTED.md` - Onboarding guide
- `docs/WORKFLOW_DIAGRAM.md` - Process documentation
- Inline code comments
- JSDoc comments for functions
- API documentation (if applicable)

### Documentation Standards

- Use clear, concise language
- Include code examples
- Update table of contents if needed
- Add section headers for clarity
- Include links to related documentation

---

## 👀 Code Review Process

### What to Expect

1. **Automated Checks:**
   - GitHub Actions runs tests and linting
   - Coverage reports are generated

2. **Peer Review:**
   - Team members review your code
   - Feedback is provided constructively
   - Multiple approvals may be required

3. **Changes Requested:**
   - Address all comments and feedback
   - Push additional commits
   - Request re-review

4. **Approval:**
   - PR is approved once all feedback is addressed
   - All checks pass
   - Ready to merge

### Review Timeline

- **First review:** Usually within 24 hours
- **Subsequent reviews:** After each update
- **Merging:** After approval and passing all checks

### How to Handle Feedback

- ✅ Respond to all comments
- ✅ Ask clarifying questions if needed
- ✅ Make requested changes promptly
- ✅ Thank reviewers for feedback
- ❌ Don't take criticism personally
- ❌ Don't argue about feedback unnecessarily

---

## 🐛 Reporting Issues

### Before Creating an Issue

1. Check existing issues to avoid duplicates
2. Verify you can reproduce the issue
3. Gather relevant information:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, versions)
   - Screenshots or error logs

### Creating an Issue

1. Go to **Issues** tab
2. Click **"New Issue"**
3. Select appropriate template:
   - Bug Report
   - Feature Request
   - General Issue
4. Fill out all sections
5. Submit

### Issue Guidelines

- Use clear, descriptive titles
- Be specific and detailed
- Include reproduction steps
- Provide screenshots/logs when relevant
- Use appropriate labels
- Reference related issues

---

## 👥 Community Guidelines

### Code of Conduct

- Be respectful to all contributors
- Provide constructive feedback
- Welcome new ideas and perspectives
- Resolve conflicts professionally
- No harassment, discrimination, or abuse

### Communication

- Use professional language
- Be clear and concise
- Respond promptly to comments
- Ask questions when unclear
- Help other contributors

### Collaboration

- Share knowledge and experience
- Help review others' PRs
- Mentor new contributors
- Celebrate successes together
- Learn from mistakes

---

## 🆘 Getting Help

### Resources

- **Documentation:** See [docs/](docs/) directory
- **Project Guide:** [PROJECT_GUIDE.md](PROJECT_GUIDE.md)
- **Workflow Info:** [docs/WORKFLOW_DIAGRAM.md](docs/WORKFLOW_DIAGRAM.md)
- **Templates:** [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/)

### Asking Questions

1. Check existing documentation first
2. Search existing issues and PRs
3. Ask in comments on related issues
4. Reach out to team lead if needed
5. Create a new issue if stuck

### Common Issues

**Q: How do I run tests?**
```bash
npm run test
```

**Q: How do I fix linting errors?**
```bash
npm run lint:fix
```

**Q: How do I format my code?**
```bash
npm run format
```

**Q: My PR template didn't load?**
Create a new PR and refresh the page, or check `.github/pull_request_template.md`

---

## ✅ Contribution Checklist

Before submitting your PR, ensure:

- [ ] Branch follows naming convention
- [ ] Commits follow conventional format
- [ ] Code follows project style guide
- [ ] Tests are added/updated
- [ ] All tests pass locally
- [ ] Code coverage is adequate
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] PR template is fully completed
- [ ] Related issue is linked
- [ ] Reviewers are assigned

---

## 🎉 Thank You!

Thank you for contributing to QuickBooks Payments Flow! Your efforts help make this project better for everyone.

If you have questions or need help, don't hesitate to reach out to the team.

**Happy coding! 🚀**

---

**Contributing Guide v1.0**
**Last Updated:** 2026-09-14

For more information, see:
- [PROJECT_GUIDE.md](PROJECT_GUIDE.md)
- [docs/WORKFLOW_DIAGRAM.md](docs/WORKFLOW_DIAGRAM.md)
- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
