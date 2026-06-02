# Backend - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your keys:
# - NV_API_KEY (get from https://build.nvidia.com/)
# - CANVAS_API_TOKEN (get from Canvas: Account > Settings > New Access Token)
```

### 3. Run the API Server
```bash
npm run dev
```

Server will start on **http://localhost:3001** 🎉

---

## ✅ Verify It's Working

### Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T10:00:00.000Z",
  "version": "1.0.0"
}
```

### Test Canvas connection:
```bash
curl http://localhost:3001/api/canvas/status
```

### Test getting assignments:
```bash
curl http://localhost:3001/api/assignments
```

---

## 📱 When Your Frontend is Ready

### 1. Download from Lovable
- Download your Lovable project as ZIP
- Extract to `../astar-frontend/` (next to this backend folder)

### 2. Configure Frontend
Create `../astar-frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Run Both Together
**Terminal 1 (Backend):**
```bash
cd astar-tutor
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd astar-frontend
npm run dev
```

Frontend will run on **http://localhost:5173**

---

## 📚 Available Scripts

```bash
npm run dev       # Start with auto-reload (development)
npm start         # Start server (production)
npm run api       # Alias for 'npm start'
npm run chat      # CLI chat mode (test LLM)
npm run canvas    # CLI Canvas mode (test Canvas integration)
```

---

## 🔗 API Endpoints

Once server is running, these endpoints are available:

### Canvas
- `POST /api/canvas/connect` - Connect to Canvas
- `GET /api/canvas/status` - Check connection status

### Assignments
- `GET /api/assignments` - List upcoming assignments
- `GET /api/assignments/:id?courseId=:courseId` - Get assignment details

### Course Materials
- `GET /api/courses/:id/materials` - Get course materials
- `GET /api/courses/:id/syllabus` - Get course syllabus

### Chat (LLM)
- `POST /api/chat` - Send message to AI
- `POST /api/chat/stream` - Stream AI responses (SSE)

Full documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Change port in .env
PORT=3002
```

### Canvas Token Invalid
```bash
# Generate new token:
# 1. Log into Canvas
# 2. Account → Settings
# 3. Scroll to "Approved Integrations"
# 4. Click "+ New Access Token"
# 5. Copy token and update .env
```

### NVIDIA API Errors
```bash
# Verify your key is set correctly in .env
# Get a new key from: https://build.nvidia.com/
```

---

## 📖 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Frontend Integration](./FRONTEND_INTEGRATION.md)** - How to connect your UI
- **[Canvas Integration](./CANVAS_INTEGRATION.md)** - Canvas MCP details
- **[Future Vision](./FUTURE_VISION.md)** - Roadmap and features

---

## 🎯 Next Steps

1. ✅ Backend running
2. ⏳ Build frontend in Lovable
3. ⏳ Download and integrate frontend
4. ⏳ Test the full workflow
5. ⏳ Deploy to production

---

## 💡 Tips

- Keep the terminal open to see real-time logs
- Test with `curl` or Postman before connecting frontend
- Check logs if something doesn't work
- Use `npm run chat` to test LLM without Canvas
- Use `npm run canvas` to test Canvas integration

---

## 🆘 Need Help?

- Check [Troubleshooting](./FRONTEND_INTEGRATION.md#-troubleshooting)
- Review [API Documentation](./API_DOCUMENTATION.md)
- Open an issue on [GitHub](https://github.com/Brian-Two/nvidia-hacks)

---

**Happy Coding!** 🚀✨

