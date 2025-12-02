# Phase 2B: AI-Powered Journey Generation - Approach Review

## ✅ Overall Assessment

**Status**: APPROVED with improvements

The approach is solid but needs enhancements for production readiness:
- Better error handling and validation
- Feature flag support
- Response format verification
- Token limit management

---

## 🔍 Issues Identified & Solutions

### Issue 1: JSON Response Validation
**Problem**: AI may return invalid JSON or missing fields

**Solution**: Add robust validation layer

```javascript
function validateAIResponse(parsed, assignmentId) {
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error('AI response missing steps array');
  }
  
  if (parsed.steps.length === 0) {
    throw new Error('AI generated zero steps');
  }
  
  if (parsed.steps.length > 20) {
    throw new Error(`AI generated too many steps: ${parsed.steps.length}`);
  }
  
  // Validate each step
  return parsed.steps.map((step, index) => {
    if (!step.title || typeof step.title !== 'string') {
      throw new Error(`Step ${index + 1} missing valid title`);
    }
    if (!step.description || typeof step.description !== 'string') {
      throw new Error(`Step ${index + 1} missing valid description`);
    }
    
    // Normalize estimatedMinutes
    let minutes = parseInt(step.estimatedMinutes, 10);
    if (isNaN(minutes) || minutes < 5) {
      minutes = 30; // Default if invalid
    }
    if (minutes > 600) { // 10 hours max per step
      minutes = 600;
    }
    
    // Normalize resources
    const resources = Array.isArray(step.resources) 
      ? step.resources.filter(r => typeof r === 'string')
      : [];
    
    return {
      id: String(index + 1),
      title: step.title.trim(),
      description: step.description.trim(),
      estimatedMinutes: minutes,
      status: 'not_started',
      resources: resources.slice(0, 5) // Limit to 5 resources per step
    };
  });
}
```

---

### Issue 2: Response Format Support
**Problem**: `response_format: { type: "json_object" }` may not be supported

**Solution**: Try JSON mode, fallback to parsing text

```javascript
async function generateJourneyWithAI(assignment, analysis) {
  const prompt = buildJourneyPrompt(assignment, analysis);
  
  try {
    // Try with JSON mode first
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    let parsed = JSON.parse(content);
    
    // Validate and transform
    const steps = validateAIResponse(parsed, assignment.id);
    
    // ... rest of logic
    
  } catch (jsonError) {
    // If JSON mode fails, try without it and extract JSON from response
    console.warn('JSON mode failed, trying text parsing:', jsonError.message);
    
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown, no explanations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });
    
    const content = response.choices[0].message.content;
    // Try to extract JSON from markdown code blocks or plain text
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|({[\s\S]*})/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[2] || jsonMatch[3]) : content;
    
    const parsed = JSON.parse(jsonText);
    const steps = validateAIResponse(parsed, assignment.id);
    
    // ... rest of logic
  }
}
```

---

### Issue 3: Feature Flag
**Problem**: No way to disable AI without code changes

**Solution**: Environment variable

```javascript
const USE_AI_JOURNEY_GENERATION = process.env.USE_AI_JOURNEY === 'true';

export async function buildJourneyFromAnalysis(analysis, assignment = null) {
  const { assignmentId, type } = analysis;
  
  // Use AI if enabled and assignment is provided
  if (USE_AI_JOURNEY_GENERATION && assignment) {
    try {
      console.log('🤖 Using AI to generate personalized journey');
      return await generateJourneyWithAI(assignment, analysis);
    } catch (error) {
      console.warn('⚠️ AI journey generation failed, falling back to templates:', error.message);
      // Fall through to template-based generation
    }
  }
  
  // Fallback to template-based generation (existing code)
  // ...
}
```

---

### Issue 4: Prompt Length Management
**Problem**: Long assignments may exceed token limits

**Solution**: Truncate description if needed

```javascript
function buildJourneyPrompt(assignment, analysis) {
  const { title, rawDescription, courseName, dueDate, points } = assignment;
  const { type, requiredSkills, estimatedTimeHours, prerequisites, deliverables, successCriteria } = analysis;

  // Truncate description if too long (keep ~2000 chars)
  const maxDescLength = 2000;
  const truncatedDescription = rawDescription.length > maxDescLength
    ? rawDescription.substring(0, maxDescLength) + '\n\n[... description truncated ...]'
    : rawDescription;

  return `Generate a personalized step-by-step journey for completing this assignment.

ASSIGNMENT DETAILS:
Title: ${title}
${courseName ? `Course: ${courseName}` : ''}
${dueDate ? `Due Date: ${dueDate}` : ''}
${points ? `Points: ${points}` : ''}

Description:
${truncatedDescription}

ASSIGNMENT ANALYSIS:
Type: ${type}
Required Skills: ${requiredSkills.join(', ')}
Estimated Time: ${estimatedTimeHours} hours
Prerequisites: ${prerequisites.join(', ')}
Deliverables: ${deliverables.map(d => d.label + (d.required ? ' (required)' : ' (optional)')).join(', ')}
Success Criteria: ${successCriteria.join(', ')}

INSTRUCTIONS:
[... rest of prompt ...]
`;
}
```

---

### Issue 5: Time Estimate Validation
**Problem**: AI time estimates may not align with analysis estimate

**Solution**: Validate and adjust if needed

```javascript
function normalizeTimeEstimates(steps, expectedTotalMinutes) {
  const currentTotal = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  
  // If total is way off (>50% difference), scale proportionally
  if (currentTotal > 0 && Math.abs(currentTotal - expectedTotalMinutes) / expectedTotalMinutes > 0.5) {
    const scaleFactor = expectedTotalMinutes / currentTotal;
    return steps.map(step => ({
      ...step,
      estimatedMinutes: Math.max(5, Math.round(step.estimatedMinutes * scaleFactor))
    }));
  }
  
  return steps;
}

// In generateJourneyWithAI:
const steps = validateAIResponse(parsed, assignment.id);
const normalizedSteps = normalizeTimeEstimates(steps, analysis.estimatedTimeHours * 60);
const totalEstimatedMinutes = normalizedSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
```

---

### Issue 6: Enhanced Logging
**Problem**: Hard to debug AI failures

**Solution**: Structured logging

```javascript
async function generateJourneyWithAI(assignment, analysis) {
  const startTime = Date.now();
  
  try {
    console.log('🤖 [AI Journey] Starting generation', {
      assignmentId: assignment.id,
      title: assignment.title,
      type: analysis.type,
      estimatedHours: analysis.estimatedTimeHours
    });
    
    // ... AI call ...
    
    const duration = Date.now() - startTime;
    console.log('✅ [AI Journey] Generation complete', {
      assignmentId: assignment.id,
      steps: steps.length,
      totalMinutes: totalEstimatedMinutes,
      durationMs: duration
    });
    
    return { assignmentId, totalEstimatedMinutes, steps };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [AI Journey] Generation failed', {
      assignmentId: assignment.id,
      error: error.message,
      durationMs: duration,
      stack: error.stack
    });
    throw error;
  }
}
```

---

## 📋 Revised Implementation Plan

### Step 1: Create AI Journey Service
**File**: `backend/src/services/aiJourneyService.js`

### Step 2: Update Assignment Analysis Service
**File**: `backend/src/services/assignmentAnalysisService.js`

### Step 3: Update API Endpoint
**File**: `backend/src/api/server.js`

### Step 4: Add Environment Variable
**File**: `.env` (or `.env.example`)

```
USE_AI_JOURNEY=true
```

---

## 🧪 Testing Strategy

1. **Simple Assignment** (4-6 steps expected)
   - Short description
   - Basic requirements
   - Verify step count and quality

2. **Complex Assignment** (9-12 steps expected)
   - Long description
   - Multiple deliverables
   - Verify appropriate step count

3. **Edge Cases**:
   - Very long description (test truncation)
   - Missing optional fields
   - Invalid AI response (test fallback)
   - AI timeout (test error handling)

4. **Validation Tests**:
   - All steps have required fields
   - Time estimates are reasonable
   - Resources are valid format
   - Total time aligns with analysis

---

## 🚀 Recommended Next Steps

1. **Phase 1**: Implement with feature flag disabled by default
2. **Phase 2**: Enable AI for testing
3. **Phase 3**: Tune prompts
4. **Phase 4**: Production rollout

---

## ✅ Final Verdict

**Approach is APPROVED** with the improvements above.

Ready to implement! 🚀
