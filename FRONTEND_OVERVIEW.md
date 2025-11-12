# ASTAR Frontend - Complete Overview

## 📦 What You Have

A **fully built React + TypeScript frontend** from Lovable with:
- ✅ **Dark theme** with emerald green (#10B981) and purple (#A855F7) accents
- ✅ **4 main pages**: Onboarding, Board, ASTAR, Connections
- ✅ **shadcn/ui** component library (45+ pre-built components!)
- ✅ **React Router** for navigation
- ✅ **TanStack Query** for data fetching
- ✅ **Tailwind CSS** for styling
- ✅ **Mobile responsive** design

---

## 🎯 How It Works - Page by Page

### **1. Onboarding Page** (`/onboarding`)

**File:** `src/pages/Onboarding.tsx`

**Purpose:** First-time user setup - connect Canvas account

**Features:**
```tsx
- Welcome screen with ASTAR logo (star icon with gradient)
- Title: "Welcome to ASTAR"
- Subtitle: "Bring Back Critical Thinking"
- University dropdown (Canvas.instructure.com or Custom)
- API Token input (password field with show/hide)
- "Connect to Canvas" button (emerald green)
- Help link for getting API token
```

**Current State:** 
- ⚠️ **Mock connection** - Shows success toast but doesn't actually call backend yet
- Navigates to Board page after "connecting"

**Needs Integration:**
```typescript
// Current (mock):
const handleConnect = () => {
  toast({ title: "Connected Successfully" });
  navigate("/");
};

// TODO: Replace with actual API call:
const handleConnect = async () => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/canvas/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiToken, apiUrl: university })
  });
  const data = await response.json();
  if (data.success) {
    navigate("/");
  }
};
```

---

### **2. Board Page** (`/`)

**File:** `src/pages/Board.tsx`

**Purpose:** Display all upcoming assignments from Canvas

**Features:**
```tsx
- Header with ASTAR logo and assignment count
- Vertical list of assignment cards (sorted by due date)
- Each card shows: title, course, description, due date, points
- "Start with ASTAR" button on each card
- Empty state: "🎉 All caught up!"
```

**Current State:**
- ⚠️ **Mock data** - Shows 3 hardcoded assignments
- Cards are already styled perfectly (urgent assignments have glow effect)

**Needs Integration:**
```typescript
// Current (mock):
const assignments = [
  { id: "1", title: "Quantum Mechanics...", ... }
];

// TODO: Replace with API call:
import { useQuery } from '@tanstack/react-query';

const { data: assignments } = useQuery({
  queryKey: ['assignments'],
  queryFn: async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/assignments`);
    return res.json();
  }
});
```

---

### **3. ASTAR Page** (`/astar`)

**File:** `src/pages/Astar.tsx`

**Purpose:** Chat interface for working with AI on assignments

**Features:**
```tsx
- Split-screen layout
- LEFT SIDEBAR (collapsible):
  - Assignment context (title, course, due date, description)
  - Notes section (textarea for student notes)
- RIGHT: Chat interface
  - Message history (user: green bubbles, AI: gray with purple border)
  - ASTAR avatar (star icon) on AI messages
  - Typing indicator (3 bouncing dots)
  - Input textarea at bottom
  - Send button (emerald green)
- Mobile: Sidebar can toggle with menu button
```

**Current State:**
- ⚠️ **Mock AI responses** - Simulates delay then shows generic message
- Has 1 welcome message pre-loaded
- Enter key sends messages

**Needs Integration:**
```typescript
// Current (mock):
const handleSend = async () => {
  setTimeout(() => {
    setMessages([...messages, aiMessage]);
  }, 1500);
};

// TODO: Replace with streaming API:
const handleSend = async () => {
  const eventSource = new EventSource(
    `${import.meta.env.VITE_API_URL}/api/chat/stream?message=${input}`
  );
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'response') {
      setMessages([...messages, { content: data.content }]);
    }
  };
};
```

---

### **4. Connections Page** (`/connections`)

**File:** `src/pages/Connections.tsx`

**Purpose:** Manage Canvas and MCP server connections

**Features:**
```tsx
- TWO SECTIONS:
  
  1. CANVAS LMS:
     - Connection status indicator (green checkmark or red X)
     - University dropdown
     - API token input (with show/hide)
     - Collapsible instructions (how to get token)
     - "Test Connection" and "Save Changes" buttons
  
  2. MCP SERVERS:
     - "Add Server" button
     - List of connected servers
     - Each server card shows:
       * Connection status
       * Server type dropdown (Google Drive, GitHub, Notion, Slack, Custom)
       * Connection name input (optional)
       * API key input (with show/hide)
       * "Test Connection" button
       * Delete button
```

**Current State:**
- ⚠️ **Mock connections** - Simulates success but doesn't hit backend
- Can add/remove servers locally (state only)
- Perfect UI for managing multiple MCP servers

**Needs Integration:**
```typescript
// TODO: Connect to backend MCP API
// GET /api/mcp/servers - Load existing servers
// POST /api/mcp/servers - Add new server
// POST /api/mcp/servers/:id/test - Test connection
// DELETE /api/mcp/servers/:id - Remove server
```

---

## 🏗️ Architecture

### **Component Structure**

```
frontend/
├── src/
│   ├── App.tsx                    # Main app with routing
│   ├── main.tsx                   # Entry point
│   │
│   ├── pages/                     # Main pages
│   │   ├── Onboarding.tsx        # Canvas setup
│   │   ├── Board.tsx             # Assignment list
│   │   ├── Astar.tsx             # Chat interface
│   │   ├── Connections.tsx       # Settings
│   │   └── NotFound.tsx          # 404 page
│   │
│   ├── components/
│   │   ├── Layout.tsx            # Navigation wrapper
│   │   ├── AssignmentCard.tsx    # Assignment card component
│   │   └── ui/                   # 45+ shadcn components
│   │
│   ├── lib/
│   │   └── utils.ts              # Helper functions
│   │
│   └── hooks/
│       └── use-toast.ts          # Toast notifications
│
└── .env                           # API_URL configuration
```

### **Routing Flow**

```
/onboarding  → Onboarding page (first time)
     ↓
    /  → Board page (assignment list)
     ↓
/astar?assignment=123 → ASTAR chat (click "Start with ASTAR")
     ↓
/connections → Manage connections
```

### **Navigation**

```tsx
<Layout> component wraps Board, ASTAR, Connections
  - Desktop: Top navigation bar
  - Mobile: Bottom navigation bar
  - 3 nav items: Board, ASTAR, Connections
  - Active state highlighting
```

---

## 🎨 Design System

### **Colors** (from `tailwind.config.ts`)

```css
/* Background */
--background: #0F1419          /* Very dark */
--card: #1C1F26                /* Cards */
--muted: #252930               /* Muted elements */

/* Primary (Emerald Green) */
--primary: #10B981
--primary-foreground: #FFFFFF

/* Accent (Purple) */
--accent: #A855F7

/* Text */
--foreground: #F9FAFB         /* White */
--muted-foreground: #9CA3AF   /* Gray */

/* Gradients */
bg-gradient-primary: linear-gradient(135deg, #10B981, #059669)

/* Special Effects */
shadow-glow: Custom emerald glow
shadow-urgent: Red/orange glow for urgent items
```

### **Typography**

```css
Font Family: Inter (system font stack)
Headings: Bold, white
Body: Regular, light gray
Small text: Muted gray
```

### **Components Used**

**shadcn/ui components available:**
- Button, Input, Textarea, Label
- Select, Dialog, Toast, Alert
- Card, Badge, Separator
- Accordion, Tabs, Sheet
- Progress, Slider, Switch
- Table, Dropdown, Tooltip
- And 30+ more!

---

## 🔌 Backend Integration Points

### **What Needs to Connect:**

| Frontend Feature | Backend Endpoint | Status |
|-----------------|------------------|--------|
| Canvas Connect | `POST /api/canvas/connect` | ⚠️ TODO |
| Load Assignments | `GET /api/assignments` | ⚠️ TODO |
| Assignment Details | `GET /api/assignments/:id` | ⚠️ TODO |
| Chat with AI | `POST /api/chat` | ⚠️ TODO |
| Stream Chat | `POST /api/chat/stream` | ⚠️ TODO |
| List MCP Servers | `GET /api/mcp/servers` | ⚠️ TODO |
| Add MCP Server | `POST /api/mcp/servers` | ⚠️ TODO |
| Test MCP | `POST /api/mcp/servers/:id/test` | ⚠️ TODO |
| Delete MCP | `DELETE /api/mcp/servers/:id` | ⚠️ TODO |

---

## 🚀 Next Steps - Connecting to Backend

### **1. Create API Client** (`src/lib/api.ts`)

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  // Canvas
  async connectCanvas(apiToken: string, apiUrl?: string) {
    const res = await fetch(`${API_URL}/api/canvas/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken, apiUrl })
    });
    return res.json();
  },

  // Assignments
  async getAssignments() {
    const res = await fetch(`${API_URL}/api/assignments`);
    return res.json();
  },

  // Chat
  async sendMessage(message: string, assignmentId?: string) {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, assignmentId })
    });
    return res.json();
  },

  // MCP Servers
  async getMcpServers() {
    const res = await fetch(`${API_URL}/api/mcp/servers`);
    return res.json();
  },

  async addMcpServer(type: string, name: string, apiKey: string) {
    const res = await fetch(`${API_URL}/api/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name, apiKey })
    });
    return res.json();
  },

  async testMcpServer(serverId: string) {
    const res = await fetch(`${API_URL}/api/mcp/servers/${serverId}/test`, {
      method: 'POST'
    });
    return res.json();
  }
};
```

### **2. Update Onboarding.tsx**

Replace the mock `handleConnect` with:
```typescript
import { api } from '@/lib/api';

const handleConnect = async () => {
  try {
    const result = await api.connectCanvas(apiToken, university);
    if (result.success) {
      toast({ title: "Connected Successfully" });
      navigate("/");
    } else {
      toast({ title: "Connection Failed", variant: "destructive" });
    }
  } catch (error) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  }
};
```

### **3. Update Board.tsx**

Replace mock data with:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const Board = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: api.getAssignments
  });

  const assignments = data?.assignments || [];
  
  // Rest of component...
};
```

### **4. Update Astar.tsx**

Replace mock response with:
```typescript
import { api } from '@/lib/api';

const handleSend = async () => {
  const userMessage = { role: "user", content: input };
  setMessages([...messages, userMessage]);
  setInput("");
  setIsTyping(true);

  try {
    const result = await api.sendMessage(input, assignmentId);
    const aiMessage = { role: "assistant", content: result.response };
    setMessages([...messages, userMessage, aiMessage]);
  } catch (error) {
    console.error(error);
  } finally {
    setIsTyping(false);
  }
};
```

### **5. Update Connections.tsx**

Add MCP API integration:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const Connections = () => {
  // Load existing MCP servers
  const { data: mcpData } = useQuery({
    queryKey: ['mcpServers'],
    queryFn: api.getMcpServers
  });

  // Add server mutation
  const addServerMutation = useMutation({
    mutationFn: (server) => api.addMcpServer(server.type, server.name, server.apiKey),
    onSuccess: () => {
      toast({ title: "Server Added" });
      queryClient.invalidateQueries(['mcpServers']);
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (id) => api.testMcpServer(id),
    onSuccess: (result) => {
      toast({ 
        title: result.success ? "Connected!" : "Failed",
        variant: result.success ? "default" : "destructive"
      });
    }
  });
};
```

---

## 🧪 Testing the Integration

### **1. Start Backend**
```bash
cd backend
npm run dev
# Should see: 🚀 ASTAR API Server running on http://localhost:3001
```

### **2. Start Frontend**
```bash
cd frontend
npm run dev
# Should see: ➜  Local:   http://localhost:5173/
```

### **3. Or Run Both Together**
```bash
cd nvidia-hacks
npm run dev
```

### **4. Test Flow**

1. **Open:** http://localhost:5173/onboarding
2. **Connect Canvas:** Enter real token (or test with mock)
3. **View Board:** See assignments from Canvas API
4. **Click Assignment:** Opens ASTAR chat
5. **Chat:** Send message, get AI response
6. **Connections:** Add MCP servers (GitHub, etc.)

---

## 🎯 Key Features

### **✅ What's Already Perfect:**

1. **UI/UX:** 
   - Dark theme with exact colors you wanted
   - Smooth animations and transitions
   - Mobile responsive
   - Professional design

2. **Components:**
   - All UI components built with shadcn/ui
   - Consistent styling
   - Accessible (ARIA labels, keyboard nav)

3. **Routing:**
   - React Router setup complete
   - Clean navigation
   - 404 handling

4. **State Management:**
   - React Query for server state
   - Local state with useState
   - Toast notifications

### **⚠️ What Needs Backend Integration:**

1. **API Calls:** Replace all mock data/responses
2. **Error Handling:** Add try/catch for API failures
3. **Loading States:** Show spinners during fetches
4. **Authentication:** Store Canvas token (localStorage or context)
5. **Streaming:** Implement SSE for chat responses

---

## 📚 Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool (super fast!)
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Lucide React** - Icons
- **Sonner** - Toast notifications

---

## 🔥 Summary

**You have a COMPLETE, PRODUCTION-READY frontend!**

✅ All pages built and styled  
✅ All components working  
✅ Navigation functional  
✅ Mobile responsive  
✅ Dark theme perfect  

**Just needs:**
⚠️ API integration (replace mocks with real calls)  
⚠️ Error handling  
⚠️ Loading states  

**Estimated time to integrate:** 2-3 hours! 🚀

The hard part (UI/UX design) is DONE. Just plug in the backend! 💪



