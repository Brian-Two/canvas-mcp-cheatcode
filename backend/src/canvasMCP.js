// Canvas MCP Client - Direct integration with Canvas LMS API
import 'dotenv/config';

const CANVAS_API_URL = process.env.CANVAS_API_URL || 'https://canvas.instructure.com/api/v1';
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN;

class CanvasMCPClient {
  constructor() {
    if (!CANVAS_API_TOKEN) {
      console.warn('⚠️  CANVAS_API_TOKEN not set in .env - Canvas features will be limited');
    }
    this.baseUrl = CANVAS_API_URL;
    this.token = CANVAS_API_TOKEN;
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    if (!this.token) {
      return { error: 'Canvas API token not configured. Set CANVAS_API_TOKEN in .env' };
    }

    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  // Get all courses for the current user
  async getCourses() {
    return this.makeRequest('/courses?enrollment_state=active&include[]=total_scores');
  }

  // Get assignments across all courses
  async getUpcomingAssignments(limit = 20, includePast = false) {
    const courses = await this.getCourses();
    if (courses.error) {
      console.error('Failed to get courses:', courses.error);
      return courses;
    }

    if (!Array.isArray(courses)) {
      console.error('getCourses() did not return an array:', courses);
      return { error: 'Invalid response from Canvas API' };
    }

    const allAssignments = [];
    
    for (const course of courses) {
      // Fetch assignments with submission data included
      const assignments = await this.makeRequest(
        `/courses/${course.id}/assignments?order_by=due_at&per_page=100&include[]=submission`
      );
      
      if (!assignments.error && Array.isArray(assignments)) {
        // Process assignments and check submission status
        for (const a of assignments) {
          if (!a.due_at) continue;
          
          // Check if assignment should be included
          if (!includePast) {
            const dueDate = new Date(a.due_at);
            const now = new Date();
            if (dueDate <= now) continue;
          }

          // Check submission status
          let isCompleted = false;
          let submissionStatus = null;
          let submissionScore = null;
          let submissionGrade = null;
          
          // Check if submission exists (from include[]=submission parameter)
          if (a.submission) {
            submissionStatus = a.submission.workflow_state;
            submissionScore = a.submission.score;
            submissionGrade = a.submission.grade;
            // Assignment is completed if submitted, graded, or complete
            isCompleted = submissionStatus === 'submitted' || 
                         submissionStatus === 'graded' || 
                         submissionStatus === 'complete';
          }

          allAssignments.push({
            id: a.id,
            name: a.name,
            course_id: course.id,
            course_name: course.name,
            due_at: a.due_at,
            points_possible: a.points_possible,
            description: a.description,
            html_url: a.html_url,
            submission_types: a.submission_types,
            is_completed: isCompleted,
            submission_status: submissionStatus,
            submission_score: submissionScore,
            submission_grade: submissionGrade
          });
        }
      }
    }

    // Sort by due date (upcoming first, then past assignments)
    const sorted = allAssignments.sort((a, b) => {
      const dateA = new Date(a.due_at);
      const dateB = new Date(b.due_at);
      const now = new Date();
      
      // If including past, show upcoming assignments first (soonest first)
      // then past assignments (most recent past first)
      if (includePast) {
        const aIsPast = dateA < now;
        const bIsPast = dateB < now;
        
        if (!aIsPast && bIsPast) return -1; // Upcoming before past
        if (aIsPast && !bIsPast) return 1; // Past after upcoming
        if (aIsPast && bIsPast) return dateB - dateA; // Most recent past first
        return dateA - dateB; // Soonest upcoming first
      }
      
      return dateA - dateB; // Default: soonest first
    });

    return sorted.slice(0, limit);
  }

  // Get specific assignment details
  async getAssignmentDetails(courseId, assignmentId) {
    return this.makeRequest(`/courses/${courseId}/assignments/${assignmentId}`);
  }

  // Get course materials (modules, pages, files)
  async getCourseMaterials(courseId) {
    const [modules, pages, files] = await Promise.all([
      this.makeRequest(`/courses/${courseId}/modules?include[]=items`),
      this.makeRequest(`/courses/${courseId}/pages`),
      this.makeRequest(`/courses/${courseId}/files?per_page=50`)
    ]);

    return {
      modules: modules.error ? [] : modules,
      pages: pages.error ? [] : pages,
      files: files.error ? [] : files
    };
  }

  // Get course syllabus
  async getCourseSyllabus(courseId) {
    const course = await this.makeRequest(`/courses/${courseId}?include[]=syllabus_body`);
    return course.error ? course : {
      course_name: course.name,
      syllabus: course.syllabus_body
    };
  }

  // Get page content
  async getPageContent(courseId, pageUrl) {
    return this.makeRequest(`/courses/${courseId}/pages/${pageUrl}`);
  }

  // Get quiz/exam details
  async getQuizDetails(courseId, quizId) {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}`);
  }

  // Get all quizzes for a course
  async getCourseQuizzes(courseId) {
    return this.makeRequest(`/courses/${courseId}/quizzes`);
  }

  // Get user's submission for an assignment
  async getSubmission(courseId, assignmentId, userId = 'self') {
    return this.makeRequest(`/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`);
  }

  // Submit an assignment
  async submitAssignment(courseId, assignmentId, submissionData) {
    const { submission_type, body, url } = submissionData;
    
    const payload = {
      submission: {
        submission_type: submission_type || 'online_text_entry'
      }
    };

    // Add content based on submission type
    if (submission_type === 'online_text_entry' && body) {
      payload.submission.body = body;
    } else if (submission_type === 'online_url' && url) {
      payload.submission.url = url;
    }

    return this.makeRequest(
      `/courses/${courseId}/assignments/${assignmentId}/submissions`,
      'POST',
      payload
    );
  }
}

// Singleton instance
export const canvasClient = new CanvasMCPClient();

