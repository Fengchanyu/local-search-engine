#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "   Local Search Engine - Launcher"
echo "============================================"
echo ""

echo "[1/5] Checking Node.js environment..."
echo ""

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "[SUCCESS] Detected Node.js $NODE_VERSION"
else
    echo "[ERROR] Node.js not detected"
    echo ""
    echo "Node.js is required to run this application."
    echo ""
    echo "Please choose an option:"
    echo "  1. Auto-install Node.js (Debian/Ubuntu only)"
    echo "  2. Show manual installation guide"
    echo "  3. Exit"
    echo ""
    read -p "Enter option (1/2/3): " choice
    
    case $choice in
        1)
            echo ""
            echo "[INSTALL] Preparing to install Node.js..."
            echo ""
            if [ -f /etc/debian_version ] || [ -f /etc/lsb-release ]; then
                sudo apt-get update && sudo apt-get install -y nodejs npm
                if [ $? -eq 0 ]; then
                    echo ""
                    echo "[SUCCESS] Node.js installation complete!"
                    echo "[INFO] Please restart the launcher."
                    exit 0
                else
                    echo "[FAILED] Auto-installation failed"
                fi
            else
                echo "[ERROR] Auto-install only supported on Debian/Ubuntu"
            fi
            ;;
        2)
            echo ""
            echo "============================================"
            echo "   Manual Node.js Installation"
            echo "============================================"
            echo ""
            echo "Method 1: Official Website (Recommended)"
            echo "  1. Visit: https://nodejs.org/"
            echo "  2. Download the LTS version"
            echo "  3. Run the installer or follow instructions"
            echo ""
            echo "Method 2: Package Manager"
            echo "  - Debian/Ubuntu: sudo apt install nodejs npm"
            echo "  - Fedora/RHEL: sudo dnf install nodejs npm"
            echo "  - Arch Linux: sudo pacman -S nodejs npm"
            echo "  - macOS (Homebrew): brew install node"
            echo ""
            echo "After installation, please restart this launcher."
            echo ""
            read -p "Press Enter to exit..."
            exit 0
            ;;
        3)
            exit 0
            ;;
        *)
            echo "[ERROR] Invalid option"
            exit 1
            ;;
    esac
    exit 1
fi

echo ""
echo "[2/5] Checking npm..."
echo ""

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "[SUCCESS] Detected npm $NPM_VERSION"
else
    echo "[ERROR] npm not found. Please reinstall Node.js."
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "[3/5] Checking project dependencies..."
echo ""

NEED_INSTALL=0

if [ ! -d "node_modules" ]; then
    echo "[INFO] Root node_modules not found"
    NEED_INSTALL=1
else
    echo "[SUCCESS] Root dependencies found"
fi

if [ ! -d "web/node_modules" ]; then
    echo "[INFO] Web node_modules not found"
    NEED_INSTALL=1
else
    echo "[SUCCESS] Web dependencies found"
fi

if [ $NEED_INSTALL -eq 1 ]; then
    echo ""
    echo "[INFO] Some dependencies are missing. Installing..."
    echo ""
    
    echo "[INSTALL] Installing root dependencies..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install root dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "[SUCCESS] Root dependencies installed"
    echo ""
    
    echo "[INSTALL] Installing web dependencies..."
    echo ""
    cd web
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install web dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
    cd "$SCRIPT_DIR"
    echo "[SUCCESS] Web dependencies installed"
    echo ""
fi

echo ""
echo "[4/5] Checking project build..."
echo ""

NEED_BUILD=0

if [ ! -d "dist" ] || [ ! -f "dist/cli/index.js" ]; then
    echo "[INFO] Backend build not found"
    NEED_BUILD=1
else
    echo "[SUCCESS] Backend build found"
fi

if [ ! -d "web/dist" ]; then
    echo "[INFO] Frontend build not found"
    NEED_BUILD=1
else
    echo "[SUCCESS] Frontend build found"
fi

if [ $NEED_BUILD -eq 1 ]; then
    echo ""
    echo "[INFO] Project needs to be built. Building..."
    echo ""
    
    echo "[BUILD] Building backend..."
    echo ""
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to build backend"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "[SUCCESS] Backend built successfully"
    echo ""
    
    echo "[BUILD] Building frontend..."
    echo ""
    cd web
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to build frontend"
        read -p "Press Enter to exit..."
        exit 1
    fi
    cd "$SCRIPT_DIR"
    echo "[SUCCESS] Frontend built successfully"
    echo ""
fi

echo ""
echo "[5/5] Checking index configuration..."
echo ""

INDEX_PATH=""
SKIP_INDEX=""

if [ -n "$1" ]; then
    INDEX_PATH="$1"
    echo "[INFO] Index path provided: $INDEX_PATH"
else
    echo "No index path specified."
    echo ""
    echo "Please choose an option:"
    echo "  1. Index current directory"
    echo "  2. Index user Documents folder"
    echo "  3. Index user Desktop"
    echo "  4. Specify custom path"
    echo "  5. Skip indexing (not recommended)"
    echo ""
    read -p "Enter option (1/2/3/4/5): " index_choice
    
    case $index_choice in
        1)
            INDEX_PATH="$SCRIPT_DIR"
            echo "[INFO] Will index: $INDEX_PATH"
            ;;
        2)
            INDEX_PATH="$HOME/Documents"
            echo "[INFO] Will index: $INDEX_PATH"
            ;;
        3)
            INDEX_PATH="$HOME/Desktop"
            echo "[INFO] Will index: $INDEX_PATH"
            ;;
        4)
            echo ""
            read -p "Enter directory path to index: " custom_path
            if [ -d "$custom_path" ]; then
                INDEX_PATH="$custom_path"
                echo "[INFO] Will index: $INDEX_PATH"
            else
                echo "[ERROR] Directory not found: $custom_path"
                read -p "Press Enter to exit..."
                exit 1
            fi
            ;;
        5)
            echo "[INFO] Skipping index build..."
            SKIP_INDEX="1"
            ;;
        *)
            echo "[ERROR] Invalid option"
            read -p "Press Enter to exit..."
            exit 1
            ;;
    esac
fi

echo ""
echo "[LAUNCH] Starting application..."
echo ""

if [ -n "$SKIP_INDEX" ]; then
    node "$SCRIPT_DIR/scripts/start.js" --open-browser --skip-index "$@"
elif [ -n "$INDEX_PATH" ]; then
    echo "[INFO] Building index for: $INDEX_PATH"
    echo ""
    node "$SCRIPT_DIR/scripts/start.js" --open-browser --index-path="$INDEX_PATH" "$@"
else
    node "$SCRIPT_DIR/scripts/start.js" --open-browser --skip-index "$@"
fi