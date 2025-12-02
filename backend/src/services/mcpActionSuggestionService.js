/**
 * MCP Action Suggestion Service
 * 
 * Suggests MCP actions for journey steps based on assignment type and step content.
 * Phase 2: Simple heuristic-based suggestions (no AI, no complex rules engine)
 */

import { mcpManager, MCP_TYPES } from '../mcp/mcpManager.js';

/**
 * @typedef {Object} StepAction
 * @property {string} id - Unique action ID
 * @property {string} label - Display label for the action
 * @property {string} kind - Action kind (always 'mcp' for now)
 * @property {string} mcpType - MCP server type
 * @property {string} mcpTool - MCP tool name to execute
 * @property {Object} payloadPreview - Default parameters for the tool
 */

/**
 * Suggests MCP actions for a step based on heuristics
 * 
 * @param {Object} step - Journey step
 * @param {Object} assignment - Assignment details
 * @returns {StepAction[]} Array of suggested actions
 */
export function suggestMcpActionsForStep(step, assignment) {
  const actions = [];
  const stepText = `${step.title} ${step.description}`.toLowerCase();
  const assignmentDesc = assignment.rawDescription?.toLowerCase() || '';

  // Check connected MCP servers
  const githubConnected = mcpManager.getServersByType(MCP_TYPES.GITHUB)
    .some(s => s.status === 'connected');
  const driveConnected = mcpManager.getServersByType(MCP_TYPES.GOOGLE_DRIVE)
    .some(s => s.status === 'connected');

  // Rule 1: GitHub repo creation for coding/project setup steps
  if (githubConnected) {
    const isSetupStep = stepText.includes('setup') || 
                        stepText.includes('initialize') || 
                        stepText.includes('create') || 
                        stepText.includes('repository') ||
                        stepText.includes('git') ||
                        stepText.includes('project structure');

    const isCodingAssignment = assignment.type === 'coding_project' ||
                               assignmentDesc.includes('code') ||
                               assignmentDesc.includes('program') ||
                               assignmentDesc.includes('github');

    if (isSetupStep && isCodingAssignment) {
      actions.push({
        id: `github_create_repo_${step.id}`,
        label: 'Create GitHub Repository',
        kind: 'mcp',
        mcpType: MCP_TYPES.GITHUB,
        mcpTool: 'github_create_repo',
        payloadPreview: {
          name: assignment.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: `Repository for ${assignment.title}`,
          autoInit: true,
          private: false
        }
      });
    }
  }

  // Rule 2: Google Doc creation for writing/essay steps
  if (driveConnected) {
    const isWritingStep = stepText.includes('write') || 
                          stepText.includes('draft') || 
                          stepText.includes('outline') ||
                          stepText.includes('essay') ||
                          stepText.includes('paper');

    const isWritingAssignment = assignment.type === 'essay' ||
                                assignment.type === 'research_paper' ||
                                assignmentDesc.includes('essay') ||
                                assignmentDesc.includes('paper') ||
                                assignmentDesc.includes('write');

    if (isWritingStep && isWritingAssignment) {
      actions.push({
        id: `gdrive_create_doc_${step.id}`,
        label: 'Create Google Doc',
        kind: 'mcp',
        mcpType: MCP_TYPES.GOOGLE_DRIVE,
        mcpTool: 'create_google_doc',
        payloadPreview: {
          title: assignment.title
        }
      });
    }
  }

  return actions;
}

/**
 * Enhances all journey steps with MCP action suggestions
 * 
 * @param {Object} journey - Assignment journey
 * @param {Object} assignment - Assignment details
 * @returns {Object} Journey with enhanced steps
 */
export function enhanceJourneyWithMcpActions(journey, assignment) {
  const enhancedSteps = journey.steps.map(step => {
    const actions = suggestMcpActionsForStep(step, assignment);
    return {
      ...step,
      actions: actions.length > 0 ? actions : undefined
    };
  });

  return {
    ...journey,
    steps: enhancedSteps
  };
}


