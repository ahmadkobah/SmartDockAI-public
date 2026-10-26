# 🚀 SmartDockAI - Start All Services

This guide shows you how to start **all SmartDockAI services** with **one command**.

## 🎯 **Quick Start - All Services**

### **Option 1: NPM Script (Recommended)**
```bash
npm run all
```

### **Option 2: Windows Batch File**
```cmd
start-all.bat
```

### **Option 3: PowerShell Script**
```powershell
.\start-all.ps1
```

### **Option 4: Node.js Direct**
```bash
node start-all.js
```

## 📋 **What Gets Started**

When you run any of the above commands, the following services will start automatically:

✅ **Main Node.js Backend** - Port 3000
- API endpoints for all services
- Authentication system
- Database connections
- Route handling

✅ **React Frontend** - Port 5173
- Modern UI with all active buttons
- Complete Postman API collection implemented
- Responsive design with Tailwind CSS

✅ **Python OCR Service** - Port 8001
- Text extraction from images and PDFs
- Batch processing capabilities
- Multiple language support

✅ **Python ICR Service** - Port 8002
- Handwriting recognition
- Model training capabilities
- Custom model management

✅ **Python NLP Service** - Port 8003
- Entity extraction
- Sentiment analysis
- Text summarization

✅ **Python Document Intelligence** - Port 8004
- Document classification
- Information extraction
- Data validation

✅ **Python Model Registry** - Port 8005
- ML model management
- Version control
- Model deployment

## 🌐 **Access Points**

Once all services are running:

- **🎨 Frontend App**: http://localhost:5173
- **🔧 Backend API**: http://localhost:3000
- **📚 API Documentation**: http://localhost:3000/api-docs
- **💻 Health Check**: http://localhost:3000/health
- **🛠️ Service Status**: http://localhost:3000/api/services/status

## 🔄 **Service Management**

### **Start All Services**
```bash
npm run all
```

### **Stop All Services**
```bash
# Press Ctrl+C in the terminal where services are running
# OR use API endpoint:
curl -X POST http://localhost:3000/api/services/stop-all
```

### **Check Service Status**
```bash
curl http://localhost:3000/api/services/status
```

## ⚙️ **Environment Variables**

The startup scripts automatically set:
- `START_ALL_SERVICES=true` - Auto-starts all services
- `NODE_ENV=development` - Development mode

## 🛠️ **Prerequisites**

Make sure you have:
1. ✅ **Node.js** (v16 or higher)
2. ✅ **Python** (3.8 or higher)
3. ✅ **Virtual Environment** (`/.venv/` in project root)
4. ✅ **Dependencies installed** (`npm install`)

## 🎉 **Success Indicators**

When everything is working, you'll see:

```
🎉 SmartDockAI Services Started!
📱 Frontend: http://localhost:5173
🔧 Backend API: http://localhost:3000
📚 API Docs: http://localhost:3000/api-docs
💡 Tip: Your React app has all active buttons ready!
```

## 🔧 **Troubleshooting**

### **Python Services Won't Start**
- Check virtual environment exists: `/.venv/Scripts/python.exe`
- Install dependencies: `pip install -r requirements.txt`

### **Database Connection Errors**
- The main app will still start, Python services will continue
- Check PostgreSQL is running on port 5432

### **Port Conflicts**
- Make sure ports 3000, 5173, 8001-8005 are available
- Check no other services are using these ports

### **Permission Errors on PowerShell**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🎯 **Your Active Buttons Are Ready!**

Once all services are running, visit `http://localhost:5173/` to access your complete React application with **all active buttons implementing your Postman API collection functions**!

---

**🏆 One Command = Complete SmartDockAI Stack Running!** 🚀