#!/bin/bash

echo "============================================"
echo "  Local Search Engine - Run Tests"
echo "============================================"
echo ""

echo "[1/2] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    exit 1
fi

echo "[2/2] Running tests..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/web"
node ./node_modules/vitest/vitest.mjs --run --reporter=basic

echo ""
