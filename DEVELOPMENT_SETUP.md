# Development Setup Guide

This project uses ESLint, Prettier, and Husky to maintain code quality and consistency.

## Tools

### ESLint

- **Configuration**: `eslint.config.js`
- **Purpose**: Code linting and error detection
- **Rules**: Includes TypeScript, React, and Prettier integration

### Prettier

- **Configuration**: `.prettierrc`
- **Purpose**: Code formatting
- **Settings**: Single quotes, 80 character line width, 2 space indentation

### Husky

- **Configuration**: `.husky/pre-commit`
- **Purpose**: Git hooks for automated quality checks
- **Pre-commit**: Runs lint-staged to format and lint code before commits

### Lint-staged

- **Configuration**: `package.json` (lint-staged section)
- **Purpose**: Runs linting and formatting only on staged files

## Available Scripts

```bash
# Linting
pnpm lint          # Check for linting issues
pnpm lint:fix      # Auto-fix linting issues

# Formatting
pnpm format        # Format all files with Prettier
pnpm format:check  # Check if files are properly formatted

# Development
pnpm dev           # Start development server
pnpm build         # Build for production
```

## VS Code Setup

The project includes VS Code configuration files:

- `.vscode/settings.json` - Editor settings for format on save
- `.vscode/extensions.json` - Recommended extensions

**Required Extensions:**

- Prettier - Code formatter
- ESLint

## Git Hooks

The pre-commit hook automatically:

1. Runs ESLint with auto-fix on staged TypeScript/JavaScript files
2. Formats staged files with Prettier
3. Prevents commits if there are unfixable errors

## Workflow

1. **Development**: Write code normally
2. **Staging**: `git add` your changes
3. **Commit**: `git commit` - Husky will automatically format and lint
4. **Push**: If all checks pass, your code is ready to push

## Troubleshooting

### Linting Errors

- Run `pnpm lint:fix` to auto-fix most issues
- Check the ESLint configuration in `eslint.config.js`

### Formatting Issues

- Run `pnpm format` to format all files
- Ensure Prettier extension is installed in VS Code

### Pre-commit Hook Issues

- Check that Husky is properly installed: `npx husky --version`
- Verify the `.husky/pre-commit` file exists and is executable
- Run `pnpm prepare` to reinstall Husky if needed
