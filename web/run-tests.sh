#!/usr/bin/env bash

echo "============================================"
echo "  Local Search Engine - Frontend Test Suite"
echo "============================================"
echo ""

echo "[1/4] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo "Node.js version: $(node --version)"
echo ""

echo "[2/4] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
else
    echo "Dependencies already installed"
fi
echo ""

echo "[3/4] Running tests with coverage..."
npm run test:coverage
if [ $? -ne 0 ]; then
    echo ""
    echo "============================================"
    echo "  TESTS FAILED - Please check the errors above"
    echo "============================================"
    exit 1
fi
echo ""

echo "[4/4] Generating test report..."
echo "Test report generated in coverage/ directory"
echo ""

echo "============================================"
echo "  All tests completed successfully!"
echo "============================================"
echo ""
echo "Coverage report: coverage/index.html"
echo ""
