# Scripts

This directory contains utility scripts for the Local Search Engine project.

## start.js

A cross-platform launcher script that starts the backend and frontend servers with automatic index management and optional browser auto-open functionality.

### Features

- **Automatic Index Management**
  - Checks if index exists on startup
  - Validates index integrity
  - Automatically builds/rebuilds index if needed
  - Atomic lock mechanism to prevent concurrent indexing
  - Progress logging with timestamps

- **Cross-Platform Browser Opening**
  - Windows: `cmd /c start`
  - macOS: `open`
  - Linux: `xdg-open`

- **Error Handling**
  - Browser launch failure handling
  - Server startup timeout handling
  - Index build timeout handling

### Usage

```bash
# Start with browser auto-open (requires index path)
node scripts/start.js --open-browser --index-path=/path/to/index

# Start without opening browser
node scripts/start.js --index-path=/path/to/index

# Force rebuild index on startup
node scripts/start.js --force-index --index-path=/path/to/index

# Skip index check
node scripts/start.js --skip-index

# Show help
node scripts/start.js --help
```

### Options

| Option | Description |
|--------|-------------|
| `-o, --open-browser` | Automatically open browser after startup |
| `--url=<url>` | Custom URL to open (default: http://localhost:3000) |
| `--skip-backend` | Skip backend server startup |
| `--skip-frontend` | Skip frontend server startup |
| `--skip-index` | Skip index check and build |
| `--force-index` | Force rebuild index on startup |
| `--index-path=<path>` | Directory path to index |
| `--help, -h` | Show help message |

### NPM Scripts

```bash
# Start with browser auto-open
npm run launch -- --index-path=/path/to/index

# Start without opening browser
npm run launch:headless -- --index-path=/path/to/index

# Force rebuild index and start
npm run launch:force-index -- --index-path=/path/to/index
```

### Index Management

The script automatically manages the search index:

1. **Check**: Verifies if the database file exists
2. **Validate**: Checks if the database is valid (not corrupted)
3. **Lock**: Uses atomic lock file to prevent concurrent indexing
4. **Build**: Creates or rebuilds the index if needed
5. **Log**: Provides detailed progress logging

### Lock File

The script uses a lock file (`./data/.index.lock`) to prevent concurrent indexing:

```json
{
  "pid": 12345,
  "timestamp": 1716979200000,
  "hostname": "my-computer"
}
```

### Timeout Configuration

| Timeout | Default | Description |
|---------|---------|-------------|
| `indexCheckTimeout` | 60s | Timeout for checking existing index |
| `indexBuildTimeout` | 300s | Timeout for building new index |
| `healthCheckInterval` | 1s | Interval for server health checks |
| `maxRetries` | 30 | Max retries for server health checks |

### Example Output

```
[11:13:18] ============================================
[11:13:18]   Local Search Engine - Launcher
[11:13:18] ============================================

[11:13:18] [1/3] Checking/Building Index...
[11:13:18] Checking index status...
[11:13:18] ✓ Index exists and is valid (744.00 KB)

[11:13:18] [2/3] Starting Backend API Server...
[11:13:18] ✓ Backend process started (PID: 12345)

[11:13:18] [3/3] Starting Frontend Dev Server...
[11:13:18] ✓ Frontend process started (PID: 12346)

[11:13:20] ✓ Backend is ready
[11:13:22] ✓ Frontend is ready

[11:13:22] ============================================
[11:13:22]   All services started successfully!
[11:13:22] ============================================

[11:13:22]   Frontend: http://localhost:3000
[11:13:22]   Backend:  http://localhost:3002

[11:13:22] Opening browser...
[11:13:23] ✓ Browser opened: http://localhost:3000

[11:13:23] Press Ctrl+C to stop all services
```
