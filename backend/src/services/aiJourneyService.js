/**
 * AI-Powered Journey Generation Service
 * 
 * Uses LLM to generate personalized step-by-step journeys based on
 * the assignment description and analysis.
 * 
 * Phase 2B: Enhanced personalization with AI
 */

import '../domain/assignment.js'; // For JSDoc types
import { client, modelName } from '../llm.js';
import { enhanceStepResources } from './resourceRecommendationService.js';

const USE_AI_JOURNEY = process.env.USE_AI_JOURNEY === 'true';

/**
 * Generates a personalized journey using AI based on assignment details
 * 
 * @param {import('../domain/assignment.js').Assignment} assignment
 * @param {import('../domain/assignment.js').AssignmentAnalysis} analysis
 * @param {Object|null} canvasContext - Optional Canvas course context
 * @returns {Promise<import('../domain/assignment.js').AssignmentJourney>}
 */
export async function generateJourneyWithAI(assignment, analysis, canvasContext = null) {
  if (!USE_AI_JOURNEY) {
    throw new Error('AI journey generation is disabled');
  }

  const { id: assignmentId, title, rawDescription, courseName, dueDate, points } = assignment;
  const { type, requiredSkills, estimatedTimeHours, prerequisites, deliverables, successCriteria } = analysis;

  const prompt = buildJourneyPrompt(assignment, analysis, canvasContext);
  const expectedMinutes = estimatedTimeHours * 60;

  try {
    console.log('🤖 [AI Journey] Generating for:', title);
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic assistant. Generate a personalized step-by-step journey. Return ONLY valid JSON matching the required format - no markdown, no explanations, just JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[2] || jsonMatch[3]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and transform
    let steps = validateAndTransformSteps(parsed, expectedMinutes);
    
    // Enhance resources with actual URLs (using AI-powered resource generation)
    steps = await Promise.all(steps.map(async (step) => ({
      ...step,
      resources: await enhanceStepResources(step.resources, step, analysis, assignment)
    })));
    
    const totalEstimatedMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

    const duration = Date.now() - startTime;
    console.log('✅ [AI Journey] Generated', {
      steps: steps.length,
      totalMinutes: totalEstimatedMinutes,
      durationMs: duration
    });

    return {
      assignmentId,
      totalEstimatedMinutes,
      steps
    };

  } catch (error) {
    console.error('❌ [AI Journey] Generation failed:', error.message);
    throw error;
  }
}

/**
 * Builds the prompt for AI journey generation
 */
function buildJourneyPrompt(assignment, analysis, canvasContext = null) {
  const { title, rawDescription, courseName, dueDate, points } = assignment;
  const { type, requiredSkills, estimatedTimeHours, prerequisites, deliverables, successCriteria } = analysis;

  // Truncate description if too long (~2000 chars)
  const maxDescLength = 2000;
  const description = rawDescription.length > maxDescLength
    ? rawDescription.substring(0, maxDescLength) + '\n\n[... description truncated ...]'
    : rawDescription;

  // Build Canvas context section
  let canvasSection = '';
  if (canvasContext) {
    canvasSection = `

CANVAS COURSE CONTEXT:
Course: ${canvasContext.courseName}
${canvasContext.courseCode ? `Code: ${canvasContext.courseCode}` : ''}

${canvasContext.moduleTitles.length > 0 ? `Course Modules:
${canvasContext.moduleTitles.map(m => `- ${m}`).join('\n')}` : ''}

${canvasContext.keyPages.length > 0 ? `Key Course Pages:
${canvasContext.keyPages.map(p => `- ${p.title}: ${p.url}`).join('\n')}` : ''}

${canvasContext.syllabusSnippet ? `Syllabus Excerpt:
${canvasContext.syllabusSnippet}...` : ''}

INSTRUCTIONS FOR CANVAS-AWARE STEPS:
- Reference specific modules/pages in step descriptions where helpful
- Suggest reviewing Canvas materials when relevant (e.g., "Review Module 3: Recursion on Canvas")
- Include Canvas page links in step resources when applicable
`;
  }

  return `Generate a personalized step-by-step journey for completing this assignment.

ASSIGNMENT DETAILS:
Title: ${title}
${courseName ? `Course: ${courseName}` : ''}
${dueDate ? `Due Date: ${dueDate}` : ''}
${points ? `Points: ${points}` : ''}

Description:
${description}
${canvasSection}

ASSIGNMENT ANALYSIS:
Type: ${type}
Required Skills: ${requiredSkills.join(', ')}
Estimated Time: ${estimatedTimeHours} hours (${estimatedTimeHours * 60} minutes)
Prerequisites: ${prerequisites.join(', ')}
Deliverables: ${deliverables.map(d => d.label + (d.required ? ' (required)' : ' (optional)')).join(', ')}
Success Criteria: ${successCriteria.join(', ')}

INSTRUCTIONS:
1. Determine the appropriate number of steps:
   - Simple assignments: 4-6 steps
   - Medium assignments: 6-9 steps
   - Complex assignments: 9-12 steps
   - Consider complexity, deliverables, and required skills

2. For each step, provide:
   - Clear, actionable title (e.g., "Understand requirements" not "Step 1")
   - HELPFUL description (2-4 sentences) that includes:
     * WHAT to do (specific to this assignment)
     * HOW to do it (practical guidance, tools, approaches)
     * WHY it matters (connection to assignment objectives/deliverables)
     * Example: Instead of "Write code", say "Implement the data fetching logic using the requests library. Start with a simple GET request to the weather API endpoint. This forms the foundation of your app's core functionality and will be used in later steps for displaying weather data."
   - Rough time estimate in minutes (for internal planning)
   - Optional learning resources with brief descriptions of their usefulness

3. Make descriptions EDUCATIONAL and SUPPORTIVE:
   - Break down complex tasks into understandable parts
   - Explain technical concepts when introducing them
   - Connect each step to the bigger picture and assignment goals
   - Provide context and encouragement
   - Reference specific assignment requirements: ${requiredSkills.join(', ')}
   - Address deliverables: ${deliverables.map(d => d.label).join(', ')}

4. Make steps specific to THIS assignment:
   - Use exact terminology from the assignment description
   - Reference specific tools/technologies mentioned
   - Connect to success criteria when relevant
   - Consider assignment type: ${type}

5. Ensure logical flow - each step builds on previous work

6. Include all necessary steps to meet requirements

Return JSON in this exact format:
{
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description referencing assignment specifics",
      "estimatedMinutes": 30,
      "resources": ["Optional resource name or URL"]
    }
  ]
}`;
}

/**
 * Validates and transforms AI response into JourneyStep format
 */
function validateAndTransformSteps(parsed, expectedMinutes) {
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error('AI response missing steps array');
  }

  if (parsed.steps.length === 0) {
    throw new Error('AI generated zero steps');
  }

  if (parsed.steps.length > 20) {
    throw new Error(`AI generated too many steps: ${parsed.steps.length}`);
  }

  // Transform and validate each step
  let steps = parsed.steps.map((step, index) => {
    if (!step.title || typeof step.title !== 'string') {
      throw new Error(`Step ${index + 1} missing valid title`);
    }
    if (!step.description || typeof step.description !== 'string') {
      throw new Error(`Step ${index + 1} missing valid description`);
    }

    // Normalize estimatedMinutes
    let minutes = parseInt(step.estimatedMinutes, 10);
    if (isNaN(minutes) || minutes < 5) {
      minutes = 30; // Default
    }
    if (minutes > 600) { // Max 10 hours per step
      minutes = 600;
    }

    // Keep resources as-is (will be enhanced later)
    const resources = Array.isArray(step.resources)
      ? step.resources.slice(0, 5) // Max 5 per step
      : [];

    return {
      id: String(index + 1),
      title: step.title.trim(),
      description: step.description.trim(),
      estimatedMinutes: minutes,
      status: 'not_started',
      resources: resources.length > 0 ? resources : undefined
    };
  });

  // Normalize time estimates if total is way off
  const currentTotal = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  if (currentTotal > 0 && Math.abs(currentTotal - expectedMinutes) / expectedMinutes > 0.5) {
    const scaleFactor = expectedMinutes / currentTotal;
    steps = steps.map(step => ({
      ...step,
      estimatedMinutes: Math.max(5, Math.round(step.estimatedMinutes * scaleFactor))
    }));
  }

  return steps;
}
