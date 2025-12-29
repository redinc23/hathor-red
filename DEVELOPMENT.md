# 🛠️ Development Setup Guide

This comprehensive guide will walk you through setting up the Hathor Music Platform on your local machine for development.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Common Tasks](#common-tasks)

---

## Prerequisites

Before you begin, you need to install the following software on your machine:

### 1. Node.js (v18 or higher)

**Why:** JavaScript runtime for running the application.

#### Installation:

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

**Windows:**
```bash
# Download installer from https://nodejs.org/
# Or use Chocolatey
choco install nodejs
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version  # Should show v18.x or higher
npm --version   # Should show 9.x or higher
```

---

### 2. PostgreSQL (v13 or higher)

**Why:** Primary database for storing users, songs, playlists, and rooms.

#### Installation:

**macOS:**
```bash
# Using Homebrew
brew install postgresql@16
brew services start postgresql@16

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**
```bash
# Download installer from https://www.postgresql.org/download/windows/
# During installation, remember the password you set for the postgres user
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Verify installation:**
```bash
psql --version  # Should show PostgreSQL 13.x or higher
```

**Set up PostgreSQL user (if needed):**
```bash
# macOS/Linux - Connect as postgres user
sudo -u postgres psql

# Inside psql, set password for postgres user
ALTER USER postgres WITH PASSWORD 'your_secure_password';
\q

# Windows - Use pgAdmin or psql with the password set during installation
```

---

### 3. Redis (v6 or higher)

**Why:** Used for caching, session management, and real-time features.

#### Installation:

**macOS:**
```bash
# Using Homebrew
brew install redis
brew services start redis
```

**Windows:**
```bash
# Redis is not officially supported on Windows, but you can use WSL2
# Or download Redis for Windows from: https://github.com/microsoftarchive/redis/releases

# Alternative: Use Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Verify installation:**
```bash
redis-cli --version  # Should show redis-cli 6.x or higher
redis-cli ping       # Should return "PONG"
```

---

### 4. Git

**Why:** Version control for cloning and managing the repository.

**Installation:**
```bash
# macOS (usually pre-installed)
git --version

# If not installed
brew install git

# Windows
# Download from https://git-scm.com/download/win
# Or use: choco install git

# Linux
sudo apt install git
```

**Verify installation:**
```bash
git --version  # Should show git version 2.x or higher
```

---

## Installation

Follow these steps to set up the project:

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/hathor-red.git
cd hathor-red
```

### Step 2: Install Dependencies

Install both backend and frontend dependencies:

```bash
# Install backend dependencies (in root directory)
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

**Expected output:** You should see `node_modules` folders created in both the root and `client` directories.

---

### Step 3: Set Up PostgreSQL Database

#### 3.1 Create the Database

```bash
# Option 1: Using createdb command
createdb hathor_music

# Option 2: Using psql
psql -U postgres
CREATE DATABASE hathor_music;
\q
```

#### 3.2 Apply Database Schema

```bash
# Run the schema script
psql -U postgres -d hathor_music -f database/schema.sql

# If you need to specify host/port
psql -h localhost -p 5432 -U postgres -d hathor_music -f database/schema.sql
```

**Expected output:** You should see SQL statements executing with messages like:
```
CREATE TABLE
CREATE INDEX
```

#### 3.3 (Optional) Load Sample Data

```bash
# Load seed data for testing
psql -U postgres -d hathor_music -f database/seed.sql
```

#### 3.4 Verify Database Setup

```bash
# Connect to the database
psql -U postgres -d hathor_music

# List all tables
\dt

# You should see tables like: users, songs, playlists, rooms, etc.
\q
```

---

### Step 4: Configure Environment Variables

#### 4.1 Create .env File

```bash
# Copy the example environment file
cp .env.example .env
```

#### 4.2 Edit .env File

Open `.env` in your text editor and update the following:

```bash
# Required Changes:
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=your_super_secret_jwt_key_change_this

# Optional Changes (if using non-default settings):
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hathor_music
DB_USER=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
```

**Generate a secure JWT secret:**
```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

### Step 5: Verify All Services Are Running

Before starting the application, make sure all required services are running:

```bash
# Check PostgreSQL
pg_isready
# Should output: accepting connections

# Check Redis
redis-cli ping
# Should return: PONG

# Check if ports are available
# macOS/Linux
lsof -i :5000  # Backend port (should be empty)
lsof -i :3000  # Frontend port (should be empty)

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 5000,3000 -ErrorAction SilentlyContinue
# Should be empty
```

---

## Running the Application

### Option 1: Run Both Frontend and Backend Together (Recommended)

```bash
# From the root directory
npm run dev
```

This will start:
- **Backend server** on `http://localhost:5000`
- **Frontend development server** on `http://localhost:3000`

**Expected output:**
```
[server] Server running on port 5000
[server] PostgreSQL connected
[server] Redis connected
[client] webpack compiled successfully
[client] Compiled successfully!
```

### Option 2: Run Frontend and Backend Separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

### Option 3: Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

---

## Verification

### Automated Verification

Use the verification script to check if your environment is set up correctly:

```bash
# Run the verification script
./verify-setup.sh
```

This script will check:
- ✅ Node.js, npm, PostgreSQL, and Redis installation
- ✅ Service status (PostgreSQL and Redis running)
- ✅ Environment configuration (.env file)
- ✅ Dependencies installation
- ✅ Database creation and schema
- ✅ Port availability

### Manual Verification

#### 1. Check Backend Health

Open your browser or use curl:

```bash
# Health check endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

#### 2. Access Frontend

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the Hathor Music Platform login/registration page.

#### 3. Test User Registration

1. Click "Sign Up"
2. Fill in the registration form:
   - Username: testuser
   - Email: test@example.com
   - Password: Test123!
3. Submit the form
4. You should be redirected to the home page

#### 4. Verify Database Connection

```bash
# Connect to database
psql -U postgres -d hathor_music

# Check if user was created
SELECT username, email FROM users;

# Exit
\q
```

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Possible causes:**
- PostgreSQL is not running
- Incorrect database credentials in `.env`
- Database doesn't exist

**Solutions:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Windows - Use Services app or pg_ctl

# Verify database exists
psql -U postgres -l | grep hathor_music

# If not, create it
createdb hathor_music
psql -U postgres -d hathor_music -f database/schema.sql
```

---

### Issue: "Redis connection failed"

**Possible causes:**
- Redis is not running
- Incorrect Redis host/port in `.env`

**Solutions:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Windows/Docker
docker start redis
# or
redis-server

# Test connection
redis-cli
> ping
> exit
```

---

### Issue: "Port 5000 already in use"

**Solutions:**
```bash
# Find process using port 5000
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process

# Or change the port in .env
PORT=5001
```

---

### Issue: "Module not found" errors

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For client
cd client
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

### Issue: "Cannot find database schema"

**Solutions:**
```bash
# Verify schema file exists
ls -l database/schema.sql

# Re-apply schema
psql -U postgres -d hathor_music -f database/schema.sql
```

---

### Issue: Frontend shows blank page

**Solutions:**
1. Open browser console (F12) and check for errors
2. Verify backend is running: `curl http://localhost:5000/api/health`
3. Check proxy configuration in `client/package.json`
4. Clear browser cache and reload
5. Check if `CLIENT_URL` in `.env` matches your frontend URL

---

## Development Workflow

### Hot Reload

Both frontend and backend support hot reload:
- **Frontend:** React Fast Refresh automatically reloads on file changes
- **Backend:** Nodemon restarts the server on file changes

### Making Changes

1. **Backend changes:** Edit files in `/server` directory
   - Controllers: `/server/controllers`
   - Routes: `/server/routes`
   - Middleware: `/server/middleware`

2. **Frontend changes:** Edit files in `/client/src` directory
   - Components: `/client/src/components`
   - Pages: `/client/src/pages`
   - Styles: `/client/src/*.css`

3. **Database changes:**
   ```bash
   # Edit database/schema.sql
   # Then re-apply
   psql -U postgres -d hathor_music -f database/schema.sql
   ```

### Viewing Logs

**Backend logs:** Check the terminal running `npm run server` or `npm run dev`

**Frontend logs:** Open browser DevTools (F12) → Console tab

**PostgreSQL logs:**
```bash
# macOS
tail -f /opt/homebrew/var/log/postgresql@16.log

# Linux
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

**Redis logs:**
```bash
# macOS
tail -f /opt/homebrew/var/log/redis.log

# Linux
sudo tail -f /var/log/redis/redis-server.log
```

---

## Testing

### Manual Testing

1. **Test user authentication:**
   - Register a new user
   - Login with credentials
   - Verify JWT token is stored

2. **Test music playback:**
   - Upload a song (if upload feature is enabled)
   - Play a song from the library
   - Adjust volume, speed, pitch

3. **Test AI playlist generation:**
   - Use the AI playlist generator
   - Enter a prompt like "upbeat workout songs"
   - Verify playlist is created

4. **Test listening rooms:**
   - Create a new room
   - Join from another browser/tab
   - Test synchronized playback

### API Testing with curl

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get songs (requires JWT token)
curl -X GET http://localhost:5000/api/songs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Common Tasks

### Reset Database

```bash
# Drop and recreate database
dropdb hathor_music
createdb hathor_music
psql -U postgres -d hathor_music -f database/schema.sql
psql -U postgres -d hathor_music -f database/seed.sql
```

### Clear Redis Cache

```bash
redis-cli FLUSHALL
```

### Update Dependencies

```bash
# Update backend dependencies
npm update

# Update frontend dependencies
cd client
npm update
cd ..
```

### Build for Production

```bash
# Build frontend
cd client
npm run build
cd ..

# The build output will be in client/build/
# Configure your server to serve these static files
```

### View Database Records

```bash
# Connect to database
psql -U postgres -d hathor_music

# Common queries
SELECT * FROM users;
SELECT * FROM songs;
SELECT * FROM playlists;
SELECT * FROM rooms;

\q
```

---

## Additional Resources

- **[README.md](README.md)** - Project overview and features
- **[API.md](API.md)** - Complete API documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[QUICKSTART.md](QUICKSTART.md)** - Abbreviated quick start guide

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review error messages in terminal/console carefully
3. Verify all services (PostgreSQL, Redis) are running
4. Check that environment variables are correctly set
5. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)

---

## Quick Reference Commands

```bash
# Start everything
npm run dev

# Install all dependencies
npm run install-all

# Backend only
npm run server

# Frontend only
npm run client

# Build production
npm run build

# Start production
npm start

# Database commands
createdb hathor_music
psql -U postgres -d hathor_music -f database/schema.sql
psql -U postgres -d hathor_music

# Redis commands
redis-server
redis-cli ping
redis-cli

# Check service status
pg_isready
redis-cli ping
curl http://localhost:5000/api/health
```

---

**Happy Coding! 🎵**

If you have suggestions for improving this guide, please submit a pull request or open an issue.
