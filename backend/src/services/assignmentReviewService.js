/**
 * Assignment Review Service
 * 
 * Provides AI-powered review of completed assignments, analyzing:
 * - Completeness against requirements
 * - Strengths and areas for improvement
 * - Rubric alignment
 * - Submission readiness
 * 
 * Phase 2A: Initial implementation with structured analysis
 */

import '../domain/assignment.js'; // For JSDoc types

/**
 * Reviews a completed assignment and provides comprehensive feedback
 * 
 * @param {Object} reviewData - Review request data
 * @param {import('../domain/assignment.js').Assignment} reviewData.assignment
 * @param {import('../domain/assignment.js').AssignmentAnalysis} reviewData.analysis
 * @param {import('../domain/assignment.js').AssignmentJourney} reviewData.journey
 * @param {Record<string, string>} reviewData.stepNotes
 * @param {Record<string, Array<{id: string, text: string, completed: boolean}>>} reviewData.stepSubtasks
 * @param {Array<{role: string, content: string}>} reviewData.chatHistory
 * @param {string} [reviewData.finalWork]
 * @param {string} [reviewData.additionalContext]
 * @returns {Promise<Object>} Review response with feedback
 */
export async function reviewAssignment(reviewData) {
  const {
    assignment,
    analysis,
    journey,
    stepNotes,
    stepSubtasks,
    chatHistory,
    finalWork = '',
    additionalContext = ''
  } = reviewData;

  // Calculate completeness based on steps and subtasks
  const completeness = calculateCompleteness(journey, stepNotes, stepSubtasks);

  // Analyze strengths
  const strengths = identifyStrengths(journey, stepNotes, stepSubtasks, chatHistory, analysis);

  // Identify areas for improvement
  const improvements = identifyImprovements(journey, stepNotes, stepSubtasks, analysis, finalWork);

  // Score against rubric (success criteria)
  const rubricScores = scoreRubric(analysis, journey, stepNotes, stepSubtasks, finalWork);

  // Determine submission readiness
  const submissionReadiness = determineReadiness(completeness, rubricScores, improvements);

  // Generate detailed feedback
  const detailedFeedback = generateDetailedFeedback(
    assignment,
    analysis,
    journey,
    completeness,
    strengths,
    improvements,
    rubricScores
  );

  // Generate recommendations
  const recommendations = generateRecommendations(improvements, rubricScores, submissionReadiness);

  return {
    completeness,
    strengths,
    improvements,
    rubricScores,
    submissionReadiness,
    detailedFeedback,
    recommendations
  };
}

/**
 * Calculate overall completeness percentage
 */
function calculateCompleteness(journey, stepNotes, stepSubtasks) {
  if (!journey || !journey.steps || journey.steps.length === 0) {
    return 0;
  }

  const totalSteps = journey.steps.length;
  const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
  
  // Weight: 70% step completion, 30% subtask completion
  const stepCompletion = (completedSteps / totalSteps) * 100;
  
  // Calculate subtask completion
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  
  Object.values(stepSubtasks).forEach(subtasks => {
    subtasks.forEach(subtask => {
      totalSubtasks++;
      if (subtask.completed) {
        completedSubtasks++;
      }
    });
  });
  
  const subtaskCompletion = totalSubtasks > 0 
    ? (completedSubtasks / totalSubtasks) * 100 
    : 100; // If no subtasks, assume full completion
  
  return Math.round((stepCompletion * 0.7) + (subtaskCompletion * 0.3));
}

/**
 * Identify strengths based on work done
 */
function identifyStrengths(journey, stepNotes, stepSubtasks, chatHistory, analysis) {
  const strengths = [];

  // Check step completion
  const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
  if (completedSteps === journey.steps.length) {
    strengths.push('Completed all steps in the journey');
  } else if (completedSteps >= journey.steps.length * 0.8) {
    strengths.push('Made significant progress through all steps');
  }

  // Check note-taking
  const stepsWithNotes = Object.keys(stepNotes).filter(key => stepNotes[key]?.trim().length > 0).length;
  if (stepsWithNotes >= journey.steps.length * 0.6) {
    strengths.push('Maintained detailed notes throughout the process');
  }

  // Check subtask completion
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  Object.values(stepSubtasks).forEach(subtasks => {
    subtasks.forEach(subtask => {
      totalSubtasks++;
      if (subtask.completed) {
        completedSubtasks++;
      }
    });
  });
  
  if (totalSubtasks > 0 && completedSubtasks / totalSubtasks >= 0.8) {
    strengths.push('Followed through on detailed subtasks');
  }

  // Check engagement (chat history)
  if (chatHistory && chatHistory.length > 10) {
    strengths.push('Actively engaged with AI assistance throughout');
  }

  // Check deliverables
  if (analysis.deliverables && analysis.deliverables.length > 0) {
    const requiredDeliverables = analysis.deliverables.filter(d => d.required).length;
    if (requiredDeliverables > 0) {
      strengths.push(`Addressed ${requiredDeliverables} required deliverable${requiredDeliverables > 1 ? 's' : ''}`);
    }
  }

  // Default if no specific strengths
  if (strengths.length === 0) {
    strengths.push('Made progress on the assignment');
  }

  return strengths;
}

/**
 * Identify areas for improvement
 */
function identifyImprovements(journey, stepNotes, stepSubtasks, analysis, finalWork) {
  const improvements = [];

  // Check incomplete steps
  const incompleteSteps = journey.steps.filter(step => step.status !== 'completed');
  if (incompleteSteps.length > 0) {
    improvements.push(`Complete remaining ${incompleteSteps.length} step${incompleteSteps.length > 1 ? 's' : ''}: ${incompleteSteps.map(s => s.title).join(', ')}`);
  }

  // Check incomplete subtasks
  const incompleteSubtasks = [];
  Object.entries(stepSubtasks).forEach(([stepId, subtasks]) => {
    subtasks.forEach(subtask => {
      if (!subtask.completed) {
        incompleteSubtasks.push(subtask.text);
      }
    });
  });
  
  if (incompleteSubtasks.length > 0 && incompleteSubtasks.length <= 5) {
    improvements.push(`Complete remaining subtasks: ${incompleteSubtasks.slice(0, 3).join(', ')}${incompleteSubtasks.length > 3 ? '...' : ''}`);
  }

  // Check for missing notes on key steps
  const keyStepsWithoutNotes = journey.steps
    .filter(step => !stepNotes[step.id] || stepNotes[step.id].trim().length === 0)
    .slice(0, 3);
  
  if (keyStepsWithoutNotes.length > 0) {
    improvements.push(`Add notes or documentation for: ${keyStepsWithoutNotes.map(s => s.title).join(', ')}`);
  }

  // Check deliverables
  if (analysis.deliverables) {
    const missingDeliverables = analysis.deliverables
      .filter(d => d.required && !isDeliverablePresent(d.label, finalWork, stepNotes))
      .map(d => d.label);
    
    if (missingDeliverables.length > 0) {
      improvements.push(`Ensure all required deliverables are included: ${missingDeliverables.join(', ')}`);
    }
  }

  // Check final work quality
  if (!finalWork || finalWork.trim().length < 100) {
    improvements.push('Add your final work or draft for more comprehensive review');
  }

  // Default if no specific improvements
  if (improvements.length === 0) {
    improvements.push('Review your work one more time before submission');
  }

  return improvements;
}

/**
 * Check if a deliverable is present in work or notes
 */
function isDeliverablePresent(deliverableLabel, finalWork, stepNotes) {
  const searchText = `${finalWork} ${Object.values(stepNotes).join(' ')}`.toLowerCase();
  const labelLower = deliverableLabel.toLowerCase();
  
  // Simple keyword matching
  const keywords = {
    'pdf': ['pdf', 'document', 'file'],
    'code': ['code', 'implementation', 'program', 'script'],
    'report': ['report', 'write-up', 'documentation'],
    'presentation': ['presentation', 'slides', 'powerpoint'],
    'github': ['github', 'repository', 'repo'],
    'test': ['test', 'testing', 'unit test']
  };
  
  for (const [key, terms] of Object.entries(keywords)) {
    if (labelLower.includes(key)) {
      return terms.some(term => searchText.includes(term));
    }
  }
  
  return searchText.includes(labelLower);
}

/**
 * Score against rubric (success criteria)
 */
function scoreRubric(analysis, journey, stepNotes, stepSubtasks, finalWork) {
  const scores = {};
  
  if (!analysis.successCriteria || analysis.successCriteria.length === 0) {
    // Default rubric if none specified
    scores['Completeness'] = calculateCompleteness(journey, stepNotes, stepSubtasks);
    scores['Quality'] = finalWork && finalWork.trim().length > 100 ? 85 : 60;
    scores['Documentation'] = Object.keys(stepNotes).length > 0 ? 75 : 50;
    return scores;
  }
  
  // Score each success criterion
  analysis.successCriteria.forEach((criterion, index) => {
    const criterionLower = criterion.toLowerCase();
    let score = 70; // Default score
    
    // Check for evidence in notes, subtasks, or final work
    const evidence = `${Object.values(stepNotes).join(' ')} ${finalWork || ''}`.toLowerCase();
    
    if (criterionLower.includes('complete') || criterionLower.includes('finish')) {
      const completedSteps = journey.steps.filter(s => s.status === 'completed').length;
      score = Math.round((completedSteps / journey.steps.length) * 100);
    } else if (criterionLower.includes('test') || criterionLower.includes('quality')) {
      score = evidence.includes('test') || evidence.includes('quality') ? 85 : 60;
    } else if (criterionLower.includes('document') || criterionLower.includes('comment')) {
      score = Object.keys(stepNotes).length > 0 ? 80 : 50;
    } else if (evidence.includes(criterionLower.split(' ')[0])) {
      score = 85;
    }
    
    scores[criterion] = score;
  });
  
  return scores;
}

/**
 * Determine submission readiness
 */
function determineReadiness(completeness, rubricScores, improvements) {
  const avgRubricScore = Object.values(rubricScores).length > 0
    ? Object.values(rubricScores).reduce((sum, score) => sum + score, 0) / Object.values(rubricScores).length
    : completeness;
  
  const criticalIssues = improvements.filter(imp => 
    imp.toLowerCase().includes('missing') || 
    imp.toLowerCase().includes('required') ||
    imp.toLowerCase().includes('complete remaining')
  ).length;
  
  if (completeness >= 90 && avgRubricScore >= 85 && criticalIssues === 0) {
    return 'ready';
  } else if (completeness >= 75 && avgRubricScore >= 70 && criticalIssues <= 2) {
    return 'almost';
  } else {
    return 'needs-work';
  }
}

/**
 * Generate detailed feedback
 */
function generateDetailedFeedback(assignment, analysis, journey, completeness, strengths, improvements, rubricScores) {
  let feedback = `## Review for: ${assignment.title}\n\n`;
  
  feedback += `**Overall Completeness:** ${completeness}%\n\n`;
  
  feedback += `### Strengths\n`;
  strengths.forEach((strength, i) => {
    feedback += `${i + 1}. ${strength}\n`;
  });
  
  feedback += `\n### Areas for Improvement\n`;
  improvements.forEach((improvement, i) => {
    feedback += `${i + 1}. ${improvement}\n`;
  });
  
  if (Object.keys(rubricScores).length > 0) {
    feedback += `\n### Rubric Scores\n`;
    Object.entries(rubricScores).forEach(([criterion, score]) => {
      feedback += `- **${criterion}:** ${score}/100\n`;
    });
  }
  
  return feedback;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(improvements, rubricScores, submissionReadiness) {
  const recommendations = [];
  
  if (submissionReadiness === 'needs-work') {
    recommendations.push('Focus on completing the highest priority improvements before submission');
  } else if (submissionReadiness === 'almost') {
    recommendations.push('Address the remaining items to ensure submission readiness');
  } else {
    recommendations.push('Your work looks ready for submission! Consider a final review.');
  }
  
  // Add rubric-specific recommendations
  const lowScores = Object.entries(rubricScores)
    .filter(([_, score]) => score < 75)
    .map(([criterion, _]) => criterion);
  
  if (lowScores.length > 0) {
    recommendations.push(`Focus on improving: ${lowScores.join(', ')}`);
  }
  
  // Add improvement-specific recommendations
  if (improvements.length > 0) {
    recommendations.push(`Prioritize: ${improvements[0]}`);
  }
  
  return recommendations;
}

