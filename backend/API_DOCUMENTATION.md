# API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
Currently, Canvas API token is stored server-side in `.env`. Future versions will support user-specific tokens via authentication headers.

---

## Endpoints

### Health Check

#### `GET /health`
Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Canvas Connection

#### `POST /api/canvas/connect`
Test and establish Canvas API connection.

**Request Body:**
```json
{
  "apiToken": "your_canvas_token",
  "apiUrl": "https://canvas.instructure.com/api/v1"  // Optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully connected to Canvas",
  "courses": [
    {
      "id": 12345,
      "name": "Physics 101",
      "course_code": "PHYS101",
      "enrollment_term_id": 1
    }
  ]
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid Canvas API token"
}
```

#### `GET /api/canvas/status`
Check current Canvas connection status.

**Response:**
```json
{
  "connected": true,
  "lastSync": "2025-10-28T10:00:00.000Z",
  "courseCount": 5
}
```

---

### Assignments

#### `GET /api/assignments`
Get list of upcoming assignments across all courses.

**Query Parameters:**
- `limit` (optional): Maximum number of assignments to return (default: 20)

**Example:**
```
GET /api/assignments?limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "assignments": [
    {
      "id": 123,
      "name": "Physics Homework #3",
      "course_name": "Physics 101",
      "course_id": 456,
      "due_at": "2025-10-30T23:59:00Z",
      "points_possible": 50,
      "url": "https://canvas.../assignments/123"
    }
  ]
}
```

#### `GET /api/assignments/:assignmentId`
Get detailed information about a specific assignment.

**Path Parameters:**
- `assignmentId`: The Canvas assignment ID

**Query Parameters:**
- `courseId` (required): The Canvas course ID

**Example:**
```
GET /api/assignments/123?courseId=456
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "id": 123,
    "name": "Physics Homework #3",
    "description": "<p>Complete problems 1-10...</p>",
    "due_at": "2025-10-30T23:59:00Z",
    "points_possible": 50,
    "submission_types": ["online_text_entry", "online_upload"],
    "rubric": [...],
    "grading_type": "points"
  }
}
```

---

### Course Materials

#### `GET /api/courses/:courseId/materials`
Get all materials for a specific course (modules, pages, files).

**Path Parameters:**
- `courseId`: The Canvas course ID

**Example:**
```
GET /api/courses/456/materials
```

**Response:**
```json
{
  "success": true,
  "materials": {
    "modules": [
      {
        "id": 789,
        "name": "Week 1: Introduction",
        "items": [
          {
            "title": "Lecture Notes",
            "type": "Page",
            "url": "https://canvas.../pages/..."
          }
        ]
      }
    ],
    "pages": [
      {
        "url": "introduction-to-physics",
        "title": "Introduction to Physics",
        "body": "..."
      }
    ],
    "files_count": 12
  }
}
```

#### `GET /api/courses/:courseId/syllabus`
Get the syllabus for a specific course.

**Path Parameters:**
- `courseId`: The Canvas course ID

**Response:**
```json
{
  "success": true,
  "syllabus": {
    "course_name": "Physics 101",
    "syllabus": "<p>Course Description...</p>"
  }
}
```

---

### Chat (LLM Interaction)

#### `POST /api/chat`
Send a message to the ASTAR AI and get a response.

**Request Body:**
```json
{
  "message": "What is Newton's First Law?",
  "assignmentId": 123,           // Optional: for assignment context
  "courseId": 456,                // Optional: required if assignmentId provided
  "conversationHistory": [        // Optional: for multi-turn conversations
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Before I explain Newton's First Law, can you tell me what you currently understand about the relationship between force and motion?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "What is Newton's First Law?"
    },
    {
      "role": "assistant",
      "content": "Before I explain..."
    }
  ],
  "toolCalls": []
}
```

**With Assignment Context:**
```json
{
  "message": "Help me get started",
  "assignmentId": 123,
  "courseId": 456
}
```

The AI will automatically:
1. Fetch assignment details
2. Retrieve relevant course materials
3. Provide context-aware guidance

#### `POST /api/chat/stream`
Stream AI responses in real-time using Server-Sent Events (SSE).

**Request Body:** Same as `/api/chat`

**Response:** Server-Sent Events stream

**Event Types:**

1. **Status Event:**
```json
{
  "type": "status",
  "message": "Loading assignment details..."
}
```

2. **Context Event:**
```json
{
  "type": "context",
  "assignment": "Physics Homework #3",
  "course": "Physics 101"
}
```

3. **Response Event:**
```json
{
  "type": "response",
  "content": "Before I explain Newton's First Law..."
}
```

4. **Done Event:**
```json
{
  "type": "done"
}
```

5. **Error Event:**
```json
{
  "type": "error",
  "message": "Error message here"
}
```

**Frontend Example (JavaScript):**
```javascript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Help me understand entropy',
    assignmentId: 123,
    courseId: 456
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'status':
      console.log('Status:', data.message);
      break;
    case 'response':
      console.log('AI:', data.content);
      break;
    case 'done':
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.message);
      eventSource.close();
      break;
  }
};
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details (in development mode)",
  "timestamp": "2025-10-28T10:00:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `401` - Unauthorized (invalid Canvas token)
- `404` - Not Found
- `500` - Internal Server Error

---

## CORS Configuration

The API allows requests from:
- `http://localhost:5173` (default Vite dev server)
- Custom frontend URL set via `FRONTEND_URL` environment variable

For production, update `FRONTEND_URL` in `.env`:
```env
FRONTEND_URL=https://your-production-domain.com
```

---

## Rate Limiting

Currently no rate limiting. Consider adding in production:
- Per-user rate limits
- Per-IP rate limits
- Canvas API rate limit handling

---

## Development

### Start the API server:
```bash
cd astar-tutor
npm run dev
```

Server runs with auto-reload on code changes (Node.js `--watch` flag).

### Test endpoints:
```bash
# Health check
curl http://localhost:3001/health

# Get assignments
curl http://localhost:3001/api/assignments

# Chat
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me understand Newton'\''s Laws"}'
```

---

## Frontend Integration

### Setup API Client (React/TypeScript):

**`src/api/client.ts`:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  // Canvas
  connectCanvas: async (apiToken: string, apiUrl?: string) => {
    const res = await fetch(`${API_URL}/api/canvas/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken, apiUrl })
    });
    return res.json();
  },

  getCanvasStatus: async () => {
    const res = await fetch(`${API_URL}/api/canvas/status`);
    return res.json();
  },

  // Assignments
  getAssignments: async (limit = 20) => {
    const res = await fetch(`${API_URL}/api/assignments?limit=${limit}`);
    return res.json();
  },

  getAssignment: async (assignmentId: number, courseId: number) => {
    const res = await fetch(
      `${API_URL}/api/assignments/${assignmentId}?courseId=${courseId}`
    );
    return res.json();
  },

  // Course Materials
  getCourseMaterials: async (courseId: number) => {
    const res = await fetch(`${API_URL}/api/courses/${courseId}/materials`);
    return res.json();
  },

  // Chat
  sendMessage: async (message: string, options?: {
    assignmentId?: number;
    courseId?: number;
    conversationHistory?: Array<{role: string, content: string}>;
  }) => {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...options })
    });
    return res.json();
  }
};
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3001
```

---

## Production Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.com
NV_API_KEY=your_key
CANVAS_API_TOKEN=your_token
```

### Recommended Production Setup:
1. Use PM2 or similar process manager
2. Add HTTPS (reverse proxy with nginx/Caddy)
3. Implement authentication (JWT tokens)
4. Add rate limiting
5. Set up logging (Winston, Pino)
6. Monitor with tools like New Relic or DataDog

### Docker Deployment (Optional):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## Next Steps

### Planned Features:
- [ ] User authentication (JWT)
- [ ] Per-user Canvas tokens
- [ ] WebSocket support for real-time chat
- [ ] Assignment submission endpoints
- [ ] Study plan generation API
- [ ] Analytics endpoints
- [ ] Rate limiting
- [ ] Request caching
- [ ] Vector database integration for RAG

---

## Support

For issues or questions:
- GitHub: https://github.com/Brian-Two/nvidia-hacks
- Check logs: Server logs to console with timestamps
- Health check: `GET /health` to verify server is running

## Version History

- **v1.0.0** (2025-10-28): Initial API release
  - Canvas integration endpoints
  - Assignment management
  - LLM chat with streaming support
  - Course materials access

