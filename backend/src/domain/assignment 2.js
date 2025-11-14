/**
 * Assignment domain models (backend version with JSDoc types)
 * @typedef {'essay' | 'coding_project' | 'problem_set' | 'research_paper' | 'presentation' | 'other'} AssignmentType
 */

/**
 * @typedef {Object} Assignment
 * @property {string} id
 * @property {string} title
 * @property {string} rawDescription
 * @property {string} [courseName]
 * @property {string} [dueDate] - ISO string
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
 * @typedef {'not_started' | 'in_progress' | 'completed'} JourneyStepStatus
 */

/**
 * @typedef {Object} JourneyStep
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} estimatedMinutes
 * @property {JourneyStepStatus} status
 * @property {string[]} [resources]
 */

/**
 * @typedef {Object} AssignmentJourney
 * @property {string} assignmentId
 * @property {number} totalEstimatedMinutes
 * @property {JourneyStep[]} steps
 */

export {};
