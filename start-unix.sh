#!/bin/bash

INDEX_PATH=""
if [ -n "$1" ]; then
    INDEX_PATH="--index-path=$1"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/scripts/start.js" --open-browser $INDEX_PATH "$@"
