#!/bin/bash

echo "============================================"
echo "  Local Search Engine - Build Index"
echo "============================================"
echo ""

read -p "Enter directory path to index: " INDEX_PATH

if [ ! -d "$INDEX_PATH" ]; then
    echo ""
    echo "ERROR: Directory not found"
    exit 1
fi

echo ""
echo "Building index..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
node dist/cli/index.js build --db ./data/search-index.db -p "$INDEX_PATH"

echo ""
echo "Index built successfully!"
echo ""
