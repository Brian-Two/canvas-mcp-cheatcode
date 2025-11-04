# ASTAR - AI-Powered Critical Thinking Platform

**Preserve Critical Thinking**

An AI-powered learning platform that helps anyone think critically through complex problems using Socratic questioning. Integrated with Canvas LMS and multiple MCP servers for personalized assistance using course materials as RAG context.

## 🏗️ Project Structure

```
nvidia-hacks/
├── backend/           # Node.js + Express + LangGraph + NVIDIA NIM
│   ├── src/
│   │   ├── api/       # REST API server
│   │   ├── mcp/       # MCP server management
│   │   ├── tools/     # AI tools (Canvas, assignments, etc.)
│   │   └── ...
│   ├── package.json
│   └── README.md
│
├── frontend/          # React + Vite (Lovable generated)
│   ├── src/
│   ├── package.json
│   └── README.md      (To be added after Lovable build)
│
├── package.json       # Root monorepo scripts
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- NVIDIA API Key ([Get one here](https://build.nvidia.com/))
- Canvas API Token (from your Canvas account)

### 1. Clone Repository
```bash
git clone https://github.com/Brian-Two/nvidia-hacks.git
cd nvidia-hacks
```

### 2. Install All Dependencies
```bash
npm run install:all
```

### 3. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your API keys:
# - NV_API_KEY (NVIDIA)
# - CANVAS_API_TOKEN (Canvas)
```

### 4. Run Development Servers
```bash
# From root directory
npm run dev
```

This runs:
- **Backend:** http://localhost:3001
- **Frontend:** http://localhost:5173

---

## 📦 Backend

**Technology Stack:**
- Node.js + Express
- LangGraph (AI workflow)
- NVIDIA NIM (Llama 3.3 Nemotron)
- Canvas MCP Integration
- Multi-MCP Server Support

**Features:**
- ✅ Socratic AI tutoring
- ✅ Canvas LMS integration
- ✅ Multiple MCP servers (GitHub, Google Drive, Notion, Slack)
- ✅ RAG-powered assignment help
- ✅ Streaming chat responses
- ✅ Course material access

**Documentation:**
- [Backend README](./backend/README.md)
- [API Documentation](./backend/API_DOCUMENTATION.md)
- [MCP API Documentation](./backend/MCP_API_DOCUMENTATION.md)
- [Canvas Integration](./backend/CANVAS_INTEGRATION.md)

**Quick Commands:**
```bash
cd backend
npm run dev      # Start with auto-reload
npm start        # Production mode
npm run chat     # CLI test mode
```

---

## 🎨 Frontend

**Technology Stack:**
- React + TypeScript
- Vite
- Tailwind CSS
- Dark theme with emerald green + purple accents

**Features:**
- ✅ Canvas connection onboarding
- ✅ Assignment dashboard
- ✅ AI chat workbench
- ✅ MCP server management
- ✅ Modern, sleek UI

**Setup (After Lovable Build):**
```bash
cd frontend
npm install
# Create .env file:
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

**Design System:**
- Background: `#0F1419` (very dark)
- Cards: `#1C1F26`
- Primary: `#10B981` (emerald green)
- Accent: `#A855F7` (purple)
- Font: Inter

---

## 🔌 MCP Server Support

ASTAR supports multiple MCP (Model Context Protocol) servers:

| Service | Type | Description |
|---------|------|-------------|
| Canvas | `canvas` | Learning Management System |
| GitHub | `github` | Code repositories |
| Google Drive | `google_drive` | Cloud storage & docs |
| Notion | `notion` | Notes & knowledge base |
| Slack | `slack` | Team communication |
| Custom | `custom` | Any MCP-compatible server |

Users can connect multiple servers and the AI will automatically use them as tools.

---

## 📚 Documentation

### Backend
- **[Backend README](./backend/README.md)** - Setup and usage
- **[API Documentation](./backend/API_DOCUMENTATION.md)** - Complete API reference
- **[MCP API](./backend/MCP_API_DOCUMENTATION.md)** - MCP server management
- **[Canvas Integration](./backend/CANVAS_INTEGRATION.md)** - Canvas details
- **[Frontend Integration](./backend/FRONTEND_INTEGRATION.md)** - How to connect UI
- **[Quick Start](./backend/QUICK_START.md)** - Get running fast
- **[Future Vision](./backend/FUTURE_VISION.md)** - Roadmap

### Frontend
- **[Lovable Prompt](./backend/LOVABLE_PROMPT.md)** - UI build specifications
- Frontend README (after Lovable build)

---

## 🎯 Development Workflow

### Running Both Servers

**Option 1: Root Scripts (Recommended)**
```bash
# From nvidia-hacks/ directory
npm run dev              # Run both servers
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run install:all      # Install all dependencies
```

**Option 2: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Making Changes

**Backend Changes:**
1. Edit files in `backend/src/`
2. Server auto-reloads (using `--watch`)
3. Test with `curl` or Postman

**Frontend Changes:**
1. Edit files in `frontend/src/`
2. Vite hot-reloads automatically
3. See changes instantly in browser

---

## 🧪 Testing

### Backend API
```bash
# Health check
curl http://localhost:3001/health

# List assignments
curl http://localhost:3001/api/assignments

# Chat with AI
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain entropy"}'

# List MCP servers
curl http://localhost:3001/api/mcp/servers
```

### Frontend
- Open http://localhost:5173
- Connect Canvas account
- View assignments
- Chat with ASTAR

---

## 🚢 Deployment

### Backend

**Environment Variables:**
```env
NODE_ENV=production
PORT=3001
NV_API_KEY=your_nvidia_key
CANVAS_API_TOKEN=your_canvas_token
FRONTEND_URL=https://your-frontend-domain.com
```

**Deploy Options:**
- Railway
- Render
- Fly.io
- AWS/GCP/Azure
- Docker container

### Frontend

**Environment Variables:**
```env
VITE_API_URL=https://your-backend-domain.com
```

**Deploy Options:**
- Vercel
- Netlify
- Cloudflare Pages
- AWS Amplify

---

## 🎓 Core Features

### 1. Socratic Learning
- AI asks questions instead of giving answers
- Guides critical thinking
- Helps understand fundamentals
- Active recall and elaboration

### 2. Canvas Integration
- Direct access to courses and assignments
- Pull course materials for context
- Track due dates and priorities
- Submission status

### 3. Multi-MCP Support
- Connect GitHub for code help
- Use Google Drive for research materials
- Access Notion notes
- Reference Slack discussions
- Custom integrations

### 4. RAG-Powered
- Uses actual course materials
- Grounds responses in what you've learned
- Cites sources from syllabus/lectures
- Prevents hallucination

### 5. Modern UI
- Dark theme optimized for focus
- ChatGPT-inspired chat interface
- Card-based assignment view
- Responsive design

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **AI:** LangGraph + NVIDIA NIM
- **LLM:** Llama 3.3 Nemotron 49B
- **MCP:** Canvas, GitHub, Google Drive, Notion, Slack
- **Language:** JavaScript (ES Modules)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **UI Components:** Custom + shadcn/ui

---

## 📖 Learning Philosophy

ASTAR follows cognitive science principles:

- **Active Recall:** Retrieve information from memory
- **Elaboration:** Connect new knowledge to existing
- **Interleaving:** Mix different topics for deeper learning
- **Spaced Repetition:** Review at optimal intervals
- **Metacognition:** Think about your thinking
- **Socratic Method:** Questions lead to discovery

**The AI never gives direct answers.** It guides you to discover them yourself.

---

## 🤝 Contributing

This project is open source! Contributions welcome.

### Areas for Contribution
- New MCP server integrations
- Enhanced RAG capabilities
- Study plan generation
- Mobile apps
- Additional AI models
- UI/UX improvements

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 🔒 Security & Privacy

- **API Keys:** Stored server-side, never exposed to frontend
- **Canvas Data:** Stays local, not sent to third parties
- **User Privacy:** No data collection or tracking
- **Open Source:** Full transparency of code

---

## 📝 License

MIT License - See LICENSE file

---

## 🆘 Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/Brian-Two/nvidia-hacks/issues)
- **Documentation:** See docs in `/backend/` directory
- **API Status:** Check `/health` endpoint

---

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- Canvas integration
- Basic chat interface
- MCP server management
- Dark theme UI

### Phase 2 (Next)
- Study plan generation
- Spaced repetition system
- Progress tracking
- Mobile responsiveness

### Phase 3 (Future)
- Vector database RAG
- Multi-user support
- Study groups
- Instructor dashboard

See [FUTURE_VISION.md](./backend/FUTURE_VISION.md) for complete roadmap.

---

## 🌟 Credits

Built with:
- **NVIDIA NIM** - LLM inference
- **LangGraph** - AI workflow orchestration
- **Canvas LMS** - Learning management integration
- **Lovable** - Frontend development

---

## 📞 Contact

- **Repository:** https://github.com/Brian-Two/nvidia-hacks
- **Issues:** https://github.com/Brian-Two/nvidia-hacks/issues

---

**Made with ❤️ to bring back critical thinking in learning**

