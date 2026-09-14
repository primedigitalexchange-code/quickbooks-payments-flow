# QuickBooks Payments Flow - Project Guide

Welcome to the **QuickBooks Payments Flow** project! This guide explains how to use the organization-level GitHub Project to track development work.

## 📋 Project Overview

The **QuickBooks Payments Flow** project is an organization-level project that tracks all payment processing, handling, and confirmation work across the `primedigitalexchange-code` organization.

**Project Link:** https://github.com/orgs/primedigitalexchange-code/projects

## 🔄 Workflow Stages

Our project uses a simple 3-stage workflow:

| Stage | Description | When It Happens |
|-------|-------------|-----------------|
| **Backlog** | Items not yet started | Default status for new items |
| **In Progress** | Active development | When a Pull Request is opened |
| **Done** | Completed work | When a Pull Request is merged |

## 📝 How to Use the Project

### For Developers

#### 1. Opening a Pull Request
- When you open a PR for a feature or fix, it should automatically move to **"In Progress"**
- Ensure your PR is properly titled and linked to relevant issues
- Add context in the PR description about what you're changing

#### 2. During Code Review
- Your PR stays in **"In Progress"** while under review
- Address reviewer feedback and update your PR
- Reviewers will guide you through the review process

#### 3. Merging Your Work
- Once your PR is approved and passes all checks, merge it
- Your item will automatically move to **"Done"**
- The work is now complete and deployed/ready for production

### For Project Managers / Team Leads

#### Viewing Progress
1. Go to: https://github.com/orgs/primedigitalexchange-code/projects
2. Select the **QuickBooks Payments Flow** project
3. View items by status:
   - **Backlog**: Upcoming work
   - **In Progress**: Current work in development
   - **Done**: Completed work

#### Adding Items
- Items are automatically added when PRs are created
- You can manually add items if needed
- Use the **"+ Add item"** button

#### Filtering & Sorting
- Filter by **Repository**, **Author**, **Assignee**, or **Labels**
- Sort by priority, due date, or other custom fields
- Use the search to find specific work

## 🎯 Best Practices

### PR Titles
Use clear, descriptive titles:
- ✅ Good: `feat: Add QuickBooks OAuth integration`
- ✅ Good: `fix: Handle payment confirmation errors`
- ❌ Bad: `Update code`
- ❌ Bad: `Fix bug`

### PR Descriptions
Include:
- **What**: What are you changing?
- **Why**: Why is this change needed?
- **How**: How does it work?
- **Testing**: How was this tested?

### Linking Issues
- Reference related issues in your PR: `Closes #123`
- This helps track what issues are being resolved

### Labels
Use labels to categorize work:
- `bug` - Bug fixes
- `feature` - New features
- `enhancement` - Improvements
- `documentation` - Docs updates
- `payment-processing` - Related to payment handling
- `payment-confirmation` - Related to confirmations

## 📊 Viewing Statistics

You can view project statistics:
- **Total items**: All work tracked
- **In Progress**: Active development work
- **Done**: Completed items this sprint/week
- **Average cycle time**: Time from In Progress → Done

## ❓ Common Questions

### Q: Why didn't my PR automatically move to "In Progress"?
**A:** Make sure your PR was created after the project automation was set up. You can manually move items by dragging them to the correct column.

### Q: Can I work on multiple PRs at once?
**A:** Yes! You can have multiple PRs in "In Progress" simultaneously. Try to limit WIP (Work In Progress) to keep the team focused.

### Q: What if I close a PR without merging?
**A:** The item will remain in "In Progress" unless you manually move it or delete it from the project.

### Q: Can I add items that aren't PRs?
**A:** Yes! You can manually add any work item that doesn't have a PR yet, though our main workflow is PR-based.

## 🔧 Project Settings

### Automation Rules
The project has two automation rules:

1. **PR Opened** → Move to "In Progress"
   - Triggered when: A new PR is opened or reopened
   - Action: Item moves to "In Progress" status

2. **PR Merged** → Move to "Done"
   - Triggered when: A PR is merged into the main branch
   - Action: Item moves to "Done" status

### Connected Repositories
- **Primary:** `primedigitalexchange-code/quickbooks-payments-flow`
- Additional repositories can be connected by project admins

## 📞 Support

For questions or issues with the project:
1. Check this guide for answers
2. Review GitHub's ProjectsV2 documentation
3. Contact your team lead or project manager

---

**Happy shipping! 🚀**
