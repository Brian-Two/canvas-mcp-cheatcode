# ASTAR Assignment Completion - Quick Start Guide

## Getting Started (5 Minutes)

### Prerequisites
- Node.js 20+ installed
- Canvas API token (optional, for Canvas integration)
- OpenAI/NVIDIA API key (for LLM features)

---

## Step 1: Start the Backend

```bash
cd nvidia-hacks/backend

# Install dependencies (if not done)
npm install

# Start the server
npm start
```

You should see:
```
🚀 ASTAR API Server running on http://localhost:3001
```

---

## Step 2: Start the Frontend

In a new terminal:

```bash
cd nvidia-hacks/frontend

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

---

## Step 3: Access ASTAR Assignment Assistant

### Option A: Direct Access (No Canvas Required)

1. Navigate to: **http://localhost:5173/astar/assignment**
2. Click **"Try Demo Assignment"**
3. See ASTAR analyze a sample ML project assignment
4. Interact with the step-by-step journey:
   - Click any step to mark it "in progress"
   - Click again to mark "completed"
   - Click again to reset to "not started"
5. Complete all steps to see the completion button

### Option B: With Canvas Integration

1. Navigate to: **http://localhost:5173/onboarding**
2. Connect your Canvas account:
   - Enter your Canvas API token
   - Select your Canvas URL
   - Click "Continue"
3. Navigate to **Board** to see your real assignments
4. Click **"Start with ASTAR"** on any assignment
5. ASTAR will auto-analyze and create a journey!

### Option C: Manual Assignment Entry

1. Navigate to: **http://localhost:5173/astar/assignment**
2. Click **"Paste Assignment Manually"**
3. Enter:
   - Assignment title
   - Full assignment description
4. Click **"Analyze Assignment"**
5. See your custom analysis and journey!

---

## What You'll See

### 1. Analysis Summary (Left Side)

- **Assignment Type** - Essay, coding project, problem set, etc.
- **Estimated Time** - How long it will take (in hours)
- **Required Skills** - What you need to know
- **Prerequisites** - What to review first
- **Deliverables** - What you need to submit
- **Success Criteria** - How to know you're done right

### 2. Journey Stepper (Right Side)

- **Progress Bar** - Visual completion percentage
- **Interactive Steps** - Click to mark progress
- **Time Estimates** - Per-step and total time
- **Resources** - Helpful links and tools per step
- **Completion Button** - Appears when all steps are done

---

## Testing the API Directly

### Test Assignment Analysis Endpoint

```bash
curl -X POST http://localhost:3001/api/assignments/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "assignment": {
      "id": "test_1",
      "title": "Write an Essay on Climate Change",
      "rawDescription": "Write a 5-page essay discussing the causes and effects of climate change. Include at least 5 scholarly sources cited in APA format. Due next Friday."
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": {
    "type": "essay",
    "estimatedTimeHours": 3,
    "requiredSkills": ["research", "writing", "critical thinking", "academic citations"],
    ...
  },
  "journey": {
    "totalEstimatedMinutes": 190,
    "steps": [
      {
        "title": "Understand the prompt",
        "description": "Read the assignment carefully...",
        "estimatedMinutes": 15
      },
      ...
    ]
  }
}
```

---

## Assignment Types & Journey Templates

ASTAR automatically detects and creates appropriate journeys for:

### 📝 Essay
1. Understand prompt
2. Brainstorm & research
3. Create outline
4. Write first draft
5. Revise & polish
6. Final review

### 💻 Coding Project
1. Understand requirements
2. Setup GitHub repository
3. Implement core features
4. Add tests
5. Document your code
6. Final testing & cleanup

### 🧮 Problem Set
1. Review relevant concepts
2. Read all problems
3. Solve problems
4. Check your work
5. Format and finalize

### 📚 Research Paper
1. Understand requirements
2. Choose and narrow topic
3. Conduct research
4. Create detailed outline
5. Write first draft
6. Revise and refine
7. Final polish

### 🎤 Presentation
1. Understand requirements
2. Research and gather content
3. Create outline and structure
4. Design slides
5. Write speaker notes
6. Practice and refine

---

## Troubleshooting

### Backend Issues

**Port 3001 already in use:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in backend/.env:
PORT=3002
```

**Missing environment variables:**
```bash
# Create backend/.env
cp backend/.env.example backend/.env

# Add your keys:
OPENAI_API_KEY=your_key_here
# or
NV_API_KEY=your_nvidia_key_here
```

### Frontend Issues

**Port 5173 already in use:**
```bash
# Kill process
lsof -ti:5173 | xargs kill -9

# Or it will auto-prompt for next available port
```

**Can't connect to backend:**
- Check backend is running on port 3001
- Check `frontend/.env` or `vite.config.ts` for API_URL
- Default should be: `http://localhost:3001`

### Canvas Integration Issues

**Can't connect to Canvas:**
1. Verify your Canvas API token is correct
2. Check token has necessary permissions
3. Try the Canvas test endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/canvas/connect \
     -H "Content-Type: application/json" \
     -d '{"apiToken": "YOUR_TOKEN"}'
   ```

---

## Next Steps

### Try Different Assignment Types

Test ASTAR with various assignment types to see different journey templates:

1. **Coding Project:**
   ```
   Title: "Build a Weather App"
   Description: "Create a React app that fetches weather data from an API. 
   Deploy on Vercel. Submit GitHub repository link."
   ```

2. **Essay:**
   ```
   Title: "Analyze Shakespeare's Hamlet"
   Description: "Write a 3-page analytical essay on the theme of revenge in Hamlet. 
   Include textual evidence and MLA citations."
   ```

3. **Problem Set:**
   ```
   Title: "Calculus Problem Set 5"
   Description: "Complete problems 1-15 from Chapter 5. Show all work. 
   Submit handwritten solutions or typed in LaTeX."
   ```

### Customize the Experience

- Modify journey templates in `backend/src/services/assignmentAnalysisService.js`
- Adjust time estimates based on your experience
- Add new assignment type detectors
- Customize success criteria

### Integrate More Features

Phase 1 complete! Ready for Phase 2:
- [ ] Persist progress to database
- [ ] Add LLM-powered analysis
- [ ] Smart MCP integration suggestions
- [ ] Canvas submission integration
- [ ] Learning resource recommendations

---

## Need Help?

- **Backend logs:** Check terminal where you ran `npm start`
- **Frontend logs:** Open browser DevTools Console (F12)
- **API logs:** Watch backend terminal for request/response logs

---

## Demo Assignment Details

The built-in demo assignment is:

**Title:** CSCI 475: Learning Styles Classification Project

**Type:** Coding project with research paper component

**Analysis Results:**
- Type: `coding_project`
- Skills: Python, machine learning, research, writing
- Time: ~12-15 hours total
- Deliverables: GitHub repo, research paper (5 pages), presentation slides

Perfect for testing the full ASTAR experience!

---

Enjoy using ASTAR Assignment Completion Assistant! 🌟

