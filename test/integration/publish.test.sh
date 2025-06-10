#!/bin/bash

# Integration test for local packaging and installation
# Tests that the package can be built, packed, installed globally, and executed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Test configuration
PACKAGE_NAME="prompt-elevator"
TEST_PROMPT="test this CLI integration"
TEMP_DIR=""
PACKAGE_FILE=""

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Uninstall global package if installed
    if npm list -g "$PACKAGE_NAME" &>/dev/null; then
        log "Uninstalling global package: $PACKAGE_NAME"
        npm uninstall -g "$PACKAGE_NAME" &>/dev/null || true
    fi
    
    # Remove temporary files
    if [[ -n "$PACKAGE_FILE" && -f "$PACKAGE_FILE" ]]; then
        log "Removing package file: $PACKAGE_FILE"
        rm -f "$PACKAGE_FILE"
    fi
    
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        log "Removing temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Main test function
main() {
    log "Starting integration test for $PACKAGE_NAME"
    
    # Ensure we're in the project root
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Step 1: Build and pack the package
    log "Building and packing the package..."
    npm run build
    
    # Create package and capture the filename
    npm pack > /dev/null
    PACKAGE_FILE="${PACKAGE_NAME}-1.0.0.tgz"
    
    if [[ ! -f "$PACKAGE_FILE" ]]; then
        error "Failed to create package file: $PACKAGE_FILE"
        exit 1
    fi
    
    log "Package created: $PACKAGE_FILE"
    
    # Step 2: Install package globally
    log "Installing package globally..."
    npm install -g "./$PACKAGE_FILE"
    
    # Step 3: Verify the command is available
    log "Verifying command is available..."
    if ! command -v "$PACKAGE_NAME" &>/dev/null; then
        error "Command '$PACKAGE_NAME' not found in PATH after global installation"
        exit 1
    fi
    
    # Step 4: Test the CLI command (mock API call by setting dummy key)
    log "Testing CLI command..."
    
    # Create a temporary directory for testing
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Set a dummy API key for testing (won't actually make API calls)
    export GEMINI_API_KEY="test-key-for-integration-testing"
    
    # Test the help command first (doesn't require API)
    log "Testing help command..."
    "$PACKAGE_NAME" --help &>/dev/null
    
    # Test version command
    log "Testing version command..."
    "$PACKAGE_NAME" --version &>/dev/null
    
    log "CLI command tests completed successfully"
    
    # Return to original directory
    cd - &>/dev/null
    
    success "✅ Global installation test passed"
}

# Run the main function
main "$@"