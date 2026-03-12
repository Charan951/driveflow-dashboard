# Development Startup Script for DriveFlow Application
# This script starts both backend and frontend in development mode

Write-Host "🚀 Starting DriveFlow Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

# Check backend dependencies
if (!(Test-Path "backend/node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Check frontend dependencies
if (!(Test-Path "frontend/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "🎯 Starting services..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend will run on: http://localhost:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/backend'; Write-Host '🔧 Backend Server Starting...' -ForegroundColor Cyan; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; Write-Host '🎨 Frontend Server Starting...' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ Both services started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Quick Commands:" -ForegroundColor Cyan
Write-Host "  - Backend logs: Check the backend PowerShell window"
Write-Host "  - Frontend logs: Check the frontend PowerShell window"
Write-Host "  - Stop services: Close both PowerShell windows or press Ctrl+C in each"
Write-Host ""
