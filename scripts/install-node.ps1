$ErrorActionPreference = "Stop"

$NODEJS_BASE_URL = "https://nodejs.org/dist"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Get-LTSNodeVersion {
    try {
        Write-ColorOutput "Fetching Node.js LTS version..." "Gray"
        
        $ltsVersions = @("24.15.0", "22.22.3", "20.20.2", "24.14.0")
        
        foreach ($version in $ltsVersions) {
            $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
            $testUrl = "$NODEJS_BASE_URL/v$version/node-v$version-$arch.msi"
            
            try {
                Write-ColorOutput "Testing v$version..." "Gray"
                $testRequest = Invoke-WebRequest -Uri $testUrl -Method Head -UseBasicParsing -TimeoutSec 5
                Write-ColorOutput "Found available version: v$version" "Green"
                return $version
            }
            catch {
                Write-ColorOutput "v$version not available" "Gray"
                continue
            }
        }
        
        throw "No available LTS version found"
    }
    catch {
        Write-ColorOutput "Failed to find LTS version, using fallback..." "Yellow"
        return "24.15.0"
    }
}

function Install-NodeJS {
    Write-ColorOutput "Fetching Node.js LTS version..." "Cyan"
    
    $version = Get-LTSNodeVersion
    Write-ColorOutput "Target version: v$version" "Green"
    
    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $fileName = "node-v$version-$arch.msi"
    $downloadUrl = "$NODEJS_BASE_URL/v$version/$fileName"
    
    $tempDir = Join-Path $env:TEMP "nodejs-installer"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    
    $installerPath = Join-Path $tempDir $fileName
    
    Write-ColorOutput "Downloading Node.js installer..." "Cyan"
    Write-ColorOutput "Download URL: $downloadUrl" "Gray"
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        
        Write-ColorOutput "Starting download (this may take a few minutes)..." "Gray"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        if (-not (Test-Path $installerPath)) {
            throw "Downloaded file not found"
        }
        
        $fileSize = (Get-Item $installerPath).Length / 1MB
        if ($fileSize -lt 10) {
            throw "Downloaded file is too small ($([math]::Round($fileSize, 2)) MB), likely corrupted"
        }
        
        Write-ColorOutput "Download complete (Size: $([math]::Round($fileSize, 2)) MB)" "Green"
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-ColorOutput "Download error: $errorMsg" "Red"
        throw "Download failed: $_"
    }
    
    Write-ColorOutput "Installing Node.js..." "Cyan"
    Write-ColorOutput "Note: UAC prompt may appear, please click Yes to continue" "Yellow"
    
    try {
        $installProcess = Start-Process -FilePath "msiexec.exe" `
            -ArgumentList "/i", "`"$installerPath`"", "/passive", "/norestart" `
            -Wait -PassThru
        
        if ($installProcess.ExitCode -eq 0) {
            Write-ColorOutput "Installation completed successfully!" "Green"
            return $true
        }
        elseif ($installProcess.ExitCode -eq 3010) {
            Write-ColorOutput "Installation completed successfully! (Restart required)" "Green"
            return $true
        }
        else {
            throw "Installer returned error code: $($installProcess.ExitCode)"
        }
    }
    catch {
        throw "Installation failed: $_"
    }
    finally {
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Output ""
Write-Output "============================================"
Write-Output "  Node.js Auto Installer"
Write-Output "============================================"
Write-Output ""

try {
    $result = Install-NodeJS
    
    if ($result) {
        Write-Output ""
        Write-Output "============================================"
        Write-ColorOutput "  Installation Complete!" "Green"
        Write-Output "============================================"
        Write-Output ""
        Write-ColorOutput "Please close this window and restart the launcher." "Yellow"
        Write-Output ""
        
        exit 0
    }
}
catch {
    Write-Output ""
    Write-ColorOutput "Error: $_" "Red"
    Write-Output ""
    Write-Output "Auto-installation failed. Please try manual installation:"
    Write-Output "  1. Visit https://nodejs.org/"
    Write-Output "  2. Download the LTS version"
    Write-Output "  3. Run the installer"
    Write-Output ""
    Write-Output "Or use a package manager:"
    Write-Output "  - Chocolatey: choco install nodejs-lts"
    Write-Output "  - Scoop: scoop install nodejs-lts"
    Write-Output ""
    
    exit 1
}
