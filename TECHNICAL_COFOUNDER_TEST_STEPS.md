# MilePact Technical Co-Founder Test Steps

This is the candidate-facing challenge brief for the lean escrow test project: `milepact-cofounder-contract-test`.

## Challenge

MilePact is a freelance marketplace built around contract-grade trust. The core product risk is not listings, profiles, or dashboards. It is whether money can move through an escrow lifecycle safely, predictably, and with a product experience founders can trust during early customer pilots.

Your challenge is to audit, harden, and improve the local escrow test project as if you were joining as a technical co-founder. Treat the repository as an intentionally small slice of the real platform: smart contract logic, local chain workflow, and a Next.js dashboard for operating an agreement end to end.

The goal is not to add a large feature set. The goal is to show judgment: find real problems, prioritize the important ones, fix them cleanly, prove the fixes, and explain the tradeoffs.

## Timebox

Recommended timebox: 6 to 10 focused hours.

If you run out of time, prefer a smaller set of high-confidence fixes with strong tests and clear notes over a broad, unfinished rewrite.

## What You Receive

You receive the `milepact-cofounder-contract-test` repository containing:

- A Foundry escrow contract project
- Contract tests
- A local Anvil deployment script
- A Next.js + Tailwind dashboard
- Hardcoded local defaults
- No `.env` files
- No database, auth, marketplace, or backend services

## Ground Rules

- Do not introduce `.env` files.
- Do not add MongoDB, auth, marketplace data, or backend services.
- Do not replace the project with a different stack.
- Do not remove the local Anvil workflow.
- Do not commit generated artifacts such as `.next`, `node_modules`, Foundry cache, broadcast output, or contract build output.
- Keep the project runnable by a reviewer using only local commands.

## Baseline Setup

Install dependencies:

```bash
npm install
```

Run contract tests:

```bash
npm run contracts:test
```

Build the dashboard:

```bash
npm run build
```

Run the local chain:

```bash
npm run local:chain
```

Deploy contracts in a second terminal:

```bash
npm run contracts:deploy:local
```

Run the dashboard in a third terminal:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Required Work

### 1. Audit the escrow lifecycle

Review the contract, tests, deploy script, dashboard, and README flow. Look for issues in:

- Access control
- Signature verification
- State transitions
- Refund and release logic
- Deadline and review-period behavior
- Dispute behavior
- Token movement and accounting
- Local deployment reliability
- Dashboard transaction sequencing and error handling
- Reviewer experience when running the project from scratch

### 2. Fix the highest-risk problems

Prioritize fixes that protect escrow funds and prevent incorrect lifecycle transitions. A strong submission should include multiple meaningful fixes rather than cosmetic-only changes.

For each fix, be able to explain:

- What was wrong
- Why it matters to users or the business
- What changed
- How you verified it
- What risk remains, if any

### 3. Improve regression coverage

Add or update tests so the corrected behavior is protected. At minimum, contract-level fixes should have Foundry tests.

Good tests should cover both happy paths and failure paths. Prefer explicit tests for previously broken behavior.

### 4. Preserve the local E2E flow

The reviewer should still be able to:

1. Start Anvil.
2. Deploy local contracts.
3. Start the dashboard.
4. Connect MetaMask to local Anvil.
5. Create an agreement.
6. Counter-sign as freelancer.
7. Approve and fund as client.
8. Mark delivered as freelancer.
9. Release funds as client or verify automatic release behavior.

If you change the E2E flow, document exactly why and how to run the new flow.

### 5. Improve the dashboard only where it supports the escrow test

Dashboard improvements are welcome when they make the escrow flow safer or clearer. Examples:

- Better validation before contract writes
- Clearer connected-account role display
- Better handling of wrong chain or missing wallet
- Better transaction status and failure messages
- Preventing impossible actions in the current state

Avoid large visual redesigns or unrelated product pages.

## Pull Request Deliverable

Submit your work as a pull request against the provided repository.

Use a clear branch name, for example:

```text
cofounder-test/your-name
```

Your PR should contain:

- Your code changes
- Updated or added tests
- A working local dashboard build
- A clear PR description explaining your findings and verification steps

In the PR description, include:

- The problems you found, ordered by severity
- The fixes you made
- Commands you ran and their results
- Any issues you intentionally did not fix because of time or scope
- Any product/security tradeoffs you would discuss before production launch

You may also update `README.md` if the local flow changes. Do not rely on a new markdown file other than `README.md`; the project intentionally ignores extra markdown files.

## Verification Commands

Before submitting, run:

```bash
npm run contracts:test
npm run build
git status --short
```

A strong final state has:

- Passing contract tests
- Passing dashboard build
- No generated artifacts staged
- No `.env` files
- Clear PR description

## What We Evaluate

We evaluate for technical co-founder judgment, not just syntax. The strongest submissions usually show:

- Security-first prioritization
- Clear reasoning about money movement
- Minimal but effective code changes
- Strong regression tests
- A working local E2E flow
- Practical product thinking
- Clean repository hygiene
- Clear communication of tradeoffs

## What Not To Optimize For

Do not spend most of the time on:

- Styling-only dashboard changes
- Adding auth or database features
- Rebuilding the contract architecture from scratch without explanation
- Creating a large backend service
- Adding cloud deployment
- Hiding complexity behind undocumented scripts

The best answer should feel like a careful founder-engineer making the smallest responsible set of changes to make escrow safer and easier to validate.
