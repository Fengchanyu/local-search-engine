#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MINIMUM_NODE_VERSION = '18.0.0';
const NODE_DOWNLOAD_BASE = 'https://nodejs.org/dist';

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

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
}

function checkNodeVersion() {
  return new Promise((resolve) => {
    exec('node -v', (error, stdout, stderr) => {
      if (error) {
        resolve({ installed: false, version: null, satisfies: false });
        return;
      }
      
      const version = stdout.trim().replace(/^v/, '');
      const satisfies = compareVersions(version, MINIMUM_NODE_VERSION) >= 0;
      
      resolve({
        installed: true,
        version,
        satisfies,
        minimumRequired: MINIMUM_NODE_VERSION
      });
    });
  });
}

function getPlatformInfo() {
  const platform = os.platform();
  const arch = os.arch();
  
  const platformMap = {
    'win32': 'windows',
    'darwin': 'macos',
    'linux': 'linux'
  };
  
  const archMap = {
    'x64': 'x64',
    'x86': 'x86',
    'arm64': 'arm64',
    'arm': 'arm'
  };
  
  return {
    platform: platformMap[platform] || platform,
    arch: archMap[arch] || arch,
    originalPlatform: platform,
    originalArch: arch
  };
}

function downloadFile(url, destPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    
    let totalBytes = 0;
    let downloadedBytes = 0;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath, progressCallback)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      
      totalBytes = parseInt(response.headers['content-length'], 10) || 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (progressCallback && totalBytes > 0) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          progressCallback(percent, downloadedBytes, totalBytes);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
    
    request.setTimeout(300000, () => {
      request.destroy();
      file.close();
      fs.unlinkSync(destPath);
      reject(new Error('Download timeout'));
    });
  });
}

function getLatestNodeVersion() {
  return new Promise((resolve, reject) => {
    https.get(`${NODE_DOWNLOAD_BASE}/latest/SHASUMS256.txt`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch Node.js version info: HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/node-v(\d+\.\d+\.\d+)/);
        if (match) {
          resolve(match[1]);
        } else {
          reject(new Error('Failed to parse Node.js version'));
        }
      });
    }).on('error', reject);
  });
}

async function installNodeWindows(progressCallback) {
  const platformInfo = getPlatformInfo();
  const tempDir = path.join(os.tmpdir(), 'nodejs-installer');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    log('Fetching latest Node.js version...', 'cyan');
    const version = await getLatestNodeVersion();
    log(`Latest version: v${version}`, 'cyan');
    
    const arch = platformInfo.arch === 'x64' ? 'x64' : 'x86';
    const fileName = `node-v${version}-${platformInfo.originalPlatform}-${arch}.msi`;
    const downloadUrl = `${NODE_DOWNLOAD_BASE}/v${version}/${fileName}`;
    const installerPath = path.join(tempDir, fileName);
    
    log(`Downloading Node.js installer...`, 'yellow');
    log(`URL: ${downloadUrl}`, 'dim');
    
    await downloadFile(downloadUrl, installerPath, (percent, downloaded, total) => {
      if (progressCallback) {
        progressCallback('download', percent, downloaded, total);
      }
    });
    
    log('Download completed. Starting installation...', 'green');
    
    return new Promise((resolve, reject) => {
      const installer = spawn('msiexec', ['/i', installerPath, '/passive', '/norestart'], {
        stdio: 'inherit',
        shell: true
      });
      
      installer.on('error', (err) => {
        reject(new Error(`Installation failed: ${err.message}`));
      });
      
      installer.on('close', (code) => {
        if (code === 0) {
          log('✓ Node.js installed successfully', 'green');
          resolve({ success: true, version });
        } else {
          reject(new Error(`Installation failed with exit code ${code}`));
        }
      });
    });
    
  } catch (error) {
    throw new Error(`Windows installation failed: ${error.message}`);
  }
}

async function installNodeMacOS(progressCallback) {
  return new Promise((resolve, reject) => {
    log('Checking for Homebrew...', 'cyan');
    
    exec('which brew', async (error) => {
      if (error) {
        reject(new Error('Homebrew is not installed. Please install Homebrew first: https://brew.sh'));
        return;
      }
      
      log('Installing Node.js via Homebrew...', 'yellow');
      
      if (progressCallback) {
        progressCallback('install', '0', 0, 0);
      }
      
      const brew = spawn('brew', ['install', 'node'], {
        stdio: 'inherit'
      });
      
      brew.on('error', (err) => {
        reject(new Error(`Homebrew installation failed: ${err.message}`));
      });
      
      brew.on('close', (code) => {
        if (code === 0) {
          log('✓ Node.js installed successfully via Homebrew', 'green');
          resolve({ success: true });
        } else {
          reject(new Error(`Homebrew installation failed with exit code ${code}`));
        }
      });
    });
  });
}

async function installNodeLinux(progressCallback) {
  const distro = await detectLinuxDistro();
  
  log(`Detected Linux distribution: ${distro.name}`, 'cyan');
  
  const packageManagers = {
    'ubuntu': 'apt',
    'debian': 'apt',
    'centos': 'yum',
    'fedora': 'dnf',
    'redhat': 'yum',
    'arch': 'pacman',
    'opensuse': 'zypper'
  };
  
  const packageManager = packageManagers[distro.id] || 'apt';
  
  log(`Using package manager: ${packageManager}`, 'cyan');
  
  const commands = {
    'apt': [
      ['sudo', 'apt-get', 'update'],
      ['sudo', 'apt-get', 'install', '-y', 'nodejs', 'npm']
    ],
    'yum': [
      ['sudo', 'yum', 'install', '-y', 'nodejs']
    ],
    'dnf': [
      ['sudo', 'dnf', 'install', '-y', 'nodejs']
    ],
    'pacman': [
      ['sudo', 'pacman', '-S', '--noconfirm', 'nodejs', 'npm']
    ],
    'zypper': [
      ['sudo', 'zypper', 'install', '-y', 'nodejs']
    ]
  };
  
  const installCommands = commands[packageManager];
  
  if (!installCommands) {
    throw new Error(`Unsupported package manager: ${packageManager}`);
  }
  
  for (const cmd of installCommands) {
    await new Promise((resolve, reject) => {
      log(`Running: ${cmd.join(' ')}`, 'dim');
      
      if (progressCallback) {
        progressCallback('install', '0', 0, 0);
      }
      
      const proc = spawn(cmd[0], cmd.slice(1), {
        stdio: 'inherit'
      });
      
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    });
  }
  
  log('✓ Node.js installed successfully', 'green');
  return { success: true };
}

async function detectLinuxDistro() {
  return new Promise((resolve) => {
    exec('cat /etc/os-release', (error, stdout) => {
      if (error) {
        resolve({ name: 'Unknown', id: 'unknown' });
        return;
      }
      
      const lines = stdout.split('\n');
      let name = 'Unknown';
      let id = 'unknown';
      
      for (const line of lines) {
        if (line.startsWith('NAME=')) {
          name = line.split('=')[1].replace(/"/g, '');
        }
        if (line.startsWith('ID=')) {
          id = line.split('=')[1].replace(/"/g, '');
        }
      }
      
      resolve({ name, id });
    });
  });
}

async function installNode(progressCallback) {
  const platformInfo = getPlatformInfo();
  
  log(`Installing Node.js for ${platformInfo.platform} (${platformInfo.arch})...`, 'yellow');
  
  switch (platformInfo.platform) {
    case 'windows':
      return await installNodeWindows(progressCallback);
    case 'macos':
      return await installNodeMacOS(progressCallback);
    case 'linux':
      return await installNodeLinux(progressCallback);
    default:
      throw new Error(`Unsupported platform: ${platformInfo.platform}`);
  }
}

function showManualInstallInstructions() {
  const platformInfo = getPlatformInfo();
  
  console.log('');
  log('============================================', 'red');
  log('  Manual Installation Required', 'red');
  log('============================================', 'red');
  console.log('');
  
  log(`Node.js ${MINIMUM_NODE_VERSION} or higher is required to run this application.`, 'yellow');
  console.log('');
  log('Please install Node.js manually:', 'cyan');
  console.log('');
  
  switch (platformInfo.platform) {
    case 'windows':
      log('Option 1: Download from official website', 'bold');
      console.log('  1. Visit: https://nodejs.org/');
      console.log('  2. Download the LTS version for Windows');
      console.log('  3. Run the installer and follow the prompts');
      console.log('');
      log('Option 2: Use Chocolatey (if installed)', 'bold');
      console.log('  choco install nodejs');
      console.log('');
      log('Option 3: Use Scoop (if installed)', 'bold');
      console.log('  scoop install nodejs');
      break;
      
    case 'macos':
      log('Option 1: Use Homebrew (Recommended)', 'bold');
      console.log('  brew install node');
      console.log('');
      log('Option 2: Download from official website', 'bold');
      console.log('  1. Visit: https://nodejs.org/');
      console.log('  2. Download the LTS version for macOS');
      console.log('  3. Run the installer and follow the prompts');
      console.log('');
      log('Option 3: Use MacPorts', 'bold');
      console.log('  sudo port install nodejs');
      break;
      
    case 'linux':
      log('Ubuntu/Debian:', 'bold');
      console.log('  sudo apt-get update');
      console.log('  sudo apt-get install nodejs npm');
      console.log('');
      log('CentOS/RHEL/Fedora:', 'bold');
      console.log('  sudo yum install nodejs');
      console.log('  or');
      console.log('  sudo dnf install nodejs');
      console.log('');
      log('Arch Linux:', 'bold');
      console.log('  sudo pacman -S nodejs npm');
      console.log('');
      log('Using NVM (Node Version Manager):', 'bold');
      console.log('  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
      console.log('  nvm install --lts');
      break;
      
    default:
      log('Visit the official Node.js website:', 'bold');
      console.log('  https://nodejs.org/');
  }
  
  console.log('');
  log('After installation, please restart this application.', 'yellow');
  console.log('');
}

async function ensureNodeEnvironment(options = {}) {
  const { autoInstall = true, silent = false } = options;
  
  if (!silent) {
    console.log('');
    log('============================================', 'cyan');
    log('  Node.js Environment Check', 'cyan');
    log('============================================', 'cyan');
    console.log('');
  }
  
  log('Checking Node.js installation...', 'yellow');
  
  const versionInfo = await checkNodeVersion();
  
  if (versionInfo.installed && versionInfo.satisfies) {
    log(`✓ Node.js v${versionInfo.version} detected (minimum required: v${versionInfo.minimumRequired})`, 'green');
    return { success: true, installed: true, version: versionInfo.version };
  }
  
  if (versionInfo.installed && !versionInfo.satisfies) {
    log(`✗ Node.js v${versionInfo.version} detected, but v${versionInfo.minimumRequired} or higher is required`, 'red');
    
    if (!autoInstall) {
      showManualInstallInstructions();
      return { success: false, installed: true, version: versionInfo.version, needsUpgrade: true };
    }
    
    log('Attempting to upgrade Node.js...', 'yellow');
  }
  
  if (!versionInfo.installed) {
    log('✗ Node.js is not installed', 'red');
    
    if (!autoInstall) {
      showManualInstallInstructions();
      return { success: false, installed: false };
    }
    
    log('Attempting to install Node.js...', 'yellow');
  }
  
  console.log('');
  
  try {
    const progressCallback = (stage, percent, downloaded, total) => {
      if (stage === 'download') {
        process.stdout.write(`\r${COLORS.blue}  Downloading: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)} MB / ${(total / 1024 / 1024).toFixed(2)} MB)${COLORS.reset}`);
      } else if (stage === 'install') {
        process.stdout.write(`\r${COLORS.blue}  Installing...${COLORS.reset}`);
      }
    };
    
    const result = await installNode(progressCallback);
    console.log('');
    
    log('Verifying installation...', 'yellow');
    const newVersionInfo = await checkNodeVersion();
    
    if (newVersionInfo.installed && newVersionInfo.satisfies) {
      log(`✓ Node.js v${newVersionInfo.version} installed successfully`, 'green');
      console.log('');
      log('============================================', 'green');
      log('  Installation Complete!', 'green');
      log('============================================', 'green');
      console.log('');
      log('Please restart the application to use the newly installed Node.js.', 'yellow');
      console.log('');
      
      return { success: true, installed: true, version: newVersionInfo.version, justInstalled: true };
    } else {
      throw new Error('Installation verification failed');
    }
    
  } catch (error) {
    console.log('');
    log(`✗ Automatic installation failed: ${error.message}`, 'red');
    console.log('');
    showManualInstallInstructions();
    
    return { 
      success: false, 
      installed: false, 
      error: error.message 
    };
  }
}

module.exports = {
  checkNodeVersion,
  ensureNodeEnvironment,
  installNode,
  getPlatformInfo,
  showManualInstallInstructions,
  MINIMUM_NODE_VERSION
};

if (require.main === module) {
  ensureNodeEnvironment({ autoInstall: false }).then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
