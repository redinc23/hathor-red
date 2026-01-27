#!/bin/bash
set -euo pipefail

echo "Bootstrap for huge teams"
echo "Step 1/6: Cloning repo (skip if already cloned)"
echo "Step 2/6: Installing system dependencies"
echo "Step 3/6: Setting up git hooks"
echo "Step 4/6: Starting local databases"
echo "Step 5/6: Running seed data"
echo "Step 6/6: Starting all services"

echo ""
echo "Quick-start:"
echo "  1) Ensure Node.js, npm, Docker, and Git are installed"
echo "  2) Copy .env.example to .env and fill values"
echo "  3) Run: npm run install-all"
echo "  4) Run: npm run db:setup"
echo "  5) Run: npm run dev"
echo ""
echo "Note: Customize this script for your team tooling (pnpm, docker compose, etc.)"
