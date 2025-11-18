// ASTAR API Server - Express server wrapping LangGraph workflow
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// TEMPORARILY COMMENTED OUT TO DEBUG - UNCOMMENT AFTER TESTING
// import { buildGraph } from '../graph.js';
import { canvasClient } from '../canvasMCP.js';
import { mcpManager, MCP_TYPES } from '../mcp/mcpManager.js';
import { analyzeAssignment, buildJourneyFromAnalysis } from '../services/assignmentAnalysisService.js';
import { reviewAssignment } from '../services/assignmentReviewService.js';

console.log('🔵 Server file loaded! Starting setup...');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS - Allow multiple frontend origins during development
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Canvas Connection Endpoints
app.post('/api/canvas/connect', async (req, res) => {
  try {
    const { apiToken, apiUrl } = req.body;
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Test connection by fetching courses
    const testClient = canvasClient;
    testClient.token = apiToken;
    if (apiUrl) {
      testClient.baseUrl = apiUrl;
    }

    const courses = await testClient.getCourses();
    
    if (courses.error) {
      return res.status(401).json({ 
        success: false,
        error: courses.error 
      });
    }

    res.json({ 
      success: true,
      message: 'Successfully connected to Canvas',
      courses: courses.slice(0, 5) // Return first 5 courses
    });
  } catch (error) {
    console.error('Canvas connection error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.get('/api/canvas/status', async (req, res) => {
  try {
    const hasToken = !!canvasClient.token;
    
    if (!hasToken) {
      return res.json({
        connected: false,
        message: 'Canvas API token not configured'
      });
    }

    // Test connection
    const courses = await canvasClient.getCourses();
    
    res.json({
      connected: !courses.error,
      lastSync: new Date().toISOString(),
      courseCount: courses.error ? 0 : courses.length
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message
    });
  }
});

// MCP Server Management Endpoints
app.get('/api/mcp/servers', async (req, res) => {
  try {
    const servers = mcpManager.getAllServers();
    res.json({
      success: true,
      count: servers.length,
      servers: servers.map(s => s.toJSON())
    });
  } catch (error) {
    console.error('Get MCP servers error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mcp/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const server = mcpManager.getServer(id);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({
      success: true,
      server: server.toJSON()
    });
  } catch (error) {
    console.error('Get MCP server error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mcp/servers', async (req, res) => {
  try {
    const { type, name, apiKey, apiUrl, config } = req.body;
    
    if (!type || !name) {
      return res.status(400).json({ 
        error: 'Type and name are required' 
      });
    }

    // Validate type
    if (!Object.values(MCP_TYPES).includes(type)) {
      return res.status(400).json({ 
        error: `Invalid MCP type. Must be one of: ${Object.values(MCP_TYPES).join(', ')}` 
      });
    }

    const server = mcpManager.addServer({
      type,
      name,
      apiKey,
      apiUrl,
      config
    });

    res.json({
      success: true,
      message: 'MCP server added successfully',
      server: server.toJSON()
    });
  } catch (error) {
    console.error('Add MCP server error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mcp/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const server = mcpManager.updateServer(id, updates);
    
    res.json({
      success: true,
      message: 'MCP server updated successfully',
      server: server.toJSON()
    });
  } catch (error) {
    console.error('Update MCP server error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mcp/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mcpManager.deleteServer(id);
    
    res.json(result);
  } catch (error) {
    console.error('Delete MCP server error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mcp/servers/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mcpManager.testServer(id);
    
    res.json(result);
  } catch (error) {
    console.error('Test MCP server error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.get('/api/mcp/stats', async (req, res) => {
  try {
    const stats = mcpManager.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get MCP stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mcp/tools', async (req, res) => {
  try {
    const tools = await mcpManager.getAvailableTools();
    res.json({
      success: true,
      count: tools.length,
      tools
    });
  } catch (error) {
    console.error('Get MCP tools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute GitHub MCP tool
app.post('/api/mcp/github/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    
    console.log(`🔧 Executing GitHub tool: ${toolName}`);
    console.log('   Parameters:', JSON.stringify(parameters, null, 2));
    
    // Get GitHub server
    const githubServers = mcpManager.getServersByType(MCP_TYPES.GITHUB)
      .filter(s => s.status === 'connected');
    
    if (githubServers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No GitHub MCP server connected'
      });
    }
    
    const githubServer = githubServers[0];
    const githubClient = githubServer.getGitHubClient();
    
    let result;
    
    // Execute the appropriate tool
    switch (toolName) {
      case 'github_create_repo':
        result = await githubClient.createRepository({
          name: parameters.name,
          description: parameters.description,
          private: parameters.private,
          autoInit: parameters.autoInit,
          gitignoreTemplate: parameters.gitignoreTemplate,
          licenseTemplate: parameters.licenseTemplate
        });
        break;
        
      case 'github_create_file':
        result = await githubClient.createFile(
          parameters.owner,
          parameters.repo,
          parameters.path,
          parameters.content,
          parameters.message,
          parameters.branch
        );
        break;
        
      case 'github_update_file':
        result = await githubClient.updateFile(
          parameters.owner,
          parameters.repo,
          parameters.path,
          parameters.content,
          parameters.message,
          parameters.sha,
          parameters.branch
        );
        break;
        
      case 'github_get_file':
        result = await githubClient.getFileContent(
          parameters.owner,
          parameters.repo,
          parameters.path,
          parameters.branch
        );
        break;
        
      case 'github_create_branch':
        result = await githubClient.createBranch(
          parameters.owner,
          parameters.repo,
          parameters.branch,
          parameters.fromBranch
        );
        break;
        
      case 'github_list_repos':
        result = await githubClient.listRepositories({
          sort: parameters.sort,
          perPage: parameters.perPage
        });
        break;
        
      case 'github_get_repo':
        result = await githubClient.getRepository(
          parameters.owner,
          parameters.repo
        );
        break;
        
      case 'github_create_issue':
        result = await githubClient.createIssue(
          parameters.owner,
          parameters.repo,
          parameters.title,
          parameters.body,
          parameters.labels
        );
        break;
        
      case 'search_github_repos':
        result = await githubClient.searchRepositories(
          parameters.query,
          {
            sort: parameters.sort,
            order: parameters.order,
            perPage: parameters.perPage
          }
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown GitHub tool: ${toolName}`
        });
    }
    
    console.log('✅ GitHub tool result:', result.success ? 'Success' : 'Failed');
    
    res.json(result);
  } catch (error) {
    console.error('Execute GitHub tool error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ==============================================================================
// ASSIGNMENT ANALYSIS (NEW - Phase 1)
// ==============================================================================

/**
 * Analyze an assignment and generate a step-by-step journey
 * POST /api/assignments/analyze
 * 
 * Body: {
 *   assignment: { id, title, rawDescription, courseName?, dueDate?, source? }
 * }
 * 
 * Returns: {
 *   assignment: Assignment,
 *   analysis: AssignmentAnalysis,
 *   journey: AssignmentJourney
 * }
 */
app.post('/api/assignments/analyze', async (req, res) => {
  try {
    const { assignment } = req.body;
    
    console.log('🔍 Analyzing assignment:', assignment?.title);
    
    // Validate input
    if (!assignment || !assignment.title || !assignment.rawDescription) {
      return res.status(400).json({ 
        error: 'Assignment with title and rawDescription is required' 
      });
    }
    
    // Ensure assignment has an ID
    if (!assignment.id) {
      assignment.id = `assignment_${Date.now()}`;
    }
    
    // Analyze the assignment
    const analysis = await analyzeAssignment(assignment);
    console.log('✅ Analysis complete:', {
      type: analysis.type,
      estimatedHours: analysis.estimatedTimeHours,
      skills: analysis.requiredSkills.length,
      deliverables: analysis.deliverables.length
    });
    
    // Build journey from analysis
    const journey = buildJourneyFromAnalysis(analysis);
    console.log('✅ Journey generated:', {
      steps: journey.steps.length,
      totalMinutes: journey.totalEstimatedMinutes
    });
    
    res.json({
      success: true,
      assignment,
      analysis,
      journey
    });
    
  } catch (error) {
    console.error('❌ Assignment analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze assignment',
      details: error.message 
    });
  }
});

/**
 * Review a completed assignment with AI feedback
 * POST /api/assignments/review
 * 
 * Body: {
 *   assignment: Assignment,
 *   analysis: AssignmentAnalysis,
 *   journey: AssignmentJourney,
 *   stepNotes: Record<string, string>,
 *   stepSubtasks: Record<string, Array<{id, text, completed}>>,
 *   chatHistory: Array<{role, content}>,
 *   finalWork?: string,
 *   additionalContext?: string
 * }
 * 
 * Returns: {
 *   completeness: number,
 *   strengths: string[],
 *   improvements: string[],
 *   rubricScores: Record<string, number>,
 *   submissionReadiness: 'ready' | 'almost' | 'needs-work',
 *   detailedFeedback: string,
 *   recommendations: string[]
 * }
 */
app.post('/api/assignments/review', async (req, res) => {
  try {
    const {
      assignment,
      analysis,
      journey,
      stepNotes,
      stepSubtasks,
      chatHistory,
      finalWork,
      additionalContext
    } = req.body;
    
    console.log('🔍 Reviewing assignment:', assignment?.title);
    
    // Validate input
    if (!assignment || !analysis || !journey) {
      return res.status(400).json({ 
        error: 'Assignment, analysis, and journey are required' 
      });
    }
    
    // Review the assignment
    const review = await reviewAssignment({
      assignment,
      analysis,
      journey,
      stepNotes: stepNotes || {},
      stepSubtasks: stepSubtasks || {},
      chatHistory: chatHistory || [],
      finalWork: finalWork || '',
      additionalContext: additionalContext || ''
    });
    
    console.log('✅ Review complete:', {
      completeness: review.completeness,
      readiness: review.submissionReadiness,
      strengths: review.strengths.length,
      improvements: review.improvements.length
    });
    
    res.json(review);
    
  } catch (error) {
    console.error('❌ Assignment review error:', error);
    res.status(500).json({ 
      error: 'Failed to review assignment',
      details: error.message 
    });
  }
});

// ==============================================================================
// CANVAS ASSIGNMENTS (Existing)
// ==============================================================================

// Assignment Endpoints
app.post('/api/assignments', async (req, res) => {
  try {
    const { canvasUrl, apiToken, limit = 50, includePast = true } = req.body;
    
    console.log('📚 Fetching assignments...');
    console.log('  Canvas URL:', canvasUrl);
    console.log('  Has Token:', !!apiToken);
    console.log('  Include Past:', includePast);
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Set credentials on the shared client (will be overridden per request)
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      console.log('  Using Base URL:', canvasClient.baseUrl);

      const assignments = await canvasClient.getUpcomingAssignments(limit, includePast);
      
      if (assignments.error) {
        console.error('❌ Canvas API Error:', assignments.error);
        return res.status(500).json({ error: assignments.error });
      }

      console.log('✅ Found', assignments.length, 'assignments');

      res.json({
        success: true,
        count: assignments.length,
        assignments
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('❌ Get assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/assignments/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId query parameter required' });
    }

    const assignment = await canvasClient.getAssignmentDetails(
      parseInt(courseId), 
      parseInt(assignmentId)
    );
    
    if (assignment.error) {
      return res.status(500).json({ error: assignment.error });
    }

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all courses
app.post('/api/courses', async (req, res) => {
  try {
    const { canvasUrl, apiToken } = req.body;
    
    console.log('📚 Fetching courses...');
    console.log('  Canvas URL:', canvasUrl);
    console.log('  Has Token:', !!apiToken);
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Set credentials on the shared client
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      console.log('  Using Base URL:', canvasClient.baseUrl);

      const courses = await canvasClient.getCourses();
      
      if (courses.error) {
        console.error('❌ Canvas API Error:', courses.error);
        return res.status(500).json({ error: courses.error });
      }

      console.log('✅ Found', courses.length, 'courses');

      res.json({
        success: true,
        count: courses.length,
        courses
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('❌ Get courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy Canvas file downloads (CORS workaround)
app.post('/api/download-file', async (req, res) => {
  try {
    const { fileUrl, canvasUrl, apiToken } = req.body;
    
    console.log('📥 Downloading file:', fileUrl);
    
    if (!apiToken || !fileUrl) {
      return res.status(400).json({ 
        error: 'Canvas API token and file URL are required' 
      });
    }

    // Fetch the file from Canvas with authorization
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Canvas returned ${response.status}: ${response.statusText}`);
    }

    // Get the file as a buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log(`✅ Downloaded ${buffer.byteLength} bytes (${contentType})`);

    // Send the file back to the frontend
    res.set('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('❌ Download file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit Assignment
app.post('/api/assignments/:assignmentId/submit', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { canvasUrl, apiToken, courseId, submissionData } = req.body;
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    if (!courseId) {
      return res.status(400).json({ 
        error: 'Course ID is required' 
      });
    }

    if (!submissionData || !submissionData.body) {
      return res.status(400).json({ 
        error: 'Submission content is required' 
      });
    }

    // Set credentials on the shared client
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      const result = await canvasClient.submitAssignment(
        parseInt(courseId),
        parseInt(assignmentId),
        submissionData
      );
      
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'Assignment submitted successfully',
        submission: result
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Course Material Endpoints
app.get('/api/courses/:courseId/materials', async (req, res) => {
  try {
    const { courseId } = req.params;
    const materials = await canvasClient.getCourseMaterials(parseInt(courseId));
    
    if (materials.error) {
      return res.status(500).json({ error: materials.error });
    }

    res.json({
      success: true,
      materials
    });
  } catch (error) {
    console.error('Get course materials error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/courses/:courseId/syllabus', async (req, res) => {
  try {
    const { courseId } = req.params;
    const syllabus = await canvasClient.getCourseSyllabus(parseInt(courseId));
    
    if (syllabus.error) {
      return res.status(500).json({ error: syllabus.error });
    }

    res.json({
      success: true,
      syllabus
    });
  } catch (error) {
    console.error('Get syllabus error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat Endpoint (LangGraph + LLM)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, assignmentId, courseId, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build context hint based on assignment if provided
    let contextHint = 'Mode: Question/Dialogue. Ask me what I currently believe first.';
    
    if (assignmentId && courseId) {
      // Fetch assignment details for context
      const assignment = await canvasClient.getAssignmentDetails(
        parseInt(courseId), 
        parseInt(assignmentId)
      );
      
      if (!assignment.error) {
        contextHint = `Mode: Canvas/Assignments. Student is working on: "${assignment.name}" in ${assignment.course_name}. 
Use Canvas tools to gather course materials and help them think critically through this assignment.`;
      }
    }

    // Build message history
    const messages = [
      ...conversationHistory,
      { 
        role: 'user', 
        content: `${contextHint}\n\nUser: ${message}` 
      }
    ];

    // Invoke LangGraph - TEMPORARILY DISABLED
    // const graph = buildGraph();
    // const result = await graph.invoke({ messages });
    
    // Temporary response while debugging
    return res.json({
      success: true,
      response: 'Chat temporarily disabled while debugging server startup',
      conversationHistory: messages
    });

    // Extract final assistant message
    const finalMessage = [...result.messages]
      .reverse()
      .find(m => m.role === 'assistant');

    res.json({
      success: true,
      response: finalMessage?.content || 'No response generated',
      conversationHistory: result.messages,
      toolCalls: finalMessage?.tool_calls || []
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// Streaming chat endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, assignmentId, courseId, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Build context
    let contextHint = 'Mode: Question/Dialogue. Ask me what I currently believe first.';
    
    if (assignmentId && courseId) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading assignment details...' })}\n\n`);
      
      const assignment = await canvasClient.getAssignmentDetails(
        parseInt(courseId), 
        parseInt(assignmentId)
      );
      
      if (!assignment.error) {
        contextHint = `Mode: Canvas/Assignments. Student is working on: "${assignment.name}". 
Use Canvas tools to help them think critically.`;
        
        res.write(`data: ${JSON.stringify({ 
          type: 'context', 
          assignment: assignment.name,
          course: assignment.course_name 
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Thinking...' })}\n\n`);

    // Build and invoke graph
    const messages = [
      ...conversationHistory,
      { role: 'user', content: `${contextHint}\n\nUser: ${message}` }
    ];

    // TEMPORARILY DISABLED - buildGraph causes hang
    // const graph = buildGraph();
    // const result = await graph.invoke({ messages });

    // Temporary response
    res.write(`data: ${JSON.stringify({ 
      type: 'response', 
      content: 'Chat temporarily disabled while debugging' 
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    return;

    const finalMessage = [...result.messages]
      .reverse()
      .find(m => m.role === 'assistant');

    // Stream the response
    res.write(`data: ${JSON.stringify({ 
      type: 'response', 
      content: finalMessage?.content || 'No response generated' 
    })}\n\n`);

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Streaming chat error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`);
    res.end();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// COURSE MATERIALS
// ==============================================================================

// Get course materials (modules, pages, files)
app.post('/api/courses/:courseId/materials', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { canvasUrl, apiToken } = req.body;
    
    console.log(`📚 Fetching materials for course ${courseId}...`);
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Set credentials
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      const materials = await canvasClient.getCourseMaterials(courseId);
      
      console.log('✅ Fetched course materials:', {
        modules: materials.modules?.length || 0,
        pages: materials.pages?.length || 0,
        files: materials.files?.length || 0
      });

      res.json({
        success: true,
        courseId,
        materials
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('❌ Error fetching course materials:', error);
    res.status(500).json({ 
      error: 'Failed to fetch course materials',
      details: error.message 
    });
  }
});

// Get course syllabus
app.post('/api/courses/:courseId/syllabus', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { canvasUrl, apiToken } = req.body;
    
    console.log(`📄 Fetching syllabus for course ${courseId}...`);
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Set credentials
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      const syllabus = await canvasClient.getCourseSyllabus(courseId);
      
      if (syllabus.error) {
        console.error('❌ Canvas API Error:', syllabus.error);
        return res.status(500).json({ error: syllabus.error });
      }

      console.log('✅ Fetched syllabus');

      res.json({
        success: true,
        courseId,
        syllabus
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('❌ Error fetching syllabus:', error);
    res.status(500).json({ 
      error: 'Failed to fetch syllabus',
      details: error.message 
    });
  }
});

// Get page content
app.post('/api/courses/:courseId/pages/:pageUrl', async (req, res) => {
  try {
    const { courseId, pageUrl } = req.params;
    const { canvasUrl, apiToken } = req.body;
    
    console.log(`📄 Fetching page ${pageUrl} from course ${courseId}...`);
    
    if (!apiToken) {
      return res.status(400).json({ 
        error: 'Canvas API token is required' 
      });
    }

    // Set credentials
    const originalToken = canvasClient.token;
    const originalBaseUrl = canvasClient.baseUrl;
    
    try {
      canvasClient.token = apiToken;
      if (canvasUrl) {
        canvasClient.baseUrl = canvasUrl.endsWith('/api/v1') 
          ? canvasUrl 
          : `${canvasUrl}/api/v1`;
      }

      const page = await canvasClient.getPageContent(courseId, pageUrl);
      
      if (page.error) {
        console.error('❌ Canvas API Error:', page.error);
        return res.status(500).json({ error: page.error });
      }

      console.log('✅ Fetched page content');

      res.json({
        success: true,
        page
      });
    } finally {
      // Restore original credentials
      canvasClient.token = originalToken;
      canvasClient.baseUrl = originalBaseUrl;
    }
  } catch (error) {
    console.error('❌ Error fetching page:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page content',
      details: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// Start server
console.log('🔵 All imports complete, starting server...');
app.listen(PORT, () => {
  const mcpStats = mcpManager.getStats();
  
  console.log(`\n🚀 ASTAR API Server running on http://localhost:${PORT}`);
  console.log(`📚 Canvas integration: ${canvasClient.token ? 'Ready' : 'Not configured'}`);
  console.log(`🤖 LLM Model: ${process.env.NV_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1.5'}`);
  console.log(`🔌 MCP Servers: ${mcpStats.connected}/${mcpStats.total} connected`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health`);
  console.log(`\n  Canvas:`);
  console.log(`    POST /api/canvas/connect`);
  console.log(`    GET  /api/canvas/status`);
  console.log(`\n  MCP Servers:`);
  console.log(`    GET    /api/mcp/servers`);
  console.log(`    GET    /api/mcp/servers/:id`);
  console.log(`    POST   /api/mcp/servers`);
  console.log(`    PUT    /api/mcp/servers/:id`);
  console.log(`    DELETE /api/mcp/servers/:id`);
  console.log(`    POST   /api/mcp/servers/:id/test`);
  console.log(`    GET    /api/mcp/stats`);
  console.log(`    GET    /api/mcp/tools`);
  console.log(`\n  Assignments:`);
  console.log(`    GET  /api/assignments`);
  console.log(`    GET  /api/assignments/:id`);
  console.log(`\n  Courses:`);
  console.log(`    GET  /api/courses/:id/materials`);
  console.log(`    GET  /api/courses/:id/syllabus`);
  console.log(`\n  Chat:`);
  console.log(`    POST /api/chat`);
  console.log(`    POST /api/chat/stream`);
  console.log(`\n✨ Ready to receive requests!\n`);
});

export default app;

