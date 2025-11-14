/**
 * Assignment Analysis Service
 * 
 * Analyzes assignments to determine type, required skills, time estimates,
 * and generates a step-by-step journey for completion.
 * 
 * Phase 1: Simple heuristic-based analysis with keyword matching
 * Future: Enhance with LLM-based analysis for more nuanced understanding
 */

import '../domain/assignment.js'; // For JSDoc types

/**
 * Analyzes an assignment to determine its type, requirements, and complexity
 * 
 * @param {import('../domain/assignment.js').Assignment} assignment
 * @returns {Promise<import('../domain/assignment.js').AssignmentAnalysis>}
 */
export async function analyzeAssignment(assignment) {
  const { id, title, rawDescription } = assignment;
  const text = `${title} ${rawDescription}`.toLowerCase();

  // Determine assignment type
  const type = detectAssignmentType(text);

  // Extract required skills
  const requiredSkills = extractRequiredSkills(text, type);

  // Estimate time (hours)
  const estimatedTimeHours = estimateTimeRequirement(text, type);

  // Identify prerequisites
  const prerequisites = extractPrerequisites(text);

  // Determine deliverables
  const deliverables = extractDeliverables(text, type);

  // Generate success criteria
  const successCriteria = generateSuccessCriteria(type, text);

  return {
    assignmentId: id,
    type,
    requiredSkills,
    estimatedTimeHours,
    prerequisites,
    deliverables,
    successCriteria
  };
}

/**
 * Builds a step-by-step journey from an assignment analysis
 * 
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').AssignmentJourney}
 */
export function buildJourneyFromAnalysis(analysis) {
  const { assignmentId, type } = analysis;

  let steps = [];

  switch (type) {
    case 'essay':
      steps = buildEssayJourney(analysis);
      break;
    case 'coding_project':
      steps = buildCodingProjectJourney(analysis);
      break;
    case 'problem_set':
      steps = buildProblemSetJourney(analysis);
      break;
    case 'research_paper':
      steps = buildResearchPaperJourney(analysis);
      break;
    case 'presentation':
      steps = buildPresentationJourney(analysis);
      break;
    default:
      steps = buildGenericJourney(analysis);
  }

  const totalEstimatedMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

  return {
    assignmentId,
    totalEstimatedMinutes,
    steps
  };
}

// ============================================================================
// Type Detection
// ============================================================================

/**
 * Detects the assignment type based on keywords
 * @param {string} text
 * @returns {import('../domain/assignment.js').AssignmentType}
 */
function detectAssignmentType(text) {
  // Coding project indicators
  if (
    /\b(code|coding|program|implement|repository|repo|github|software|algorithm)\b/i.test(text) ||
    /\b(python|javascript|java|c\+\+|typescript)\b/i.test(text)
  ) {
    return 'coding_project';
  }

  // Research paper indicators
  if (
    /\b(research paper|literature review|scholarly|academic paper|citations|references|apa|mla)\b/i.test(text) ||
    /\b(\d+\s*pages?.*research|research.*\d+\s*pages?)\b/i.test(text)
  ) {
    return 'research_paper';
  }

  // Essay indicators
  if (
    /\b(essay|write|composition|argumentative|persuasive|expository)\b/i.test(text) ||
    /\b(\d+\s*words?|\d+\s*pages?)\b/i.test(text)
  ) {
    return 'essay';
  }

  // Problem set indicators
  if (
    /\b(problem set|problems? \d+|exercises?|homework|calculate|solve|proof)\b/i.test(text) ||
    /\b(chapter \d+|problems from)\b/i.test(text)
  ) {
    return 'problem_set';
  }

  // Presentation indicators
  if (/\b(presentation|slides|powerpoint|present|talk|keynote)\b/i.test(text)) {
    return 'presentation';
  }

  return 'other';
}

/**
 * Extracts required skills from the assignment description
 * @param {string} text
 * @param {import('../domain/assignment.js').AssignmentType} type
 * @returns {string[]}
 */
function extractRequiredSkills(text, type) {
  const skills = [];

  // Programming languages
  const languages = ['python', 'javascript', 'java', 'c++', 'typescript', 'r', 'sql'];
  for (const lang of languages) {
    if (text.includes(lang)) {
      skills.push(lang);
    }
  }

  // Technical skills
  const technicalSkills = [
    'data visualization',
    'machine learning',
    'data analysis',
    'web development',
    'database',
    'api',
    'testing',
    'debugging'
  ];
  for (const skill of technicalSkills) {
    if (text.includes(skill.replace(/\s+/g, '\\s+'))) {
      skills.push(skill);
    }
  }

  // Academic skills
  if (type === 'essay' || type === 'research_paper') {
    skills.push('research', 'writing', 'critical thinking');
    if (/\b(citation|reference|apa|mla)\b/i.test(text)) {
      skills.push('academic citations');
    }
  }

  // Presentation skills
  if (type === 'presentation') {
    skills.push('public speaking', 'slide design', 'visual communication');
  }

  // Problem solving for problem sets
  if (type === 'problem_set') {
    skills.push('problem solving', 'mathematical reasoning');
  }

  return skills.length > 0 ? skills : ['general knowledge'];
}

/**
 * Estimates time required in hours
 * @param {string} text
 * @param {import('../domain/assignment.js').AssignmentType} type
 * @returns {number}
 */
function estimateTimeRequirement(text, type) {
  // Look for explicit time mentions
  const timeMatch = text.match(/(\d+)\s*(hour|hr|hours|hrs)/i);
  if (timeMatch) {
    return parseInt(timeMatch[1]);
  }

  // Look for page/word counts
  const pageMatch = text.match(/(\d+)\s*pages?/i);
  if (pageMatch) {
    const pages = parseInt(pageMatch[1]);
    return Math.ceil(pages * 0.5); // ~30 min per page
  }

  const wordMatch = text.match(/(\d+)\s*words?/i);
  if (wordMatch) {
    const words = parseInt(wordMatch[1]);
    return Math.ceil(words / 500); // ~500 words per hour
  }

  // Default estimates by type
  const defaults = {
    essay: 3,
    coding_project: 8,
    problem_set: 4,
    research_paper: 12,
    presentation: 5,
    other: 3
  };

  // Look for complexity indicators
  if (/\b(final|major|comprehensive|detailed)\b/i.test(text)) {
    return (defaults[type] || 3) * 1.5;
  }

  if (/\b(short|brief|quick|simple)\b/i.test(text)) {
    return (defaults[type] || 3) * 0.5;
  }

  return defaults[type] || 3;
}

/**
 * Extracts prerequisites from the assignment description
 * @param {string} text
 * @returns {string[]}
 */
function extractPrerequisites(text) {
  const prerequisites = [];

  // Look for explicit prerequisites
  const prereqMatch = text.match(/prerequisite[s]?:([^.]+)/i);
  if (prereqMatch) {
    prerequisites.push(prereqMatch[1].trim());
  }

  // Look for chapter/lecture references
  const chapterMatch = text.match(/chapter[s]?\s+(\d+(?:-\d+)?)/i);
  if (chapterMatch) {
    prerequisites.push(`Chapter ${chapterMatch[1]}`);
  }

  const lectureMatch = text.match(/lecture[s]?\s+(\d+(?:-\d+)?)/i);
  if (lectureMatch) {
    prerequisites.push(`Lecture ${lectureMatch[1]}`);
  }

  return prerequisites.length > 0 ? prerequisites : ['Review course materials'];
}

/**
 * Extracts deliverables from the assignment description
 * @param {string} text
 * @param {import('../domain/assignment.js').AssignmentType} type
 * @returns {import('../domain/assignment.js').AssignmentDeliverable[]}
 */
function extractDeliverables(text, type) {
  const deliverables = [];

  // Common deliverables
  if (/\b(pdf|document|paper)\b/i.test(text) || type === 'essay' || type === 'research_paper') {
    deliverables.push({ label: 'PDF document', required: true });
  }

  if (/\b(github|repository|repo|code)\b/i.test(text) || type === 'coding_project') {
    deliverables.push({ label: 'GitHub repository', required: true });
  }

  if (/\b(readme|documentation)\b/i.test(text)) {
    deliverables.push({ label: 'README.md', required: true });
  }

  if (/\b(test|unit test|testing)\b/i.test(text)) {
    deliverables.push({ label: 'Unit tests', required: false });
  }

  if (/\b(slides?|powerpoint|presentation)\b/i.test(text) || type === 'presentation') {
    deliverables.push({ label: 'Presentation slides', required: true });
  }

  // Default if nothing detected
  if (deliverables.length === 0) {
    deliverables.push({ label: 'Completed assignment', required: true });
  }

  return deliverables;
}

/**
 * Generates success criteria based on assignment type
 * @param {import('../domain/assignment.js').AssignmentType} type
 * @param {string} text
 * @returns {string[]}
 */
function generateSuccessCriteria(type, text) {
  const criteria = [];

  switch (type) {
    case 'essay':
    case 'research_paper':
      criteria.push('Clear thesis statement');
      criteria.push('Well-structured arguments');
      criteria.push('Proper citations and references');
      criteria.push('Grammar and spelling checked');
      break;

    case 'coding_project':
      criteria.push('Code runs without errors');
      criteria.push('Follows assignment requirements');
      criteria.push('Code is well-documented');
      criteria.push('Includes README with setup instructions');
      break;

    case 'problem_set':
      criteria.push('All problems attempted');
      criteria.push('Work shown for each problem');
      criteria.push('Answers clearly labeled');
      criteria.push('Calculations verified');
      break;

    case 'presentation':
      criteria.push('Clear structure and flow');
      criteria.push('Engaging visual design');
      criteria.push('Stays within time limit');
      criteria.push('Includes speaker notes');
      break;

    default:
      criteria.push('Meets all stated requirements');
      criteria.push('Submitted on time');
      criteria.push('Quality checked before submission');
  }

  // Add rubric-specific criteria if rubric is mentioned
  if (/\b(rubric|grading criteria)\b/i.test(text)) {
    criteria.push('Follows rubric guidelines');
  }

  return criteria;
}

// ============================================================================
// Journey Builders (Step-by-Step Plans)
// ============================================================================

/**
 * Builds journey for essay assignments
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildEssayJourney(analysis) {
  return [
    {
      id: '1',
      title: 'Understand the prompt',
      description: 'Read the assignment carefully and identify key requirements, essay type, and grading rubric.',
      estimatedMinutes: 15,
      status: 'not_started'
    },
    {
      id: '2',
      title: 'Brainstorm and research',
      description: 'Gather ideas, research supporting evidence, and collect sources for citations.',
      estimatedMinutes: 45,
      status: 'not_started',
      resources: ['Google Scholar', 'Course readings']
    },
    {
      id: '3',
      title: 'Create outline',
      description: 'Organize your main points and arguments into a clear structure with introduction, body paragraphs, and conclusion.',
      estimatedMinutes: 20,
      status: 'not_started'
    },
    {
      id: '4',
      title: 'Write first draft',
      description: 'Transform your outline into a complete draft. Focus on getting ideas down, not perfection.',
      estimatedMinutes: 60,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Revise and polish',
      description: 'Review your draft for clarity, coherence, and argument strength. Check citations and formatting.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '6',
      title: 'Final review',
      description: 'Proofread for grammar, spelling, and formatting. Verify all requirements are met.',
      estimatedMinutes: 20,
      status: 'not_started'
    }
  ];
}

/**
 * Builds journey for coding project assignments
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildCodingProjectJourney(analysis) {
  const hasGitHub = analysis.deliverables.some(d => d.label.toLowerCase().includes('github'));

  const steps = [
    {
      id: '1',
      title: 'Understand requirements',
      description: 'Read the assignment spec carefully. Identify input/output requirements, constraints, and deliverables.',
      estimatedMinutes: 20,
      status: 'not_started'
    }
  ];

  if (hasGitHub) {
    steps.push({
      id: '2',
      title: 'Setup GitHub repository',
      description: 'Create a new repository with appropriate .gitignore, README, and initial structure.',
      estimatedMinutes: 15,
      status: 'not_started',
      resources: ['ASTAR can help create this via GitHub MCP']
    });
  } else {
    steps.push({
      id: '2',
      title: 'Setup project structure',
      description: 'Create project folders and files. Initialize version control if needed.',
      estimatedMinutes: 15,
      status: 'not_started'
    });
  }

  steps.push(
    {
      id: '3',
      title: 'Implement core features',
      description: 'Write code for the main functionality. Break down into smaller functions and test as you go.',
      estimatedMinutes: 180,
      status: 'not_started'
    },
    {
      id: '4',
      title: 'Add tests',
      description: 'Write tests to verify your code works correctly. Test edge cases and error handling.',
      estimatedMinutes: 45,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Document your code',
      description: 'Add comments, update README with setup instructions, and document any APIs or usage.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '6',
      title: 'Final testing and cleanup',
      description: 'Run all tests, verify requirements are met, clean up code, and prepare for submission.',
      estimatedMinutes: 30,
      status: 'not_started'
    }
  );

  return steps;
}

/**
 * Builds journey for problem set assignments
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildProblemSetJourney(analysis) {
  return [
    {
      id: '1',
      title: 'Review relevant concepts',
      description: 'Review lecture notes, textbook sections, and examples related to these problems.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '2',
      title: 'Read all problems',
      description: 'Read through all problems to understand what\'s being asked. Identify which seem easiest.',
      estimatedMinutes: 10,
      status: 'not_started'
    },
    {
      id: '3',
      title: 'Solve problems',
      description: 'Work through each problem. Show your work clearly. Start with easier problems to build confidence.',
      estimatedMinutes: 120,
      status: 'not_started'
    },
    {
      id: '4',
      title: 'Check your work',
      description: 'Verify calculations, check for errors, and ensure answers make sense. Compare with examples.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Format and finalize',
      description: 'Write final answers clearly. Number problems correctly. Scan or type up if needed.',
      estimatedMinutes: 20,
      status: 'not_started'
    }
  ];
}

/**
 * Builds journey for research paper assignments
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildResearchPaperJourney(analysis) {
  return [
    {
      id: '1',
      title: 'Understand requirements',
      description: 'Review assignment guidelines, required length, citation style, and research expectations.',
      estimatedMinutes: 20,
      status: 'not_started'
    },
    {
      id: '2',
      title: 'Choose and narrow topic',
      description: 'Select a specific, focused research question. Make sure it\'s not too broad.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '3',
      title: 'Conduct research',
      description: 'Find scholarly sources. Take notes and track citations. Aim for variety of sources.',
      estimatedMinutes: 180,
      status: 'not_started',
      resources: ['Google Scholar', 'Library databases', 'Course readings']
    },
    {
      id: '4',
      title: 'Create detailed outline',
      description: 'Organize research findings into a structured outline with thesis and supporting arguments.',
      estimatedMinutes: 45,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Write first draft',
      description: 'Transform outline into full paper. Include proper citations as you write.',
      estimatedMinutes: 180,
      status: 'not_started'
    },
    {
      id: '6',
      title: 'Revise and refine',
      description: 'Strengthen arguments, improve flow, verify citations. Check that thesis is well-supported.',
      estimatedMinutes: 60,
      status: 'not_started'
    },
    {
      id: '7',
      title: 'Final polish',
      description: 'Proofread, format references, check requirements one last time.',
      estimatedMinutes: 30,
      status: 'not_started'
    }
  ];
}

/**
 * Builds journey for presentation assignments
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildPresentationJourney(analysis) {
  return [
    {
      id: '1',
      title: 'Understand requirements',
      description: 'Review presentation topic, time limit, required content, and grading rubric.',
      estimatedMinutes: 15,
      status: 'not_started'
    },
    {
      id: '2',
      title: 'Research and gather content',
      description: 'Collect information, examples, and data for your presentation.',
      estimatedMinutes: 60,
      status: 'not_started'
    },
    {
      id: '3',
      title: 'Create outline and structure',
      description: 'Plan your presentation flow: introduction, main points, conclusion. Aim for 1-2 minutes per slide.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '4',
      title: 'Design slides',
      description: 'Create visual slides with clear text, images, and diagrams. Keep text minimal.',
      estimatedMinutes: 90,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Write speaker notes',
      description: 'Add notes for what you\'ll say for each slide. Practice your talking points.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '6',
      title: 'Practice and refine',
      description: 'Rehearse your presentation. Time yourself. Adjust content to fit time limit.',
      estimatedMinutes: 45,
      status: 'not_started'
    }
  ];
}

/**
 * Builds generic journey for unknown assignment types
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @returns {import('../domain/assignment.js').JourneyStep[]}
 */
function buildGenericJourney(analysis) {
  return [
    {
      id: '1',
      title: 'Understand requirements',
      description: 'Read the assignment carefully. Identify what needs to be delivered and any special requirements.',
      estimatedMinutes: 20,
      status: 'not_started'
    },
    {
      id: '2',
      title: 'Gather resources',
      description: 'Collect any materials, readings, or tools you\'ll need to complete this assignment.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '3',
      title: 'Plan your approach',
      description: 'Break down the assignment into smaller tasks. Create a rough timeline.',
      estimatedMinutes: 20,
      status: 'not_started'
    },
    {
      id: '4',
      title: 'Work on assignment',
      description: 'Complete the main work for this assignment. Take breaks as needed.',
      estimatedMinutes: 120,
      status: 'not_started'
    },
    {
      id: '5',
      title: 'Review and refine',
      description: 'Check your work against requirements. Make improvements where needed.',
      estimatedMinutes: 30,
      status: 'not_started'
    },
    {
      id: '6',
      title: 'Final check',
      description: 'Verify all requirements are met. Prepare for submission.',
      estimatedMinutes: 20,
      status: 'not_started'
    }
  ];
}

