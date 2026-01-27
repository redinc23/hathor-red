# Hathor Music Platform - Production Deployment Checklist

## 🎯 Overview

This document provides a step-by-step checklist for deploying the Hathor Music Platform to production. Each item includes specific commands and verification steps.

---

## Phase 1: Local Preparation

### 1.1 Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-org/hathor-red.git
cd hathor-red

# Create production environment file
cp .env.example .env.production

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env.production
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env.production
```

- [ ] Repository cloned
- [ ] `.env.production` created
- [ ] JWT_SECRET generated (64-byte random string)
- [ ] DB_PASSWORD generated (secure random string)

### 1.2 Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install production security packages
npm install helmet express-rate-limit express-validator winston
```

- [ ] Root dependencies installed
- [ ] Client dependencies installed
- [ ] Security packages installed (helmet, rate-limit, validator)
- [ ] Logging package installed (winston)

### 1.3 Build Frontend
```bash
# Build the React production bundle
cd client
npm run build
cd ..

# Verify build output
ls -la client/build/
```

- [ ] React production build completed
- [ ] Build output exists in `client/build/`
- [ ] No build errors

### 1.4 Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

- [ ] All unit tests passing
- [ ] Test coverage acceptable (aim for >80%)
- [ ] No security vulnerabilities in test results

---

## Phase 2: Security Hardening

### 2.1 Add Helmet.js (Security Headers)

**File:** `server/index.js`

Add after line 5:
```javascript
const helmet = require('helmet');
```

Add after `app.use(express.urlencoded({ extended: true }));`:
```javascript
// Security headers
app.use(helmet());
```

- [ ] Helmet imported
- [ ] Helmet middleware added
- [ ] Security headers verified in response

### 2.2 Add Rate Limiting

**File:** `server/index.js`

Add import:
```javascript
const rateLimit = require('express-rate-limit');
```

Add middleware:
```javascript
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth-specific rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

- [ ] Rate limiter imported
- [ ] General rate limit configured (100 req/15min)
- [ ] Auth rate limit configured (10 req/hour)
- [ ] Rate limiting tested and verified

### 2.3 Add Input Validation

**Create:** `server/middleware/validation.js`
```javascript
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = { validate, registerValidation, loginValidation };
```

**Update:** `server/routes/auth.js` to use validation:
```javascript
const { registerValidation, loginValidation, validate } = require('../middleware/validation');

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
```

- [ ] Validation middleware created
- [ ] Register validation rules defined
- [ ] Login validation rules defined
- [ ] Auth routes updated with validation
- [ ] Validation tested with invalid inputs

---

## Phase 3: Docker Configuration

### 3.1 Create Dockerfile

**Create:** `Dockerfile`
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci
RUN cd client && npm ci
COPY . .
RUN cd client && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server
COPY --from=builder /app/database ./database
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
```

- [ ] Dockerfile created
- [ ] Multi-stage build configured
- [ ] Non-root user configured
- [ ] Production dependencies only

### 3.2 Create Docker Compose

**Create:** `docker-compose.yml` (see ARCHITECTURE.md for full content)

- [ ] docker-compose.yml created
- [ ] PostgreSQL service configured
- [ ] Redis service configured
- [ ] App service configured
- [ ] Nginx service configured (optional)
- [ ] Health checks configured
- [ ] Volumes configured

### 3.3 Test Docker Build
```bash
# Build the image
docker build -t hathor-music:latest .

# Test locally
docker-compose up -d

# Verify services
docker-compose ps
docker-compose logs

# Test health endpoint
curl http://localhost:5000/api/health
```

- [ ] Docker image builds successfully
- [ ] All containers start
- [ ] Health check returns OK
- [ ] No container restart loops

---

## Phase 4: CI/CD Pipeline

### 4.1 Create GitHub Actions Workflow

**Create:** `.github/workflows/ci.yml` (see ARCHITECTURE.md for full content)

- [ ] `.github/workflows/` directory created
- [ ] ci.yml workflow file created
- [ ] Test job configured
- [ ] Build job configured
- [ ] Deploy job configured (optional)

### 4.2 Configure GitHub Secrets
In GitHub Repository Settings > Secrets:

- [ ] `JWT_SECRET` - Production JWT secret
- [ ] `DB_PASSWORD` - Production database password
- [ ] `REDIS_PASSWORD` - Production Redis password (if using)
- [ ] `DOCKER_USERNAME` - Docker Hub username (if using)
- [ ] `DOCKER_PASSWORD` - Docker Hub password (if using)

### 4.3 Test CI Pipeline
```bash
# Push to trigger CI
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

- [ ] CI workflow triggers on push
- [ ] All tests pass in CI
- [ ] Docker image builds in CI
- [ ] Deploy step executes (if configured)

---

## Phase 5: Database Setup

### 5.1 Provision PostgreSQL Database

**Option A: Managed Database (Recommended)**
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- DigitalOcean Managed Databases
- Heroku Postgres

**Option B: Self-Managed**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE USER hathor_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE hathor_music OWNER hathor_user;
GRANT ALL PRIVILEGES ON DATABASE hathor_music TO hathor_user;
\q
```

- [ ] PostgreSQL instance provisioned
- [ ] Database created
- [ ] User created with proper permissions
- [ ] Connection tested

### 5.2 Run Database Schema
```bash
# Apply schema
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/schema.sql

# Verify tables
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt"
```

- [ ] Schema applied successfully
- [ ] All 8 tables created
- [ ] Indexes created
- [ ] Foreign keys verified

### 5.3 (Optional) Seed Initial Data
```bash
# Run seed script
npm run db:setup
```

- [ ] Sample data seeded (if needed)
- [ ] Admin user created (if needed)

---

## Phase 6: Redis Setup

### 6.1 Provision Redis Instance

**Option A: Managed Redis (Recommended)**
- AWS ElastiCache
- Google Cloud Memorystore
- Azure Cache for Redis
- Redis Cloud
- Heroku Redis

**Option B: Self-Managed**
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: bind 0.0.0.0
# Set: requirepass your-redis-password
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis
```

- [ ] Redis instance provisioned
- [ ] Password configured (if required)
- [ ] Connection tested
- [ ] Memory limits configured

### 6.2 Test Redis Connection
```bash
# Test connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Should return: PONG
```

- [ ] Redis connection successful
- [ ] Authentication working

---

## Phase 7: Server Deployment

### 7.1 Provision Server

**Option A: Container Platform**
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku

**Option B: Virtual Private Server**
- AWS EC2
- Google Compute Engine
- Azure VMs
- DigitalOcean Droplets
- Linode

Minimum Requirements:
- 2 vCPUs
- 4 GB RAM
- 20 GB SSD

- [ ] Server provisioned
- [ ] SSH access configured
- [ ] Firewall rules set (80, 443, 22)

### 7.2 Install Dependencies (VPS Only)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Current user added to docker group

### 7.3 Deploy Application
```bash
# Clone repository
git clone https://github.com/your-org/hathor-red.git
cd hathor-red

# Create .env file
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker compose up -d

# Verify deployment
docker compose ps
curl http://localhost:5000/api/health
```

- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Containers started
- [ ] Health check passing

---

## Phase 8: Domain & SSL

### 8.1 Configure DNS
```
# A Record
hathor.yourdomain.com -> YOUR_SERVER_IP

# AAAA Record (if IPv6)
hathor.yourdomain.com -> YOUR_SERVER_IPv6
```

- [ ] Domain registered
- [ ] DNS A record configured
- [ ] DNS propagation verified

### 8.2 Install SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d hathor.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

- [ ] SSL certificate obtained
- [ ] Certificate auto-renewal configured
- [ ] HTTPS working

### 8.3 Configure Nginx (if not using Docker)
```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/hathor

# Enable site
sudo ln -s /etc/nginx/sites-available/hathor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

- [ ] Nginx installed
- [ ] Reverse proxy configured
- [ ] WebSocket upgrade configured
- [ ] SSL configured in Nginx

---

## Phase 9: Monitoring & Logging

### 9.1 Configure Logging
```bash
# Create logs directory
mkdir -p logs

# Verify logging works
docker compose logs -f app
```

- [ ] Logs directory created
- [ ] Application logs visible
- [ ] Error logs captured

### 9.2 Set Up Monitoring (Optional)
**Options:**
- Datadog
- New Relic
- Sentry
- Prometheus + Grafana

```bash
# Example: Add Sentry DSN
echo "SENTRY_DSN=https://xxx@sentry.io/xxx" >> .env

# Install Sentry SDK
npm install @sentry/node
```

- [ ] Monitoring service configured
- [ ] Error tracking enabled
- [ ] Alerts configured

### 9.3 Set Up Backups
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $BACKUP_DIR/hathor_$DATE.sql
gzip $BACKUP_DIR/hathor_$DATE.sql

# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

- [ ] Backup script created
- [ ] Backup cron job configured
- [ ] Backup restoration tested
- [ ] Backup storage configured (S3, etc.)

---

## Phase 10: Final Verification

### 10.1 Functional Tests
```bash
# Test health endpoint
curl https://hathor.yourdomain.com/api/health

# Test registration
curl -X POST https://hathor.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test1234!"}'

# Test login
curl -X POST https://hathor.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test1234!"}'
```

- [ ] Health endpoint returns 200
- [ ] User registration works
- [ ] User login works
- [ ] JWT token returned

### 10.2 Feature Tests
- [ ] Song upload works
- [ ] Audio streaming works
- [ ] Playlist creation works
- [ ] AI playlist generation works
- [ ] Listening rooms work
- [ ] WebSocket connections work
- [ ] Cross-device sync works

### 10.3 Performance Tests
```bash
# Load test with Apache Bench
ab -n 1000 -c 50 https://hathor.yourdomain.com/api/health

# Check response times
# Aim for: <200ms average, <500ms 99th percentile
```

- [ ] Response times acceptable
- [ ] No server errors under load
- [ ] Database connections stable
- [ ] Memory usage stable

### 10.4 Security Tests
```bash
# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=hathor.yourdomain.com

# Security headers check
curl -I https://hathor.yourdomain.com
# Verify: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
```

- [ ] SSL Labs grade A or higher
- [ ] Security headers present
- [ ] No mixed content warnings
- [ ] Rate limiting working

---

## 🎉 Go Live Checklist

Before announcing the platform is live:

- [ ] All phases above completed
- [ ] Production environment stable for 24+ hours
- [ ] Error rate < 1%
- [ ] Response times acceptable
- [ ] Backups verified
- [ ] Monitoring active
- [ ] Support/contact information ready
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] User documentation available

---

## 📞 Emergency Procedures

### Application Down
```bash
# Check container status
docker compose ps

# Restart application
docker compose restart app

# View logs
docker compose logs -f app --tail=100
```

### Database Issues
```bash
# Check database connection
docker compose exec app node -e "require('./server/config/database').query('SELECT 1')"

# Restart database
docker compose restart postgres
```

### High Load
```bash
# Scale application (if using orchestrator)
docker compose up -d --scale app=3

# Check resource usage
docker stats
```

---

**Document Version:** 1.0
**Last Updated:** January 2026
