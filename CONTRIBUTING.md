# Contributing Guide

Thank you for contributing! This repository is designed for large teams and consistent delivery.

## Getting Started

1. Read `README.md` and `QUICKSTART.md`
2. Copy `.env.example` to `.env` and configure values
3. Install dependencies: `npm run install-all`
4. Seed data: `npm run db:setup`
5. Start dev: `npm run dev`

## Branching & PRs

- Create a short-lived feature branch per task.
- Keep pull requests focused and small.
- Use the appropriate PR template in `.github/PULL_REQUEST_TEMPLATE/`.
- Link issues and include context, screenshots, or logs where relevant.

## Local Quality Checks

Run before opening a PR:
- `npm test`
- `npm run lint:ci` (when available)
- `npm run type-check` (when available)

## Code Style

- Follow ESLint rules and editor settings in `.vscode/`.
- Prefer small, composable functions.
- Add comments only when behavior is non-obvious.

## Security

- Never commit secrets.
- Report vulnerabilities via `SECURITY.md`.

## Commit Messages

Use clear, descriptive commits:
- `feat: add room playback sync`
- `fix: handle expired tokens in auth flow`
- `chore: update tooling`

## Need Help?

Open a draft PR or ask in team chat with context and logs.
