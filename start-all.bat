@echo off
echo ===========================================
echo 🚀 SmartDockAI - Starting All Services
echo ===========================================
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend API: http://localhost:3000  
echo 📚 API Docs: http://localhost:3000/api-docs
echo ===========================================
echo.

set START_ALL_SERVICES=true
set NODE_ENV=development

echo 🎯 Starting main server with all services...
node start-all.js

pause