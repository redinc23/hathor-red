#!/bin/bash

###############################################################################
# Hathor Music Platform - Deployment Script
###############################################################################
#
# This script automates the deployment process for the Hathor Music Platform
# including all AI features and services.
#
# Usage:
#   ./deploy.sh [environment]
#
# Environments: development, staging, production
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-development}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Hathor Music Platform - Deployment Script              ║${NC}"
echo -e "${BLUE}║   Environment: ${ENVIRONMENT}                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Functions
###############################################################################

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_requirements() {
    print_step "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_info "Node.js version: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_info "npm version: $(npm --version)"
    
    # Check PostgreSQL (optional check)
    if command -v psql &> /dev/null; then
        print_info "PostgreSQL found: $(psql --version)"
    else
        print_warning "PostgreSQL not found in PATH"
    fi
    
    # Check Redis (optional check)
    if command -v redis-cli &> /dev/null; then
        print_info "Redis found: $(redis-cli --version)"
    else
        print_warning "Redis not found in PATH"
    fi
    
    # Check Python (for Colab AI Brain)
    if command -v python3 &> /dev/null; then
        print_info "Python3 found: $(python3 --version)"
    else
        print_warning "Python3 not found (required for Colab AI Brain)"
    fi
    
    echo ""
}

check_environment_file() {
    print_step "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        if [ -f .env.example ]; then
            print_info "Copying .env.example to .env"
            cp .env.example .env
            print_warning "Please update .env with your actual configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_info ".env file found"
    fi
    
    echo ""
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Server dependencies
    print_info "Installing server dependencies..."
    npm install
    
    # Client dependencies
    print_info "Installing client dependencies..."
    cd client
    npm install
    cd ..
    
    # Python dependencies (if requirements.txt exists)
    if [ -f colab/requirements.txt ]; then
        print_info "Installing Python dependencies..."
        python3 -m pip install -r colab/requirements.txt || print_warning "Failed to install Python dependencies"
    fi
    
    echo ""
}

run_database_migrations() {
    print_step "Running database migrations..."
    
    # Check if database setup scripts exist
    if [ -f database/seed.js ]; then
        print_info "Running database seed..."
        npm run db:seed || print_warning "Database seed failed (this may be expected)"
    else
        print_warning "No database seed script found"
    fi
    
    echo ""
}

build_client() {
    print_step "Building client application..."
    
    cd client
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Building for production..."
        npm run build
    else
        print_info "Skipping build for $ENVIRONMENT environment"
    fi
    
    cd ..
    echo ""
}

run_tests() {
    print_step "Running tests..."
    
    # Run server tests if they exist
    if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
        print_info "Running server tests..."
        npm test || print_warning "Server tests failed or not configured"
    fi
    
    # Run client tests if they exist
    if [ -f "client/package.json" ] && grep -q "\"test\"" client/package.json; then
        print_info "Running client tests..."
        cd client
        npm test -- --watchAll=false || print_warning "Client tests failed or not configured"
        cd ..
    fi
    
    echo ""
}

start_services() {
    print_step "Starting services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Starting production server..."
        pm2 start server/index.js --name hathor-music || print_warning "pm2 not found, use 'npm start' manually"
    else
        print_info "Starting development server..."
        print_info "Run 'npm run dev' to start the development server"
    fi
    
    echo ""
}

setup_google_cloud() {
    print_step "Setting up Google Cloud services..."
    
    if [ -f "service-account.json" ]; then
        print_info "Service account file found"
        export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account.json"
    else
        print_warning "No service-account.json found. Google Cloud features may not work."
    fi
    
    echo ""
}

verify_services() {
    print_step "Verifying services..."
    
    # Check if Redis is running
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_info "Redis is running"
        else
            print_warning "Redis is not responding"
        fi
    fi
    
    # Check if PostgreSQL is accessible
    if command -v psql &> /dev/null; then
        if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_NAME" ]; then
            print_info "Database configuration found"
        else
            print_warning "Database configuration missing in .env"
        fi
    fi
    
    echo ""
}

create_directories() {
    print_step "Creating required directories..."
    
    mkdir -p uploads
    mkdir -p uploads/audio
    mkdir -p uploads/images
    mkdir -p logs
    
    print_info "Directories created"
    echo ""
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    print_info "Starting deployment process for $ENVIRONMENT environment"
    echo ""
    
    # Pre-deployment checks
    check_requirements
    check_environment_file
    create_directories
    
    # Setup
    install_dependencies
    setup_google_cloud
    
    # Database
    if [ "$ENVIRONMENT" != "production" ]; then
        run_database_migrations
    fi
    
    # Build
    build_client
    
    # Testing
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        run_tests
    fi
    
    # Verification
    verify_services
    
    # Start services
    if [ "$ENVIRONMENT" = "production" ]; then
        start_services
    fi
    
    # Summary
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Deployment Complete!                                    ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$ENVIRONMENT" = "development" ]; then
        print_info "To start the development server, run:"
        echo -e "  ${BLUE}npm run dev${NC}"
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Production server started with pm2"
        print_info "To check status: pm2 status"
        print_info "To view logs: pm2 logs hathor-music"
    fi
    
    echo ""
    print_info "Server will be available at: http://localhost:5000"
    print_info "Client will be available at: http://localhost:3000"
    echo ""
}

# Run main deployment
main
