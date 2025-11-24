# Playwright CI Guide

This document explains how the Playwright end-to-end suite runs in CI and how
to provide the secret test seed data file needed by the tests.

## Overview

- The workflow lives in `.github/workflows/playwright.yml`.
- It executes on every pull request and runs `pnpm test`, which maps to
  `playwright test`. Chromium runs in headless mode (Playwright's default).
- Before the test run, the workflow reconstructs `tests/fixtures/seed-data.json`
  from a GitHub secret so we do not commit the real credentials to the repo.
- A Playwright HTML report is uploaded as the `playwright-report` artifact.

## Preparing the seed data secret

1. Generate a local copy of `tests/fixtures/seed-data.json` using the values
   you want CI to exercise. The `scripts/generate-seed-data.ts` helper can be
   used if needed.
2. Base64-encode the file so it survives transit through GitHub Secrets. On macOS:
   ```bash
   base64 -i tests/fixtures/seed-data.json | pbcopy
   ```
   On Linux:
   ```bash
   base64 -w0 tests/fixtures/seed-data.json | xclip -selection clipboard
   ```
3. In GitHub, navigate to **Settings → Secrets and variables → Actions** for
   this repository and create a new secret named
   `PLAYWRIGHT_SEED_DATA_JSON`. Paste the base64 string as the value.

> The secret only needs to contain one line (no newline at the end). If your
> terminal adds a newline automatically, GitHub Secrets trims it safely.

## How the workflow consumes the secret

During the `Restore seed data fixture` step, the workflow:

1. Fails fast if `PLAYWRIGHT_SEED_DATA_JSON` is missing.
2. Creates the `tests/fixtures` directory if it does not exist.
3. Decodes the secret and writes the bytes to `tests/fixtures/seed-data.json`.

This mirrors the layout expected by `tests/test-moderator-request.spec.ts`,
which reads the file from that path. When you run tests locally you can keep a
different `tests/fixtures/seed-data.json`; the workflow only overwrites the
file during CI.

## Local verification

To match the CI behavior locally:

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm test
```

Ensure your local `tests/fixtures/seed-data.json` mirrors the structure of the
secret file so the test suite interacts with the same data shape as CI.
