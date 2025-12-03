# Phase 2 Testing Guide

## Quick Start

### 1. Start Backend

```bash
cd nvidia-hacks/backend
export USE_AI_JOURNEY=true
export NV_API_KEY="your_nvidia_api_key"
export CANVAS_API_TOKEN="your_canvas_token"  # Optional for Canvas features
npm start
```

Backend runs on: **http://localhost:3001**

### 2. Start Frontend

```bash
cd nvidia-hacks/frontend
npm run dev
```

Frontend runs on: **http://localhost:8080**

---

## Test 1: Canvas-Aware Journey (5 min)

### Prerequisites
- Canvas API token configured
- Canvas course with assignments

### Steps

1. Open http://localhost:8080/astar and analyze a Canvas assignment

### Expected Results

**Backend Console:**
```
🤖 Using AI to generate personalized journey
🎓 Fetching Canvas context for course 12345
✅ Canvas context fetched: 8 modules, 4 pages
✅ [AI Journey] Generated { steps: 9, totalMinutes: 480 }
✅ Enhanced journey with MCP action suggestions
```

**Frontend:**
- "Course Context" card appears at top
- Shows course modules
- Shows clickable Canvas page links
- Step descriptions reference Canvas materials (e.g., "Review Module 3...")

---

## Test 2: MCP Action Buttons (3 min)

### Prerequisites
- GitHub personal access token
- GitHub MCP connected

### Setup GitHub MCP

```bash
curl -X POST http://localhost:3001/api/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "type": "github",
    "name": "My GitHub",
    "apiKey": "ghp_your_token_here"
  }'
```

Verify connected:
```bash
curl http://localhost:3001/api/mcp/servers
# Should show GitHub server with status: "connected"
```

### Steps

1. Create and analyze a coding assignment
2. Navigate to Step 2 (usually "Setup" or "Initialize Repository")

### Expected Results

**Step Display:**
```
Step 2: Setup GitHub Repository
────────────────────────────────

[Step description...]

⚡ Quick Actions:
┌──────────────────────────┐
│ [GitHub Icon] Create     │
│ GitHub Repository        │
└──────────────────────────┘

📚 Resources:
...
```

**Click "Create GitHub Repository":**
- Success toast appears and new browser tab opens with GitHub repo

---

## Test 3: Graceful Degradation (2 min)

### Test A: No Canvas Token

```bash
# Unset Canvas token
unset CANVAS_API_TOKEN
# Restart backend
```

**Expected:**
- Assignment analysis still works
- Journey generation still works
- "Course Context" card doesn't appear
- No errors shown to user

### Test B: No GitHub MCP

```bash
# Delete GitHub MCP server
curl -X DELETE http://localhost:3001/api/mcp/servers/github_default
```

**Expected:**
- Assignment analysis still works
- Journey generation still works
- "Quick Actions" section doesn't appear
- No errors shown to user

### Test C: AI Disabled

```bash
export USE_AI_JOURNEY=false
# Restart backend
```

**Expected:**
- Falls back to template-based journey
- Still generates 6-7 steps
- MCP actions still work (added to template steps)
- Canvas context not used (but fetched for display)

---

## Test 4: End-to-End Demo (5 min)

### Complete User Journey

1. **Setup**: Backend running with `USE_AI_JOURNEY=true`, GitHub MCP connected, Canvas token configured
2. **Select Assignment**: Go to http://localhost:8080/astar and choose a Canvas assignment
3. **Analyze**: Click "Analyze Assignment" and view generated journey
4. **Explore Context**: See "Course Context" card with modules and links
5. **Use MCP Action**: Click "Create GitHub Repository" button on setup step
6. **Continue Working**: Add notes, mark steps complete, and auto-advance
7. **Verify Persistence**: Refresh page and verify all progress saved

---

## Troubleshooting

### "Canvas context failed to fetch"

**Fix:** Check Canvas token and verify Canvas API URL

### "GitHub MCP not connected"

**Fix:** List MCP servers and verify GitHub token has `repo` scope

### "AI journey generation failed"

**Fix:** Check NVIDIA API key and review backend logs for error details

### "No action buttons appear"

**Fix:** Verify GitHub MCP is connected and assignment is coding type

---

## Success Checklist

Phase 2 is working correctly if:

- [ ] Canvas context displays for Canvas assignments
- [ ] Canvas page links open correctly
- [ ] AI-generated steps reference Canvas modules
- [ ] GitHub action button appears for coding setup steps
- [ ] Clicking GitHub button creates repo successfully
- [ ] Success toast appears with repo URL
- [ ] Repo opens in new tab
- [ ] System works without Canvas token (no errors)
- [ ] System works without GitHub MCP (no errors)
- [ ] Template mode still generates journeys
- [ ] No console errors in browser
- [ ] No backend errors in terminal

---

## Demo Script for Stakeholders

**Setup (before demo):**
1. Start backend with all features enabled
2. Start frontend
3. Connect GitHub MCP
4. Open Canvas assignment in another tab for reference

**Demo (3 minutes):**

Show ASTAR → Select Canvas assignment → Analyze → Point out Canvas context → Navigate to setup step → Click "Create GitHub Repository" → Show success and repo creation

---

## Next Phase Preview

Google Docs integration, smart repo detection, RAG over course materials, action history tracking, custom suggestion rules

---

Ready to test! Start with **Test 1** to verify Canvas integration. 🚀

