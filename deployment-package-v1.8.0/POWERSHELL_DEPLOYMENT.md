# PowerShell Deployment Guide v1.8.0
**Windows Production Deployment Instructions**

## Prerequisites

### 1. Install Node.js
```powershell
# Download and install Node.js 18+ from nodejs.org
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Git (if needed)
```powershell
# Using Chocolatey
choco install git

# Verify installation
git --version
```

## Quick Deployment

### 1. Extract Deployment Package
```powershell
# If you have the tar.gz file
tar -xzf resgrid-eso-bridge-v1.8.0.tar.gz
cd resgrid-eso-bridge-v1.8.0

# Or clone from repository
git clone <repository-url>
cd resgrid-eso-bridge
```

### 2. Install Dependencies
```powershell
# Install all required packages
npm install

# Verify installation
npm list --depth=0
```

### 3. Configure Environment
```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit .env file with your credentials
notepad .env
# OR
code .env
```

### 4. Set Environment Variables
```powershell
# Set required environment variables
$env:RESGRID_USER = "your_resgrid_username"
$env:RESGRID_PASS = "your_resgrid_password"
$env:GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"..."}'
$env:LOG_SHEET_ID = "your_google_sheet_id"

# Optional SFTP variables
$env:SFTP_PASS = "your_eso_password"
```

### 5. Start Service
```powershell
# Development mode
npm run dev

# Production mode
npm start

# Run in background (using PM2)
npm install -g pm2
pm2 start src/index.js --name "resgrid-eso-bridge"
```

## Production Setup with PM2

### Install Process Manager
```powershell
# Install PM2 globally
npm install -g pm2

# Start service with PM2
pm2 start src/index.js --name "resgrid-eso-bridge" --watch

# Set PM2 to start on system boot
pm2 startup
pm2 save
```

### PM2 Management Commands
```powershell
# View running processes
pm2 list

# View logs
pm2 logs resgrid-eso-bridge

# Restart service
pm2 restart resgrid-eso-bridge

# Stop service
pm2 stop resgrid-eso-bridge

# Monitor performance
pm2 monit
```

## System Verification

### Health Check Script
```powershell
# Run comprehensive system check
node system-status-check.js

# Expected output: 5/6 components operational
```

### Upload Status Verification
```powershell
# Verify Google Sheets upload status
node verify-upload-status.js

# Test upload status handling
node test-upload-status-fix.js
```

### Service Status Check
```powershell
# Check if service is running on port 8081
netstat -an | findstr :8081

# Test health endpoint (if running)
Invoke-WebRequest -Uri "http://localhost:8081/health" -Method GET
```

## Windows Service Installation

### Using NSSM (Non-Sucking Service Manager)
```powershell
# Download and install NSSM
choco install nssm

# Install as Windows Service
$nodePath = (Get-Command node).Source
$scriptPath = "$PWD\src\index.js"
nssm install ResgridESOBridge $nodePath $scriptPath

# Set service working directory
nssm set ResgridESOBridge AppDirectory $PWD

# Set environment variables for service
nssm set ResgridESOBridge AppEnvironmentExtra "RESGRID_USER=your_username" "RESGRID_PASS=your_password"

# Start service
nssm start ResgridESOBridge

# Check service status
nssm status ResgridESOBridge
```

## Firewall Configuration

### Allow Port Access
```powershell
# Allow inbound traffic on port 8081
New-NetFirewallRule -DisplayName "Resgrid-ESO Bridge" -Direction Inbound -Port 8081 -Protocol TCP -Action Allow

# Verify firewall rule
Get-NetFirewallRule -DisplayName "Resgrid-ESO Bridge"
```

## Environment Configuration

### .env File Template
```powershell
# Create .env file with PowerShell
@"
# Resgrid API Credentials
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
LOG_SHEET_ID=your_google_sheet_id

# ESO SFTP Configuration (Optional)
SFTP_HOST=sftp.esosuite.net
SFTP_USER=your_eso_username
SFTP_PASS=your_eso_password
SFTP_DIR=/your_upload_directory

# System Configuration
NODE_ENV=production
PORT=8081
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Secure Credential Storage
```powershell
# Store credentials securely using PowerShell SecureString
$securePass = Read-Host "Enter Resgrid Password" -AsSecureString
$encryptedPass = $securePass | ConvertFrom-SecureString
$encryptedPass | Out-File "resgrid-pass.txt"

# Load encrypted password
$encryptedPass = Get-Content "resgrid-pass.txt"
$securePass = $encryptedPass | ConvertTo-SecureString
$plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))
```

## Troubleshooting

### Common Issues

**Node.js Not Found**
```powershell
# Check if Node.js is in PATH
$env:PATH -split ';' | Where-Object { $_ -like "*node*" }

# Add Node.js to PATH if needed
$env:PATH += ";C:\Program Files\nodejs"
```

**Port Already in Use**
```powershell
# Find process using port 8081
Get-NetTCPConnection -LocalPort 8081

# Kill process if needed
Stop-Process -Id <ProcessId> -Force
```

**Permission Errors**
```powershell
# Run PowerShell as Administrator
Start-Process powershell -Verb RunAs

# Set execution policy if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Log Monitoring
```powershell
# Monitor application logs
Get-Content -Path "logs\app.log" -Wait -Tail 50

# Monitor Windows Event Log
Get-WinEvent -LogName Application | Where-Object {$_.ProviderName -eq "Node.js"}
```

## Deployment Automation Script

### Complete Deployment Script
```powershell
# deployment-script.ps1
param(
    [string]$ResgridUser,
    [string]$ResgridPass,
    [string]$GoogleServiceAccount,
    [string]$LogSheetId
)

Write-Host "Starting Resgrid-ESO Bridge deployment..." -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Create environment file
Write-Host "Creating environment configuration..." -ForegroundColor Yellow
@"
RESGRID_USER=$ResgridUser
RESGRID_PASS=$ResgridPass
GOOGLE_SERVICE_ACCOUNT_JSON=$GoogleServiceAccount
LOG_SHEET_ID=$LogSheetId
NODE_ENV=production
PORT=8081
"@ | Out-File -FilePath .env -Encoding UTF8

# Run system health check
Write-Host "Running system health check..." -ForegroundColor Yellow
node system-status-check.js

# Start service with PM2
Write-Host "Starting service with PM2..." -ForegroundColor Yellow
pm2 start src/index.js --name "resgrid-eso-bridge"

Write-Host "Deployment complete! Service is running." -ForegroundColor Green
Write-Host "Monitor with: pm2 logs resgrid-eso-bridge" -ForegroundColor Cyan
```

### Run Deployment Script
```powershell
# Make script executable and run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\deployment-script.ps1 -ResgridUser "your_user" -ResgridPass "your_pass" -GoogleServiceAccount '{"type":"service_account"...}' -LogSheetId "your_sheet_id"
```

## Monitoring and Maintenance

### Scheduled Tasks
```powershell
# Create scheduled task for health checks
$action = New-ScheduledTaskAction -Execute "node" -Argument "system-status-check.js" -WorkingDirectory $PWD
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
Register-ScheduledTask -TaskName "ResgridHealthCheck" -Action $action -Trigger $trigger
```

### Performance Monitoring
```powershell
# Monitor CPU and memory usage
Get-Process node | Select-Object Name, CPU, WorkingSet, Id

# Monitor network connections
Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 8081}
```

---

**PowerShell Version:** 5.1+  
**Windows Compatibility:** Windows 10/11, Windows Server 2016+  
**Node.js Version:** 18+  
**Deployment Package:** v1.8.0