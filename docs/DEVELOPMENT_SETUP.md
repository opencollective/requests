# Development Setup Guide

## Development Setup Tools

- **ESLint** (`eslint.config.js`): TypeScript + React rules with Prettier alignment.
- **Prettier** (`.prettierrc`): single quotes, 80-char width, 2-space indent for consistent formatting.
- **Husky + lint-staged** (`.husky/pre-commit`, `package.json`): auto-run ESLint --fix and Prettier on staged files; blocks commits on errors.
- **VS Code config** (`.vscode/settings.json`, `.vscode/extensions.json`): enables format-on-save with the ESLint and Prettier extensions.

## Package Manager

- Use `pnpm install` to pull dependencies and `pnpm prepare` to ensure Husky hooks are active.
- Pre-commit hook flow: write code → `git add` → `git commit` (Husky runs checks) → `git push`.

## Linting & Formatting

- `pnpm lint` for validation, `pnpm lint:fix` to auto-correct, `pnpm format` to format all files, and `pnpm format:check` to verify formatting.
- Troubleshooting: rerun `pnpm lint:fix`/`pnpm format`, confirm ESLint/Prettier VS Code extensions, and check Husky via `npx husky --version`.

## Commands

```bash
pnpm lint          # Check for linting issues
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format all files with Prettier
pnpm format:check  # Check if files are properly formatted
pnpm dev           # Start development server
pnpm build         # Build for production
```
