/**
 * Resource Recommendation Service
 * 
 * Generates personalized resource links for assignment steps using AI.
 * Falls back to heuristic-based recommendations if AI fails.
 * 
 * Phase 2B.2: Resource Recommendations
 * Phase 2B.3: AI-Powered Resource Generation
 */

import { client, modelName } from '../llm.js';

/**
 * Generates resources using AI based on step and assignment context
 * 
 * @param {Object} step - Journey step
 * @param {Object} analysis - Assignment analysis
 * @param {Object} assignment - Assignment details
 * @returns {Promise<Array<{title: string, url: string, type: string, howToUse: string, preview: string}>>}
 */
async function generateResourcesWithAI(step, analysis, assignment) {
  try {
    const { title, description } = step;
    const { type, requiredSkills } = analysis;
    
    const prompt = `You are helping a student find the most relevant learning resources for a specific step in their assignment.

ASSIGNMENT: ${assignment.title}
ASSIGNMENT TYPE: ${type}
REQUIRED SKILLS: ${requiredSkills.join(', ')}

CURRENT STEP: ${title}
STEP DESCRIPTION: ${description}

Generate 3-5 highly relevant online resources that will help the student complete this specific step. Focus on:
- Official documentation (when applicable)
- High-quality tutorials
- Community resources (Stack Overflow, GitHub, etc.)
- Academic resources (for research/writing tasks)

For each resource, provide:
1. title: Clear, descriptive name
2. url: Actual working URL (be specific - link to relevant sections, not just homepages)
3. type: One of [documentation, tutorial, reference, tool, course]
4. preview: 1 sentence describing what this resource contains
5. howToUse: 1-2 sentences explaining HOW the student should use this resource for this specific step

Return ONLY valid JSON in this format:
{
  "resources": [
    {
      "title": "Resource name",
      "url": "https://...",
      "type": "documentation",
      "preview": "What this resource contains",
      "howToUse": "How to use it for this step"
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational assistant. Generate relevant learning resources. Return ONLY valid JSON.'
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
      // Try extracting JSON from markdown
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[2] || jsonMatch[3]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    if (!parsed || !Array.isArray(parsed.resources)) {
      throw new Error('AI response missing resources array');
    }

    // Validate and clean up resources
    const resources = parsed.resources
      .filter(r => r.title && r.url && r.type)
      .map(r => ({
        title: r.title.trim(),
        url: r.url.trim(),
        type: r.type.trim(),
        preview: r.preview?.trim() || 'Helpful resource for this step',
        howToUse: r.howToUse?.trim() || 'Review this resource to help complete the step.'
      }))
      .slice(0, 5); // Max 5 resources

    console.log(`✅ Generated ${resources.length} AI resources for step: ${title}`);
    return resources;

  } catch (error) {
    console.warn(`⚠️ AI resource generation failed for step "${step.title}":`, error.message);
    return []; // Return empty, will fall back to heuristics
  }
}

/**
 * Generates resources for a step based on assignment context
 * Uses AI first, falls back to heuristics if AI fails
 * 
 * @param {Object} step - Journey step
 * @param {Object} analysis - Assignment analysis
 * @param {Object} assignment - Assignment details
 * @returns {Promise<Array<{title: string, url: string, type: string, howToUse: string, preview: string}>>}
 */
export async function generateStepResources(step, analysis, assignment) {
  // Try AI first
  const aiResources = await generateResourcesWithAI(step, analysis, assignment);
  
  if (aiResources.length > 0) {
    return aiResources;
  }
  
  // Fall back to heuristic-based generation
  console.log(`📚 Using heuristic resources for step: ${step.title}`);
  return generateHeuristicResources(step, analysis, assignment);
}

/**
 * Generates resources using heuristics (fallback method)
 * 
 * @param {Object} step - Journey step
 * @param {Object} analysis - Assignment analysis
 * @param {Object} assignment - Assignment details
 * @returns {Array<{title: string, url: string, type: string, howToUse: string, preview: string}>}
 */
function generateHeuristicResources(step, analysis, assignment) {
  const resources = [];
  const { title, description } = step;
  const { requiredSkills, type } = analysis;
  const stepText = `${title} ${description}`.toLowerCase();

  // Programming language resources
  if (requiredSkills.includes('python')) {
    resources.push({
      title: 'Python Documentation',
      url: 'https://docs.python.org/3/',
      type: 'documentation',
      howToUse: 'Use the search bar to find specific functions you need. Start with the "Tutorial" section if you\'re new, then refer to the "Library Reference" for detailed information on modules and functions.',
      preview: 'Official Python docs with tutorials, library reference, and language specifications'
    });
    if (stepText.includes('setup') || stepText.includes('install')) {
      resources.push({
        title: 'Python Installation Guide',
        url: 'https://www.python.org/downloads/',
        type: 'tutorial',
        howToUse: 'Download the latest Python version for your operating system. Follow the installation wizard and make sure to check "Add Python to PATH" during installation.',
        preview: 'Official Python downloads and installation instructions'
      });
    }
  }

  if (requiredSkills.includes('javascript')) {
    resources.push({
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      type: 'documentation',
      howToUse: 'Browse by topic or search for specific JavaScript features. Each page includes syntax examples, browser compatibility info, and interactive demos you can try.',
      preview: 'Comprehensive JavaScript reference with examples and tutorials'
    });
  }

  if (requiredSkills.includes('java')) {
    resources.push({
      title: 'Java Documentation',
      url: 'https://docs.oracle.com/javase/',
      type: 'documentation',
      howToUse: 'Navigate to the "API Specification" for detailed class and method documentation. Use the search feature to quickly find specific classes.',
      preview: 'Official Java SE documentation and API specifications'
    });
  }

  // GitHub resources
  if (stepText.includes('github') || stepText.includes('repository') || stepText.includes('repo')) {
    resources.push({
      title: 'GitHub Guides',
      url: 'https://guides.github.com/',
      type: 'tutorial',
      howToUse: 'Follow the "Hello World" guide to learn Git basics. Then check out guides on branching, pull requests, and issues as you need them.',
      preview: 'Step-by-step tutorials for getting started with GitHub'
    });
    resources.push({
      title: 'Git Documentation',
      url: 'https://git-scm.com/doc',
      type: 'documentation',
      howToUse: 'Refer to the "Reference" section for specific git commands. The "Book" is great for understanding Git concepts deeply.',
      preview: 'Official Git reference manual and Pro Git book'
    });
  }

  // Testing resources
  if (stepText.includes('test') || stepText.includes('testing')) {
    if (requiredSkills.includes('python')) {
      resources.push({
        title: 'Python Testing Guide',
        url: 'https://docs.python.org/3/library/unittest.html',
        type: 'documentation',
        howToUse: 'Read "Basic Example" first to understand test structure. Then use "Organizing Tests" to structure your test suite effectively.',
        preview: 'Official Python unittest framework documentation'
      });
    }
    resources.push({
      title: 'Testing Best Practices',
      url: 'https://stackoverflow.com/questions/tagged/unit-testing',
      type: 'reference',
      howToUse: 'Search for specific testing questions or browse highly-voted questions to learn common patterns and avoid pitfalls.',
      preview: 'Community Q&A on unit testing practices and patterns'
    });
  }

  // Research/Academic resources
  if (type === 'research_paper' || type === 'essay') {
    resources.push({
      title: 'Google Scholar',
      url: 'https://scholar.google.com/',
      type: 'tool',
      howToUse: 'Search for academic papers on your topic. Use "Cited by" to find influential papers, and filter by date for recent research.',
      preview: 'Search engine for scholarly articles and academic papers'
    });
    if (stepText.includes('citation') || stepText.includes('apa') || stepText.includes('mla')) {
      resources.push({
        title: 'Purdue OWL - Citation Guide',
        url: 'https://owl.purdue.edu/owl/research_and_citation/resources.html',
        type: 'tutorial',
        howToUse: 'Select your citation style (APA, MLA, Chicago, etc.) and follow the examples for different source types (books, websites, articles).',
        preview: 'Comprehensive guide for formatting citations in all major styles'
      });
    }
  }

  // Documentation/Writing resources
  if (stepText.includes('readme') || stepText.includes('documentation')) {
    resources.push({
      title: 'Markdown Guide',
      url: 'https://www.markdownguide.org/',
      type: 'tutorial',
      howToUse: 'Start with "Getting Started" for basic syntax. Use the "Cheat Sheet" as a quick reference while writing your README.',
      preview: 'Easy-to-follow guide for Markdown formatting syntax'
    });
  }

  // Machine Learning resources
  if (requiredSkills.includes('machine learning') || stepText.includes('ml') || stepText.includes('machine learning')) {
    resources.push({
      title: 'Scikit-learn Documentation',
      url: 'https://scikit-learn.org/stable/',
      type: 'documentation',
      howToUse: 'Start with "Supervised Learning" or "Unsupervised Learning" tutorials. Use "API Reference" to find specific algorithms and their parameters.',
      preview: 'Machine learning library documentation with algorithms and examples'
    });
  }

  // Data analysis resources
  if (requiredSkills.includes('data analysis') || requiredSkills.includes('data visualization')) {
    resources.push({
      title: 'Pandas Documentation',
      url: 'https://pandas.pydata.org/docs/',
      type: 'documentation',
      howToUse: 'Check "Getting Started" for basics of DataFrames. Then use "User Guide" for specific operations like filtering, grouping, or merging data.',
      preview: 'Data manipulation and analysis library for Python'
    });
  }

  // Stack Overflow for general coding help
  if (type === 'coding_project' && stepText.includes('implement') || stepText.includes('code')) {
    const skill = requiredSkills.find(s => ['python', 'javascript', 'java'].includes(s));
    if (skill) {
      resources.push({
        title: `Stack Overflow - ${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
        url: `https://stackoverflow.com/questions/tagged/${skill}`,
        type: 'reference',
        howToUse: 'Search for your specific error messages or coding questions. Look for highly-voted answers with detailed explanations and working code examples.',
        preview: `Community Q&A for ${skill} programming questions and solutions`
      });
    }
  }

  // Course materials hint (if Canvas integrated)
  if (assignment.courseName) {
    resources.push({
      title: `${assignment.courseName} Course Materials`,
      url: '#', // Will be replaced with Canvas link if available
      type: 'course',
      howToUse: 'Review lecture notes, slides, and examples from your course. Look for related assignments or practice problems that might help.',
      preview: 'Your course materials, lectures, and supplementary resources'
    });
  }

  // Limit to 5 resources per step
  return resources.slice(0, 5);
}

/**
 * Enhances step resources with actual URLs and validates them
 * 
 * @param {Array<string>} aiResources - Resources from AI journey (may be names or URLs)
 * @param {Object} step - Journey step
 * @param {Object} analysis - Assignment analysis
 * @param {Object} assignment - Assignment details
 * @returns {Promise<Array<{title: string, url: string, type: string, howToUse: string, preview: string}>>}
 */
export async function enhanceStepResources(aiResources, step, analysis, assignment) {
  const enhanced = [];
  
  // Start with AI-generated resources from journey (convert names to links if needed)
  for (const resource of aiResources || []) {
    const resourceLower = resource.toLowerCase();
    
    // Check if it's already a URL
    if (resource.startsWith('http://') || resource.startsWith('https://')) {
      enhanced.push({
        title: resource.split('/').pop() || 'Resource',
        url: resource,
        type: 'link',
        howToUse: 'Review this resource to help complete the step.',
        preview: 'Resource recommended by AI'
      });
    } else {
      // Try to map common resource names to URLs
      const mapped = mapResourceNameToUrl(resource);
      if (mapped) {
        enhanced.push(mapped);
      }
    }
  }
  
  // Generate AI-powered resources for this specific step
  const generated = await generateStepResources(step, analysis, assignment);
  
  // Merge and deduplicate
  const allResources = [...enhanced, ...generated];
  const seen = new Set();
  return allResources.filter(r => {
    const key = r.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5); // Max 5 resources
}

/**
 * Maps common resource names to URLs
 */
function mapResourceNameToUrl(name) {
  const nameLower = name.toLowerCase();
  const mappings = {
    'python documentation': { 
      title: 'Python Documentation', 
      url: 'https://docs.python.org/3/', 
      type: 'documentation',
      howToUse: 'Search for specific functions or browse the library reference for module documentation.',
      preview: 'Official Python documentation with tutorials and reference'
    },
    'python docs': { 
      title: 'Python Documentation', 
      url: 'https://docs.python.org/3/', 
      type: 'documentation',
      howToUse: 'Search for specific functions or browse the library reference for module documentation.',
      preview: 'Official Python documentation with tutorials and reference'
    },
    'github guides': { 
      title: 'GitHub Guides', 
      url: 'https://guides.github.com/', 
      type: 'tutorial',
      howToUse: 'Follow step-by-step tutorials to learn Git and GitHub basics.',
      preview: 'Beginner-friendly tutorials for getting started with GitHub'
    },
    'google scholar': { 
      title: 'Google Scholar', 
      url: 'https://scholar.google.com/', 
      type: 'tool',
      howToUse: 'Search for academic papers and research on your topic.',
      preview: 'Search engine for scholarly literature and academic papers'
    },
    'stack overflow': { 
      title: 'Stack Overflow', 
      url: 'https://stackoverflow.com/', 
      type: 'reference',
      howToUse: 'Search for specific coding questions or error messages you encounter.',
      preview: 'Programming Q&A community with millions of solutions'
    },
    'mdn': { 
      title: 'MDN Web Docs', 
      url: 'https://developer.mozilla.org/', 
      type: 'documentation',
      howToUse: 'Browse by web technology or search for specific JavaScript/CSS features.',
      preview: 'Comprehensive web development documentation and tutorials'
    },
    'purdue owl': { 
      title: 'Purdue OWL', 
      url: 'https://owl.purdue.edu/', 
      type: 'tutorial',
      howToUse: 'Navigate to citation guides or writing resources for academic papers.',
      preview: 'Academic writing and citation guide from Purdue University'
    },
    'markdown guide': { 
      title: 'Markdown Guide', 
      url: 'https://www.markdownguide.org/', 
      type: 'tutorial',
      howToUse: 'Use the cheat sheet as a quick reference while writing your documentation.',
      preview: 'Quick reference for Markdown formatting syntax'
    },
  };
  
  for (const [key, value] of Object.entries(mappings)) {
    if (nameLower.includes(key)) {
      return value;
    }
  }
  
  return null;
}
