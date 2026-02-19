.PHONY: setup fmt lint test ci dev build docker-up docker-down

# One-command dev setup: copy env template, install deps, done.
setup:
	@./scripts/setup.sh

# Auto-fix lint issues (eslint --fix)
fmt:
	@./scripts/fmt.sh

# Lint with zero warnings — same check as CI
lint:
	@./scripts/lint.sh

# Run the full Jest test suite
test:
	@./scripts/test.sh

# What CI runs: lint then test. Must be green before every push.
ci: lint test

# Start the dev server (app + client via concurrently)
dev:
	@pnpm run dev

# Production build (client bundle)
build:
	@pnpm run build

# Bring up Postgres + Redis + Nginx via Docker Compose
docker-up:
	@docker compose up -d postgres redis nginx

# Tear down Docker services
docker-down:
	@docker compose down
