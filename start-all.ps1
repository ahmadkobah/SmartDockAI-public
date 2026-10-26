# SmartDockAI - Start All Services
# PowerShell script to start all SmartDockAI services

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "🚀 SmartDockAI - Starting All Services" -ForegroundColor Green  
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "🔧 Backend API: http://localhost:3000" -ForegroundColor Yellow
Write-Host "📚 API Docs: http://localhost:3000/api-docs" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:START_ALL_SERVICES = "true"
$env:NODE_ENV = "development"

Write-Host "🎯 Starting main server with all services..." -ForegroundColor Blue

# Start the application
try {
    node start-all.js
} catch {
    Write-Host "❌ Error starting SmartDockAI: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}