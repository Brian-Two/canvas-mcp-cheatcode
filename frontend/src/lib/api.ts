/**
 * API Client for ASTAR Backend
 * Handles all communication with the Express/LangGraph backend
 */

import { 
  Assignment as DomainAssignment,
  AssignmentAnalysis,
  AssignmentJourney,
  AssignmentAnalysisResult
} from '@/domain/assignment';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types
export interface Assignment {
  id: string;
  title: string;
  course: string;
  courseColor?: string;
  description: string;
  dueDate: string;
  daysUntilDue: number;
  points: number;
  htmlUrl?: string;
  isCompleted?: boolean;
  submissionStatus?: string;
  submissionScore?: number | null;
  submissionGrade?: string | null;
}

export interface CanvasConnection {
  isConnected: boolean;
  message?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  assignmentContext?: any;
}

export interface ChatResponse {
  response: string;
  conversationHistory: ChatMessage[];
}

// Helper function to get Canvas credentials from localStorage
const getCanvasCredentials = () => {
  const university = localStorage.getItem('astar_university');
  const apiToken = localStorage.getItem('astar_api_token');
  const customUrl = localStorage.getItem('astar_custom_url');

  let canvasUrl = 'https://canvas.instructure.com';
  if (university === 'custom' && customUrl) {
    canvasUrl = `https://${customUrl}`;
  }

  return { canvasUrl, apiToken };
};

// API Functions

/**
 * Test Canvas connection
 */
export const testCanvasConnection = async (): Promise<CanvasConnection> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/canvas/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ canvasUrl, apiToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to connect to Canvas');
  }

  return response.json();
};

/**
 * Get assignments from Canvas
 * @param includePast - Whether to include past assignments (default: false)
 */
export const getAssignments = async (includePast = false): Promise<Assignment[]> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ canvasUrl, apiToken, includePast }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch assignments');
  }

  const data = await response.json();
  
  // Transform the backend response to match our frontend format
  return (data.assignments || []).map((assignment: any) => ({
    id: assignment.id.toString(),
    title: assignment.name,
    course: assignment.course_name || 'Unknown Course',
    courseColor: getRandomCourseColor(),
    description: stripHtml(assignment.description || 'No description provided'),
    dueDate: assignment.due_at || '',
    daysUntilDue: calculateDaysUntilDue(assignment.due_at),
    points: assignment.points_possible || 0,
    htmlUrl: assignment.html_url,
    isCompleted: assignment.is_completed || false,
    submissionStatus: assignment.submission_status || null,
    submissionScore: assignment.submission_score || null,
    submissionGrade: assignment.submission_grade || null,
  }));
};

/**
 * Send a chat message to the AI
 */
export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      canvasUrl,
      apiToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
};

/**
 * Stream chat responses (Server-Sent Events)
 */
export const streamChatMessage = async (
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        canvasUrl,
        apiToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to stream message');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onComplete();
            return;
          }
          onChunk(data);
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
};

// Helper functions

/**
 * Strip HTML tags from text
 */
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Calculate days until due date
 */
const calculateDaysUntilDue = (dueDate: string | null): number => {
  if (!dueDate) return 999; // Far future for assignments without due dates

  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Get a random color for course badges
 */
const getRandomCourseColor = (): string => {
  const colors = [
    '#3fad93', // ASTAR Green
    '#A855F7', // Purple
    '#F59E0B', // Amber
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#8B5CF6', // Violet
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Submit assignment to Canvas
 */
export const submitAssignmentToCanvas = async (
  assignmentId: string,
  courseId: string,
  content: string
): Promise<any> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/assignments/${assignmentId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasUrl,
      apiToken,
      courseId,
      submissionData: {
        submission_type: 'online_text_entry',
        body: content
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit assignment');
  }

  return response.json();
};

/**
 * Fetch course materials (modules, pages, files)
 */
export const getCourseMaterials = async (courseId: string): Promise<any> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/courses/${courseId}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasUrl,
      apiToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch course materials');
  }

  return response.json();
};

/**
 * Fetch course syllabus
 */
export const getCourseSyllabus = async (courseId: string): Promise<any> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/courses/${courseId}/syllabus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasUrl,
      apiToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch syllabus');
  }

  return response.json();
};

/**
 * Fetch page content
 */
export const getPageContent = async (courseId: string, pageUrl: string): Promise<any> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/courses/${courseId}/pages/${pageUrl}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasUrl,
      apiToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch page content');
  }

  return response.json();
};

/**
 * Fetch all courses for the user
 */
export const getCourses = async (): Promise<any[]> => {
  const { canvasUrl, apiToken } = getCanvasCredentials();

  if (!apiToken) {
    throw new Error('No Canvas API token found');
  }

  const response = await fetch(`${API_URL}/api/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasUrl,
      apiToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch courses');
  }

  const data = await response.json();
  return data.courses || [];
};

/**
 * Analyze an assignment and generate a step-by-step journey
 * (Phase 1 - New Assignment Completion Flow)
 */
export const analyzeAssignment = async (
  assignment: DomainAssignment
): Promise<AssignmentAnalysisResult> => {
  const response = await fetch(`${API_URL}/api/assignments/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assignment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze assignment');
  }

  const data = await response.json();
  return {
    assignment: data.assignment,
    analysis: data.analysis,
    journey: data.journey
  };
};

/**
 * Review assignment completion with AI
 * (Phase 2A - AI Review Feature)
 */
export interface ReviewRequest {
  assignment: DomainAssignment;
  analysis: AssignmentAnalysis;
  journey: AssignmentJourney;
  stepNotes: Record<string, string>;
  stepSubtasks: Record<string, Array<{ id: string; text: string; completed: boolean }>>;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  finalWork?: string;
  additionalContext?: string;
}

export interface ReviewResponse {
  completeness: number; // 0-100
  strengths: string[];
  improvements: string[];
  rubricScores: Record<string, number>;
  submissionReadiness: 'ready' | 'almost' | 'needs-work';
  detailedFeedback: string;
  recommendations: string[];
}

export const reviewAssignment = async (
  request: ReviewRequest
): Promise<ReviewResponse> => {
  const response = await fetch(`${API_URL}/api/assignments/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to review assignment');
  }

  return response.json();
};

