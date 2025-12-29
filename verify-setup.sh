#!/bin/bash

# Hathor Music Platform - Setup Verification Script
# This script checks if all prerequisites are installed and configured correctly

echo "🎵 Hathor Music Platform - Setup Verification"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success message
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error message
error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

# Function to print warning message
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        success "Node.js $NODE_VERSION (required: v18+)"
    else
        error "Node.js version $NODE_VERSION is too old (required: v18+)"
    fi
else
    error "Node.js is not installed"
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm $NPM_VERSION"
else
    error "npm is not installed"
fi

# Check PostgreSQL
echo "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    PSQL_MAJOR=$(echo $PSQL_VERSION | cut -d'.' -f1)
    if [ "$PSQL_MAJOR" -ge 13 ]; then
        success "PostgreSQL $PSQL_VERSION (required: v13+)"
    else
        warning "PostgreSQL version $PSQL_VERSION might be too old (recommended: v13+)"
    fi
    
    # Check if PostgreSQL is running
    if pg_isready &> /dev/null; then
        success "PostgreSQL server is running"
    else
        warning "PostgreSQL server is not running (start it before running the app)"
    fi
else
    error "PostgreSQL is not installed"
fi

# Check Redis
echo "Checking Redis..."
if command -v redis-cli &> /dev/null; then
    REDIS_VERSION=$(redis-cli --version | awk '{print $2}' | cut -d'=' -f2)
    success "Redis $REDIS_VERSION"
    
    # Check if Redis is running
    if redis-cli ping &> /dev/null; then
        success "Redis server is running"
    else
        warning "Redis server is not running (start it before running the app)"
    fi
else
    error "Redis is not installed"
fi

# Check if .env file exists
echo "Checking configuration..."
if [ -f ".env" ]; then
    success ".env file exists"
    
    # Check if critical variables are set
    if grep -q "DB_PASSWORD=your_password_here" .env; then
        warning "DB_PASSWORD is still set to default in .env (update it)"
    fi
    
    if grep -q "JWT_SECRET=your_super_secret_jwt_key_change_this" .env; then
        warning "JWT_SECRET is still set to default in .env (generate a new one)"
    fi
else
    error ".env file not found (copy from .env.example)"
fi

# Check if node_modules exists in root
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    success "Backend dependencies installed"
else
    error "Backend dependencies not installed (run: npm install)"
fi

# Check if node_modules exists in client
if [ -d "client/node_modules" ]; then
    success "Frontend dependencies installed"
else
    error "Frontend dependencies not installed (run: cd client && npm install)"
fi

# Check if database exists
echo "Checking database..."
if command -v psql &> /dev/null && pg_isready &> /dev/null; then
    if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw hathor_music; then
        success "Database 'hathor_music' exists"
        
        # Check if tables exist
        TABLE_COUNT=$(psql -U postgres -d hathor_music -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        if [ "$TABLE_COUNT" -gt 0 ]; then
            success "Database schema is initialized ($TABLE_COUNT tables found)"
        else
            warning "Database exists but schema not initialized (run: psql -U postgres -d hathor_music -f database/schema.sql)"
        fi
    else
        warning "Database 'hathor_music' not found (create it with: createdb hathor_music)"
    fi
fi

# Check if required ports are available
echo "Checking ports..."
if command -v lsof &> /dev/null; then
    if lsof -Pi :5000 -sTCP:LISTEN -t &> /dev/null; then
        warning "Port 5000 (backend) is already in use"
    else
        success "Port 5000 (backend) is available"
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
        warning "Port 3000 (frontend) is already in use"
    else
        success "Port 3000 (frontend) is available"
    fi
else
    warning "Cannot check port availability (lsof not available)"
fi

# Summary
echo ""
echo "=============================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to start the application:"
    echo "  npm run dev"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Review the warnings above and fix them if needed."
    echo "You can try starting the application with:"
    echo "  npm run dev"
else
    echo -e "${RED}✗ Setup incomplete with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before running the application."
    echo "See DEVELOPMENT.md for detailed installation instructions."
fi
echo ""
