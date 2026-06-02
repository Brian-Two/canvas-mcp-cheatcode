# Canvas MCP Integration Guide

## Overview

This document explains the Canvas MCP integration for the Tutor, which enables students to connect their Canvas LMS account to receive personalized help with assignments and exams using course materials as RAG context.

## Architecture

### Components

1. **Canvas MCP Client** (`src/canvasMCP.js`)
   - Direct REST API integration with Canvas LMS
   - Singleton client pattern for efficient API usage
   - Handles authentication via Bearer token
   - Provides methods for all Canvas operations

2. **Canvas Tools** (`src/tools/canvasTools.js`)
   - Four main tools exposed to the LLM:
     - `list_upcoming_assignments`: Lists upcoming work across all courses
     - `get_course_materials`: Retrieves course content for RAG
     - `get_assignment_details`: Gets specific assignment information
     - `get_page_content`: Reads detailed page content

3. **Enhanced Graph** (`src/graph.js`)
   - Integrated Canvas tools into LangGraph workflow
   - Tools are automatically called by the LLM when needed
   - Results are passed back through the conversation flow

4. **Updated System Prompt** (`src/systemPrompt.js`)
   - Canvas-aware instructions for the LLM
   - Guidance on when and how to use Canvas tools
   - RAG-based teaching methodology

## Workflow

### User Experience Flow

```
Student runs: npm run canvas
↓
LLM calls: list_upcoming_assignments()
↓
Canvas API returns: All upcoming assignments with due dates
↓
LLM presents: Formatted list of assignments
↓
Student selects: "Help me with assignment #123"
↓
LLM calls: get_assignment_details(course_id, assignment_id)
↓
LLM calls: get_course_materials(course_id)
↓
Canvas API returns: Course syllabus, modules, pages
↓
LLM uses RAG: Grounds questions in actual course materials
↓
Socratic dialogue: Student thinks critically through the subject
```

### Technical Flow

```javascript
User Input
  ↓
LangGraph State
  ↓
Agent Node (LLM)
  ↓
[Decides to call Canvas tool]
  ↓
Tools Node
  ↓
Canvas MCP Client
  ↓
Canvas REST API
  ↓
[Returns data]
  ↓
Tools Node (formats response)
  ↓
Agent Node (LLM processes)
  ↓
Final Response to User
```

## Canvas API Methods

### Course Operations

```javascript
canvasClient.getCourses()
// Returns all active courses for the user
// Includes enrollment info and total scores

canvasClient.getCourseSyllabus(courseId)
// Returns course name and syllabus HTML
// Used for high-level course overview

canvasClient.getCourseMaterials(courseId)
// Returns modules, pages, and files
// Core method for RAG context gathering

canvasClient.getCourseQuizzes(courseId)
// Lists all quizzes/exams in a course
```

### Assignment Operations

```javascript
canvasClient.getUpcomingAssignments(limit)
// Returns upcoming assignments across all courses
// Sorted by due date, filtered for future dates

canvasClient.getAssignmentDetails(courseId, assignmentId)
// Returns full assignment information
// Includes description, rubric, submission types

canvasClient.getSubmission(courseId, assignmentId, userId)
// Returns student's current submission status
// Shows score, attempt number, workflow state
```

### Content Operations

```javascript
canvasClient.getPageContent(courseId, pageUrl)
// Returns full HTML content of a page
// Used for accessing lecture notes and readings

canvasClient.getQuizDetails(courseId, quizId)
// Returns quiz/exam details
// Includes questions, time limit, attempts allowed
```

## RAG Implementation

### Current Approach

1. **Context Gathering**
   - Pull relevant course materials when student asks for help
   - Include syllabus, module content, and related pages
   - Limit initial data to prevent token overflow

2. **Context Usage**
   - LLM references course materials in its responses
   - Questions are grounded in what student has actually studied
   - Avoids hallucinating information not in the course

3. **Progressive Loading**
   - Start with assignment details and course overview
   - Pull specific pages only when needed for deeper dives
   - Use tool calls to fetch additional context on-demand

### Future Enhancements

- **Vector Embeddings**: Index all course materials for semantic search
- **Smart Chunking**: Break large documents into manageable chunks
- **Relevance Scoring**: Rank materials by relevance to current question
- **Caching**: Store frequently accessed materials to reduce API calls
- **Multi-Course Context**: Handle questions spanning multiple courses

## Security & Privacy

### API Token Security

- Token stored in `.env` file (not committed to git)
- Token has read-only access to Canvas
- No data is sent to third parties
- All processing happens locally

### Data Handling

- Canvas data is fetched on-demand
- No persistent storage of course materials
- Student submissions are only accessed when explicitly requested
- API responses are used only for current session

### Best Practices

1. **Token Management**
   - Generate tokens with minimal required permissions
   - Rotate tokens periodically
   - Revoke tokens when no longer needed

2. **Rate Limiting**
   - Canvas API has rate limits (~100 requests/10 seconds)
   - Client should implement backoff for failed requests
   - Batch requests when possible

3. **Error Handling**
   - All API calls wrapped in try-catch
   - Graceful fallbacks when Canvas is unavailable
   - Clear error messages for students

## Configuration

### Environment Variables

```bash
# Required
CANVAS_API_TOKEN=your_token_here

# Optional (with defaults)
CANVAS_API_URL=https://canvas.instructure.com/api/v1
NV_API_KEY=your_nvidia_key
NV_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5
```

### Custom Canvas Instances

Many universities run their own Canvas instances:

```bash
# Example: University of XYZ
CANVAS_API_URL=https://canvas.xyz.edu/api/v1

# Example: State University
CANVAS_API_URL=https://su.instructure.com/api/v1
```

To find your instance URL:
1. Log into your Canvas
2. Look at the browser URL
3. Use that domain with `/api/v1` appended

## Testing

### Manual Testing

```bash
# Test Canvas connection
node src/main.js --mode=canvas --msg="Show my courses"

# Test upcoming assignments
node src/main.js --mode=canvas --msg="What assignments do I have?"

# Test assignment help
node src/main.js --mode=canvas --msg="Help me with my physics homework"

# Test course materials
node src/main.js --mode=canvas --msg="What topics are covered in my CS course?"
```

### Expected Behaviors

✅ **Success Cases:**
- Lists upcoming assignments with due dates
- Shows course names and assignment names
- Retrieves course materials when helping with assignments
- Asks Socratic questions based on course content

❌ **Error Cases:**
- Invalid token: "Canvas API token not configured"
- No courses: "No active courses found"
- API error: "Canvas API error: [status code]"

## Troubleshooting

### Common Issues

1. **"Canvas API token not configured"**
   - Check `.env` file exists
   - Verify `CANVAS_API_TOKEN` is set
   - Ensure no extra spaces or quotes

2. **"Canvas API error: 401"**
   - Token is invalid or expired
   - Generate new token from Canvas settings
   - Update `.env` with new token

3. **"No upcoming assignments found"**
   - Check you're enrolled in active courses
   - Verify assignments have due dates set
   - Ensure courses are published

4. **"Cannot read course materials"**
   - Course may restrict API access
   - Check Canvas course settings
   - Contact instructor about API permissions

### Debug Mode

Add logging to see API calls:

```javascript
// In canvasMCP.js
async makeRequest(endpoint, method = 'GET', body = null) {
  console.log(`[Canvas API] ${method} ${endpoint}`); // Add this
  // ... rest of method
}
```

## Future Features

### Phase 2: Enhanced RAG
- Vector database integration (Pinecone/Weaviate)
- Semantic search over course materials
- Multi-document context windows
- Citation tracking for source materials

### Phase 3: Study Planning
- Generate study schedules based on Canvas calendar
- Prioritize assignments by difficulty and due date
- Track progress over time
- Send reminders for upcoming deadlines

### Phase 4: Collaborative Learning
- Study groups within courses
- Peer Q&A forums
- Shared flashcard sets
- Group study sessions

### Phase 5: Advanced Analytics
- Learning pattern analysis
- Performance predictions
- Personalized study recommendations
- Adaptive difficulty adjustment

## API Reference

### Canvas MCP Client API

```typescript
interface CanvasMCPClient {
  // Course methods
  getCourses(): Promise<Course[]>;
  getCourseSyllabus(courseId: number): Promise<Syllabus>;
  getCourseMaterials(courseId: number): Promise<Materials>;
  getCourseQuizzes(courseId: number): Promise<Quiz[]>;
  
  // Assignment methods
  getUpcomingAssignments(limit?: number): Promise<Assignment[]>;
  getAssignmentDetails(courseId: number, assignmentId: number): Promise<Assignment>;
  getSubmission(courseId: number, assignmentId: number, userId?: string): Promise<Submission>;
  
  // Content methods
  getPageContent(courseId: number, pageUrl: string): Promise<Page>;
  getQuizDetails(courseId: number, quizId: number): Promise<Quiz>;
}
```

### Tool Definitions

All tools follow OpenAI function calling format:

```javascript
{
  type: "function",
  function: {
    name: "tool_name",
    description: "What the tool does and when to use it",
    parameters: {
      type: "object",
      properties: { /* ... */ },
      required: [ /* ... */ ]
    }
  }
}
```

## Contributing

To add new Canvas tools:

1. Add method to `canvasMCP.js`
2. Create tool definition and handler in `canvasTools.js`
3. Import and register in `graph.js`
4. Add to system prompt if needed
5. Test with real Canvas data
6. Update this documentation

## Resources

- [Canvas REST API Documentation](https://canvas.instructure.com/doc/api/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [NVIDIA NIM Documentation](https://docs.nvidia.com/nim/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/Brian-Two/nvidia-hacks/issues
- Check Canvas API status: https://status.instructure.com/
- NVIDIA API status: https://build.nvidia.com/

