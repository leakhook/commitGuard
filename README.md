# commitGuard

> Read this in other languages: [한국어](./README.ko.md)

A lightweight, **zero-config** CLI that stops secrets from being committed — at the **pre-commit stage**, before they ever reach your history. Built husky-first, with frontend / JS projects (especially Next.js) in mind.

Tools like gitleaks and trufflehog are powerful but take setup and don't treat husky as a first-class citizen. commitGuard aims for a single command: **`npx commitguard init`** installs the husky hook, writes sensible defaults, and you write **zero config files**.

- 🔒 Blocks `.env*` files and hard-coded API keys before they're committed
- 🪝 First-class **husky** integration — one command to wire it up
- 📦 **Zero runtime dependencies**, ESM, TypeScript
- 🎯 Conservative by design — tuned to minimize false positives
- ⚡️ Reads the **staged blob**, so staging-then-editing can't sneak a secret past

## Install

```bash
npm install -D commitguard husky
npx commitguard init
```

`init` does the following, idempotently (safe to re-run):

- Adds `npx commitguard scan --staged` to `.husky/pre-commit`
- Adds `"prepare": "husky"` to `package.json` (so a fresh `npm install` after clone restores the hook)
- Creates a default `.commitguardrc` in the project root (left untouched if it already exists)

## Usage

```bash
commitguard scan --staged   # staged files only (runs automatically in the pre-commit hook)
commitguard scan            # all tracked files (CI / manual run)
```

- Exits with **code 1** when an error-level violation is found, blocking the commit / CI.
- Warnings alone do **not** block (exit code 0).
- Exits with **code 2** when run outside a git repository.

## What it detects

| Rule | Severity | Notes |
|------|----------|-------|
| `.env*` files staged | error | `.env.example` / `.env.sample` / `.env.template` are allowed |
| Known key patterns | error | AWS, Google API, Stripe, JWT, … |
| Generic high-entropy strings | error | Conservative threshold to limit false positives |
| `NEXT_PUBLIC_` with a secret-looking value | **warning** | Exposure may be intentional → never blocks the commit |
| User-defined `watch` files | error | Files you mark as never-commit |

Each finding is reported with **what / where / why it's risky / how to fix it**, and secret tokens are masked in the output.

## Configuration

commitGuard works with no config. To customize, use either a `.commitguardrc` file (pure JSON) **or** a `"commitguard"` key in `package.json`.

Priority: **`.commitguardrc` > `package.json` `"commitguard"` key > built-in defaults.**

```json
{
  "watch": ["config/secrets.ts", "src/firebase.config.js"],
  "ignore": [".env.example"],
  "allowNextPublic": false,
  "entropyThreshold": 4.0
}
```

| Key | Description | Default |
|-----|-------------|---------|
| `watch` | Files that must never be committed | `[]` |
| `ignore` | Paths / globs to exclude from scanning | `[".env.example", ".env.sample", ".env.template"]` |
| `allowNextPublic` | `true` disables the `NEXT_PUBLIC_` warning | `false` |
| `entropyThreshold` | High-entropy sensitivity (higher = less sensitive) | `4.0` |

> Note on `ignore`: a bare filename (no slash, e.g. `secrets.ts`) matches that basename **anywhere** in the repo, while entries with a slash or glob (e.g. `src/vendor/*`) match by path.

## CI (GitHub Actions)

```yaml
name: commitguard
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx commitguard scan
```

## A secret already landed in history?

commitGuard blocks *future* commits — it does not rewrite past history. If a secret was already pushed:

1. **Rotate the key immediately.** Treat it as compromised.
2. Remove it from history with [`git filter-repo`](https://github.com/newren/git-filter-repo) or [BFG](https://rtyley.github.io/bfg-repo-cleaner/).

## Local development

```bash
npm install
npm run build
npm link          # expose `commitguard` globally
npm test          # 73 tests, node:test via tsx
```

The codebase keeps a strict calculation/action split: detection rules are pure functions (`src/rules/*`), while git, filesystem, and console I/O are isolated in the action layer (`src/git.ts`, `src/commands/*`, `src/report.ts`). This makes every rule independently testable and false-positive tuning isolated per rule.

## License

MIT
