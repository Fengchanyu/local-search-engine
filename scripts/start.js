#!/usr/bin/env node

const { spawn, exec, fork } = require('child_process');
const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');
const nodeEnvCheck = require('./node-env-check');

const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3002',
  healthCheckInterval: 1000,
  maxRetries: 30,
  openBrowserDelay: 1000,
  indexCheckTimeout: 60000,
  indexBuildTimeout: 300000,
  lockFile: './data/.index.lock',
  dbFile: './data/search-index.db',
  minIndexFiles: 1,
};

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`${COLORS.dim}[${timestamp}]${COLORS.reset} ${COLORS[color]}${message}${COLORS.reset}`);
}

function showHelp() {
  console.log('');
  log('Usage: node scripts/start.js [options]', 'bold');
  console.log('');
  log('Options:', 'cyan');
  console.log('  -o, --open-browser      Automatically open browser after startup');
  console.log('  --url=<url>             Custom URL to open (default: http://localhost:3000)');
  console.log('  --skip-backend          Skip backend server startup');
  console.log('  --skip-frontend         Skip frontend server startup');
  console.log('  --skip-index            Skip index check and build');
  console.log('  --force-index           Force rebuild index on startup');
  console.log('  --index-path=<path>     Directory path to index');
  console.log('  --skip-env-check        Skip Node.js environment check');
  console.log('  --no-auto-install       Disable automatic Node.js installation');
  console.log('  --help, -h              Show this help message');
  console.log('');
  log('Examples:', 'cyan');
  console.log('  node scripts/start.js --open-browser');
  console.log('  node scripts/start.js -o --index-path=/home/user/documents');
  console.log('  node scripts/start.js --force-index');
  console.log('  node scripts/start.js --skip-env-check');
  console.log('');
}

function checkServerHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer(url, name, maxRetries = CONFIG.maxRetries) {
  return new Promise((resolve) => {
    let retries = 0;
    
    const check = async () => {
      retries++;
      const isHealthy = await checkServerHealth(url);
      
      if (isHealthy) {
        log(`✓ ${name} is ready`, 'green');
        resolve(true);
      } else if (retries >= maxRetries) {
        log(`✗ ${name} failed to start after ${maxRetries} retries`, 'red');
        resolve(false);
      } else {
        process.stdout.write(`\r${COLORS.dim}  Waiting for ${name}... (${retries}/${maxRetries})${COLORS.reset}`);
        setTimeout(check, CONFIG.healthCheckInterval);
      }
    };
    
    check();
  });
}

function openBrowser(url) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    let args = [];

    switch (platform) {
      case 'win32':
        command = 'cmd';
        args = ['/c', 'start', '', url];
        break;
      case 'darwin':
        command = 'open';
        args = [url];
        break;
      case 'linux':
        command = 'xdg-open';
        args = [url];
        break;
      default:
        log(`✗ Unsupported platform: ${platform}`, 'red');
        log(`Please open manually: ${url}`, 'yellow');
        resolve(false);
        return;
    }

    const proc = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      shell: platform === 'win32',
    });

    proc.on('error', (err) => {
      log(`✗ Failed to open browser: ${err.message}`, 'red');
      log(`Please open manually: ${url}`, 'yellow');
      resolve(false);
    });

    proc.on('spawn', () => {
      proc.unref();
      log(`✓ Browser opened: ${url}`, 'green');
      resolve(true);
    });

    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
}

function startServer(command, args, name, cwd, env = {}) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, ...env }
    });

    proc.on('error', (err) => {
      log(`✗ Failed to start ${name}: ${err.message}`, 'red');
      resolve(null);
    });

    proc.on('spawn', () => {
      log(`✓ ${name} process started (PID: ${proc.pid})`, 'green');
      resolve(proc);
    });

    setTimeout(() => {
      resolve(proc);
    }, 500);
  });
}

function acquireLock() {
  const lockDir = path.dirname(CONFIG.lockFile);
  
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true });
  }

  if (fs.existsSync(CONFIG.lockFile)) {
    const lockData = JSON.parse(fs.readFileSync(CONFIG.lockFile, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;
    
    if (lockAge < CONFIG.indexBuildTimeout) {
      return { acquired: false, lockData };
    }
    
    fs.unlinkSync(CONFIG.lockFile);
  }

  const lockData = {
    pid: process.pid,
    timestamp: Date.now(),
    hostname: os.hostname(),
  };
  
  fs.writeFileSync(CONFIG.lockFile, JSON.stringify(lockData, null, 2));
  return { acquired: true, lockData };
}

function releaseLock() {
  if (fs.existsSync(CONFIG.lockFile)) {
    try {
      fs.unlinkSync(CONFIG.lockFile);
    } catch (err) {
    }
  }
}

function checkIndexExists() {
  return fs.existsSync(CONFIG.dbFile);
}

function checkIndexValid() {
  if (!fs.existsSync(CONFIG.dbFile)) {
    return { valid: false, reason: 'Database file not found' };
  }

  const stats = fs.statSync(CONFIG.dbFile);
  
  if (stats.size < 1024) {
    return { valid: false, reason: 'Database file too small, may be corrupted' };
  }

  return { valid: true, size: stats.size };
}

function checkIndexHasFiles() {
  try {
    const dbPath = path.resolve(process.cwd(), CONFIG.dbFile);
    const output = require('child_process').execSync(
      `node -e "
const sql = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await sql();
  const buf = fs.readFileSync('${dbPath.replace(/\\/g, '\\\\')}');
  const db = new SQL.Database(buf);
  const r = db.exec('SELECT COUNT(*) FROM files');
  console.log(r[0].values[0][0]);
  db.close();
})();
"`,
      { encoding: 'utf8', cwd: process.cwd(), timeout: 10000 }
    ).trim();
    return parseInt(output, 10) || 0;
  } catch (err) {
    return 0;
  }
}

function getIndexStatus() {
  return new Promise((resolve) => {
    const req = http.get(`${CONFIG.backendUrl}/api/index/status`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data || result);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function buildIndex(indexPath, force = false) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Clean up the path - remove trailing quotes and backslashes
    let cleanPath = indexPath.replace(/["']+$/, '').replace(/[\\]+$/, '');
    
    log('Starting index build process...', 'yellow');
    log(`Index path: ${cleanPath}`, 'cyan');
    log(`Start time: ${new Date().toISOString()}`, 'cyan');
    
    const cliArgs = [
      'dist/cli/index.js',
      'build',
      '--db', CONFIG.dbFile,
      '-p', cleanPath,
    ];

    if (force) {
      cliArgs.push('--rebuild');
    }

    console.log('[DEBUG] CLI args:', cliArgs.slice(1).join(' '));

    const proc = fork(
      path.join(process.cwd(), cliArgs[0]),
      cliArgs.slice(1),
      {
        silent: true,
        cwd: process.cwd(),
      }
    );

    let output = '';
    let indexedFiles = 0;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('[BUILD STDOUT]', text.trim());
      
      const match = text.match(/Indexed (\d+) files/);
      if (match) {
        indexedFiles = parseInt(match[1], 10);
        process.stdout.write(`\r${COLORS.blue}  Progress: ${indexedFiles} files indexed${COLORS.reset}`);
      }
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
      console.log('[BUILD STDERR]', data.toString().trim());
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Index build timeout after ${CONFIG.indexBuildTimeout / 1000}s`));
    }, CONFIG.indexBuildTimeout);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      console.log('');
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log(`✓ Index build completed`, 'green');
        log(`  Files indexed: ${indexedFiles}`, 'cyan');
        log(`  Duration: ${duration}s`, 'cyan');
        log(`  End time: ${new Date().toISOString()}`, 'cyan');
        resolve({ success: true, indexedFiles, duration });
      } else {
        log(`✗ Index build failed with code ${code}`, 'red');
        reject(new Error(`Index build failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      log(`✗ Index build error: ${err.message}`, 'red');
      reject(err);
    });
  });
}

async function ensureIndex(indexPath, forceRebuild = false) {
  log('Checking index status...', 'yellow');

  const { acquired, lockData } = acquireLock();
  
  if (!acquired) {
    log(`⚠ Another indexing process is running (PID: ${lockData.pid})`, 'yellow');
    log('Waiting for existing indexing to complete...', 'yellow');
    
    const waitStart = Date.now();
    while (fs.existsSync(CONFIG.lockFile)) {
      if (Date.now() - waitStart > CONFIG.indexBuildTimeout) {
        log('✗ Timeout waiting for existing indexing process', 'red');
        releaseLock();
        return { success: false, reason: 'timeout' };
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    log('✓ Existing indexing completed', 'green');
    return { success: true, skipped: true };
  }

  try {
    if (forceRebuild) {
      log('Force rebuild requested, rebuilding index...', 'yellow');
      const result = await buildIndex(indexPath, true);
      return { success: true, ...result };
    }

    const indexExists = checkIndexExists();
    
    if (!indexExists) {
      log('Index not found, building new index...', 'yellow');
      const result = await buildIndex(indexPath);
      return { success: true, ...result };
    }

    const { valid, reason, size } = checkIndexValid();
    
    if (!valid) {
      log(`Index invalid: ${reason}, rebuilding...`, 'yellow');
      const result = await buildIndex(indexPath, true);
      return { success: true, ...result };
    }

    // Check if database has any files
    const fileCount = checkIndexHasFiles();
    if (fileCount < CONFIG.minIndexFiles) {
      log(`Index has only ${fileCount} files, rebuilding...`, 'yellow');
      const result = await buildIndex(indexPath, true);
      return { success: true, ...result };
    }

    log(`✓ Index exists and is valid (${(size / 1024).toFixed(2)} KB, ${fileCount} files)`, 'green');
    return { success: true, skipped: true };
    
  } catch (err) {
    log(`✗ Index check/build failed: ${err.message}`, 'red');
    return { success: false, error: err.message };
  } finally {
    releaseLock();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const skipEnvCheck = args.includes('--skip-env-check');
  const autoInstallNode = !args.includes('--no-auto-install');
  
  if (!skipEnvCheck) {
    const envResult = await nodeEnvCheck.ensureNodeEnvironment({ 
      autoInstall: autoInstallNode,
      silent: false 
    });
    
    if (!envResult.success) {
      log('Node.js environment check failed. Cannot start application.', 'red');
      log('Use --skip-env-check to bypass this check (not recommended)', 'yellow');
      process.exit(1);
    }
    
    if (envResult.justInstalled) {
      log('Node.js was just installed. Please restart the application.', 'yellow');
      process.exit(0);
    }
  }

  const openBrowserFlag = args.includes('--open-browser') || args.includes('-o');
  const skipBackend = args.includes('--skip-backend');
  const skipFrontend = args.includes('--skip-frontend');
  const skipIndex = args.includes('--skip-index');
  const forceIndex = args.includes('--force-index');
  const customUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];
  const indexPath = args.find(arg => arg.startsWith('--index-path='))?.split('=')[1];

  console.log('');
  log('============================================', 'cyan');
  log('  Local Search Engine - Launcher', 'cyan');
  log('============================================', 'cyan');
  console.log('');

  const targetUrl = customUrl || CONFIG.frontendUrl;
  let step = 1;
  const totalSteps = (!skipIndex ? 1 : 0) + (!skipBackend ? 1 : 0) + (!skipFrontend ? 1 : 0);

  if (!skipIndex && indexPath) {
    log(`[${step}/${totalSteps}] Checking/Building Index...`, 'yellow');
    step++;
    
    const indexResult = await ensureIndex(indexPath, forceIndex);
    
    if (!indexResult.success) {
      log('Index check/build failed, continuing anyway...', 'yellow');
    }
    console.log('');
  }

  if (!skipBackend) {
    log(`[${step}/${totalSteps}] Starting Backend API Server...`, 'yellow');
    step++;
    
    // Set DB_PATH environment variable to use the correct database
    const dbPath = path.resolve(process.cwd(), CONFIG.dbFile);
    
    const backendProc = await startServer(
      'node',
      ['dist/server/index.js'],
      'Backend',
      process.cwd(),
      { DB_PATH: dbPath }
    );

    if (!backendProc) {
      log('Failed to start backend server', 'red');
      process.exit(1);
    }

    console.log('');
    log(`[${step}/${totalSteps}] Waiting for services...`, 'yellow');
    step++;
    const backendReady = await waitForServer(`${CONFIG.backendUrl}/api/health`, 'Backend');
    
    if (!backendReady) {
      log('Backend server is not responding', 'red');
      process.exit(1);
    }
  }

  if (!skipFrontend) {
    log(`[${step}/${totalSteps}] Starting Frontend Dev Server...`, 'yellow');
    const frontendProc = await startServer(
      'npm',
      ['run', 'dev'],
      'Frontend',
      `${process.cwd()}/web`
    );

    if (!frontendProc) {
      log('Failed to start frontend server', 'red');
      process.exit(1);
    }

    console.log('');
    const frontendReady = await waitForServer(CONFIG.frontendUrl, 'Frontend');
    
    if (!frontendReady) {
      log('Frontend server is not responding', 'red');
      process.exit(1);
    }
  }

  console.log('');
  log('============================================', 'green');
  log('  All services started successfully!', 'green');
  log('============================================', 'green');
  console.log('');
  log(`  Frontend: ${CONFIG.frontendUrl}`, 'cyan');
  log(`  Backend:  ${CONFIG.backendUrl}`, 'cyan');
  console.log('');

  if (openBrowserFlag) {
    log('Opening browser...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, CONFIG.openBrowserDelay));
    await openBrowser(targetUrl);
    console.log('');
  }

  log('Press Ctrl+C to stop all services', 'dim');
  console.log('');

  process.on('SIGINT', () => {
    console.log('');
    log('Stopping services...', 'yellow');
    releaseLock();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('');
    log('Stopping services...', 'yellow');
    releaseLock();
    process.exit(0);
  });
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`, 'red');
  releaseLock();
  process.exit(1);
});
