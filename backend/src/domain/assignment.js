/**
 * Domain models for ASTAR Assignment Completion Assistant
 * Phase 1: Minimal but complete domain layer
 * 
 * Note: These match the TypeScript definitions in frontend/src/domain/assignment.ts
 */

/**
 * @typedef {'essay' | 'coding_project' | 'problem_set' | 'research_paper' | 'presentation' | 'other'} AssignmentType
 */

/**
 * @typedef {Object} Assignment
 * @property {string} id
 * @property {string} title
 * @property {string} rawDescription
 * @property {string} [courseName]
 * @property {string} [courseId]
 * @property {string} [dueDate] - ISO string
 * @property {number} [points]
 * @property {'canvas' | 'manual' | 'other'} [source]
 */

/**
 * @typedef {Object} AssignmentDeliverable
 * @property {string} label
 * @property {boolean} required
 */

/**
 * @typedef {Object} AssignmentAnalysis
 * @property {string} assignmentId
 * @property {AssignmentType} type
 * @property {string[]} requiredSkills
 * @property {number} estimatedTimeHours
 * @property {string[]} prerequisites
 * @property {AssignmentDeliverable[]} deliverables
 * @property {string[]} successCriteria
 */

/**
 * @typedef {Object} JourneyStep
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} estimatedMinutes
 * @property {'not_started' | 'in_progress' | 'completed'} status
 * @property {string[]} [resources]
 */

/**
 * @typedef {Object} AssignmentJourney
 * @property {string} assignmentId
 * @property {number} totalEstimatedMinutes
 * @property {JourneyStep[]} steps
 */

/**
 * @typedef {Object} AssignmentAnalysisResult
 * @property {Assignment} assignment
 * @property {AssignmentAnalysis} analysis
 * @property {AssignmentJourney} journey
 */

// Export empty object for ES6 module compatibility
export {};

