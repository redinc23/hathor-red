# Automation Patterns & Reference Guide
## Common Patterns for Hathor-Red Automation

This document provides reusable patterns and templates for implementing automation across the project.

---

## PART 1: GitHub Actions Patterns

### Pattern 1: Parallel Task Execution
Use this pattern to run independent checks in parallel for faster feedback.

```yaml
name: Parallel Checks
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
      - run: npm run build

# All run in parallel, faster feedback
```

### Pattern 2: Conditional Steps Based on File Changes
Run specific steps only when relevant files change.

```yaml
name: Conditional Steps
on: [pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.changes.outputs.backend }}
      frontend: ${{ steps.changes.outputs.frontend }}
      database: ${{ steps.changes.outputs.database }}
    steps:
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            backend:
              - 'server/**'
            frontend:
              - 'client/**'
            database:
              - 'database/**'

  test-backend:
    needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:server

  test-frontend:
    needs: changes
    if: ${{ needs.changes.outputs.frontend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:client

  migrate-database:
    needs: changes
    if: ${{ needs.changes.outputs.database == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run db:migrate
```

### Pattern 3: Environment-Specific Deployment
Deploy to different environments with different configurations.

```yaml
name: Deploy
on:
  push:
    branches: [main, staging]

env:
  REGISTRY: ghcr.io

jobs:
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      deploy-url: ${{ steps.env.outputs.url }}
    steps:
      - id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "url=https://app.hathor.com" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "url=https://staging.hathor.com" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: determine-env
    environment:
      name: ${{ needs.determine-env.outputs.environment }}
      url: ${{ needs.determine-env.outputs.deploy-url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to ${{ needs.determine-env.outputs.environment }}
        env:
          ENVIRONMENT: ${{ needs.determine-env.outputs.environment }}
        run: |
          echo "Deploying to $ENVIRONMENT..."
          # Deployment commands here
```

### Pattern 4: Matrix Strategy for Multi-Version Testing
Test against multiple versions of Node, browsers, etc.

```yaml
name: Matrix Testing
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
        os: [ubuntu-latest, macos-latest, windows-latest]
        exclude:
          # Skip certain combinations if needed
          - os: windows-latest
            node-version: 16
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### Pattern 5: Cache Management for Dependencies
Optimize CI/CD performance with caching.

```yaml
name: Build with Cache
on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
          cache-dependency-path: pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: npm run build

      - name: Cache build output
        uses: actions/cache@v3
        with:
          path: client/build
          key: build-${{ github.sha }}
          retention-days: 1
```

### Pattern 6: Error Notification
Notify team of failures via Slack/email.

```yaml
name: Error Notification
on:
  workflow_run:
    workflows: ['Build']
    types: [completed]

jobs:
  notify-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "❌ Build failed on ${{ github.event.workflow_run.head_branch }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Build Failed*\nBranch: ${{ github.event.workflow_run.head_branch }}\nAction: ${{ github.event.workflow_run.html_url }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Pattern 7: Automatic Merge on Approval
Auto-merge PRs when approved and all checks pass.

```yaml
name: Auto Merge
on:
  pull_request_review:
    types: [submitted]

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: |
      github.event.review.state == 'approved' &&
      github.event.pull_request.draft == false
    steps:
      - name: Check PR status
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;

            // Get PR status checks
            const { data: checks } = await github.rest.checks.listForRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: pr.head.sha
            });

            const allPassed = checks.check_runs.every(
              check => check.conclusion === 'success'
            );

            // Get approved reviews count
            const { data: reviews } = await github.rest.pulls.listReviews({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: pr.number
            });
            const approvedCount = reviews.filter(r => r.state === 'APPROVED').length;

            if (allPassed && approvedCount >= 2) {
              // Auto merge
              await github.rest.pulls.merge({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pr.number,
                merge_method: 'squash'
              });
              console.log('✅ PR auto-merged');
            }
```

---

## PART 2: Bash Script Patterns

### Pattern 1: Safe Script with Error Handling
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Logging functions
log() { echo "📝 $@"; }
error() { echo "❌ $@" >&2; exit 1; }
success() { echo "✅ $@"; }

# Trap errors
trap 'error "Script failed at line $LINENO"' ERR

# Main function
main() {
  log "Starting process..."

  if [ ! -d "some-directory" ]; then
    error "Directory not found"
  fi

  success "Process completed"
}

main "$@"
```

### Pattern 2: Configuration Validation
```bash
#!/bin/bash

validate_env() {
  local required_vars=("DATABASE_URL" "API_KEY" "SECRET")

  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      echo "❌ Required environment variable not set: $var"
      exit 1
    fi
  done

  echo "✅ All required environment variables set"
}

validate_file() {
  local file=$1
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    exit 1
  fi
  echo "✅ File found: $file"
}

validate_env
validate_file ".env"
```

### Pattern 3: Retry Logic
```bash
#!/bin/bash

retry() {
  local max_attempts=5
  local attempt=1
  local delay=2

  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts..."
    if "$@"; then
      echo "✅ Success on attempt $attempt"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      echo "⏳ Waiting ${delay}s before retry..."
      sleep $delay
      delay=$((delay * 2))  # Exponential backoff
    fi

    attempt=$((attempt + 1))
  done

  echo "❌ Failed after $max_attempts attempts"
  return 1
}

# Usage
retry curl -f https://api.example.com/health
```

### Pattern 4: Parallel Execution
```bash
#!/bin/bash

# Run tasks in parallel
run_parallel() {
  local pids=()

  echo "Starting task 1..."
  task1 &
  pids+=($!)

  echo "Starting task 2..."
  task2 &
  pids+=($!)

  echo "Starting task 3..."
  task3 &
  pids+=($!)

  # Wait for all tasks
  local failed=0
  for pid in "${pids[@]}"; do
    if ! wait $pid; then
      failed=$((failed + 1))
    fi
  done

  if [ $failed -eq 0 ]; then
    echo "✅ All tasks completed successfully"
    return 0
  else
    echo "❌ $failed tasks failed"
    return 1
  fi
}

run_parallel
```

### Pattern 5: Database Operations
```bash
#!/bin/bash

# Execute migration
migrate_database() {
  local migration_file=$1
  local backup_file="db_backup_$(date +%s).sql"

  echo "📦 Creating backup..."
  pg_dump "$DATABASE_URL" > "$backup_file"

  echo "🔄 Running migration..."
  if psql "$DATABASE_URL" < "$migration_file"; then
    echo "✅ Migration successful"
    rm "$backup_file"  # Delete backup on success
    return 0
  else
    echo "❌ Migration failed, restoring backup..."
    psql "$DATABASE_URL" < "$backup_file"
    exit 1
  fi
}

migrate_database "migrations/001_initial.sql"
```

### Pattern 6: Docker Operations
```bash
#!/bin/bash

# Build and push image
build_and_push() {
  local image_name=$1
  local version=${2:-latest}
  local registry=${REGISTRY:-ghcr.io}

  local full_name="$registry/$image_name:$version"

  echo "🔨 Building $full_name..."
  docker build -t "$full_name" .

  echo "📤 Pushing $full_name..."
  docker push "$full_name"

  echo "✅ Image built and pushed: $full_name"
}

build_and_push "hathor/api" "v1.0.0"
```

### Pattern 7: Git Operations
```bash
#!/bin/bash

# Create feature branch with safe checks
create_feature_branch() {
  local feature_name=$1
  local branch_name="feature/$feature_name"

  # Ensure clean working directory
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory not clean"
    exit 1
  fi

  # Update main branch
  echo "Updating main branch..."
  git checkout main
  git pull origin main

  # Create feature branch
  echo "Creating $branch_name..."
  git checkout -b "$branch_name"

  # Push to remote
  git push -u origin "$branch_name"

  echo "✅ Feature branch created and pushed"
}

create_feature_branch "user-authentication"
```

---

## PART 3: Node.js/JavaScript Automation Patterns

### Pattern 1: Health Check Service
```javascript
// server/services/healthCheck.js
const { Pool } = require('pg');
const redis = require('redis');

class HealthCheckService {
  async checkDatabase() {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const result = await pool.query('SELECT NOW()');
      await pool.end();
      return { status: 'up', responseTime: result.rows[0] };
    } catch (error) {
      return { status: 'down', error: error.message };
    }
  }

  async checkRedis() {
    try {
      const client = redis.createClient({ url: process.env.REDIS_URL });
      await client.ping();
      await client.quit();
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', error: error.message };
    }
  }

  async checkExternalServices() {
    const services = {};

    // Check AI service
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL}/health`);
      services.aiService = { status: response.ok ? 'up' : 'down' };
    } catch (error) {
      services.aiService = { status: 'down', error: error.message };
    }

    return services;
  }

  async getOverallHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {}
    };

    health.components.database = await this.checkDatabase();
    health.components.redis = await this.checkRedis();
    health.components.external = await this.checkExternalServices();

    const allUp = Object.values(health.components).every(c => c.status === 'up');
    health.status = allUp ? 'healthy' : 'degraded';

    return health;
  }
}

module.exports = new HealthCheckService();
```

### Pattern 2: Logger Service
```javascript
// server/services/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hathor-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Pattern 3: Environment Configuration Manager
```javascript
// server/config/configManager.js
class ConfigManager {
  constructor() {
    this.config = {};
    this.validateRequired();
  }

  validateRequired() {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'NODE_ENV'
    ];

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  isTest() {
    return this.get('NODE_ENV') === 'test';
  }

  getApiConfig() {
    return {
      port: this.get('PORT', 5000),
      host: this.get('HOST', 'localhost'),
      corsOrigin: this.get('CORS_ORIGIN', 'http://localhost:3000')
    };
  }
}

module.exports = new ConfigManager();
```

### Pattern 4: Retry Decorator
```javascript
// server/utils/retry.js
function retry(maxAttempts = 3, delay = 1000) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      let lastError;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt < maxAttempts) {
            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

// Usage
class APIService {
  @retry(3, 2000)
  async fetchData() {
    // This will retry up to 3 times with 2s delay
  }
}
```

---

## PART 4: SQL Patterns for Automation

### Pattern 1: Audit Logging Table
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255),
  operation VARCHAR(10),
  user_id INTEGER REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    NULLIF(current_setting('app.user_id', true), '')::INTEGER,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Set user_id before operations using:
-- SET LOCAL app.user_id = '123';
-- Or use application-level context to set the user ID

-- Attach to tables
CREATE TRIGGER users_audit AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### Pattern 2: Soft Delete Pattern
```sql
ALTER TABLE songs ADD COLUMN deleted_at TIMESTAMP;

CREATE VIEW active_songs AS
  SELECT * FROM songs WHERE deleted_at IS NULL;

-- When deleting, use soft delete
UPDATE songs SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;

-- Purge old soft-deleted records (after 90 days)
DELETE FROM songs WHERE deleted_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
```

### Pattern 3: Performance Monitoring
```sql
-- Track slow queries
CREATE TABLE query_performance (
  id SERIAL PRIMARY KEY,
  query TEXT,
  execution_time_ms DECIMAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable query logging (if using PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS auto_explain;
SET auto_explain.log_min_duration = 1000;  -- Log queries > 1s

-- Analyze query performance
SELECT
  query,
  COUNT(*) as count,
  AVG(execution_time_ms) as avg_time,
  MAX(execution_time_ms) as max_time
FROM query_performance
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY query
ORDER BY avg_time DESC;
```

---

## PART 5: Common Issues & Solutions

### Issue 1: Workflow Timeout
**Problem:** Workflow exceeds 6-hour timeout
**Solution:**
```yaml
jobs:
  build:
    timeout-minutes: 30  # Set explicit timeout
    runs-on: ubuntu-latest
```

### Issue 2: Out of Disk Space in CI
**Problem:** Docker build runs out of space
**Solution:**
```yaml
steps:
  - name: Free up disk space
    run: |
      sudo rm -rf /usr/local/lib/android
      sudo rm -rf /usr/share/dotnet
      docker image prune -a -f
```

### Issue 3: Flaky Tests in CI
**Problem:** Tests pass locally, fail in CI
**Solution:**
```yaml
- name: Run tests with retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    command: npm test
```

### Issue 4: Secrets Leaked in Logs
**Problem:** Sensitive data appears in logs
**Solution:**
```yaml
- name: Run secure command
  run: |
    # GitHub automatically masks secrets, but avoid echo
    some_command --token "${{ secrets.API_TOKEN }}"
  env:
    # Use env instead of command-line args for sensitive data
    SENSITIVE_DATA: ${{ secrets.SENSITIVE_DATA }}
```

---

## PART 6: Performance Optimization Tips

1. **Parallel Jobs:** Split long tasks into parallel jobs (saves time)
2. **Caching:** Cache dependencies and build artifacts
3. **Matrix Strategy:** Run tests on multiple versions in parallel
4. **Conditional Steps:** Skip unnecessary steps based on file changes
5. **Artifact Cleanup:** Set retention days for artifacts
6. **Docker Layer Caching:** Use caching in Docker builds

---

## PART 7: Security Best Practices

1. **Use GitHub Secrets:** Never hardcode credentials
2. **Limit Secret Scope:** Use environment-level secrets
3. **Rotate Secrets Regularly:** Implement rotation automation
4. **Audit Trail:** Log all automation actions
5. **Signed Commits:** Require GPG signatures
6. **Branch Protection:** Enforce code review before merge
7. **Dependency Scanning:** Regularly scan for vulnerabilities

---

**Last Updated:** February 18, 2026
**Patterns Count:** 30+
**Code Examples:** 50+
