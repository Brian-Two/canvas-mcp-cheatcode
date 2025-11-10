/**
 * Message Formatter Utility
 * Formats LLM responses by removing think tags and highlighting questions
 */

interface FormattedMessage {
  content: string;
  questions: string[];
  hasQuestions: boolean;
}

/**
 * Remove <think> tags and extract content after </think>
 */
export const stripThinkTags = (text: string): string => {
  // Match everything from <think> to </think> including the tags
  const thinkPattern = /<think>[\s\S]*?<\/think>\s*/gi;
  return text.replace(thinkPattern, '').trim();
};

/**
 * Extract questions from text
 * Detects:
 * - Lines ending with ?
 * - Numbered questions (1., 2., etc.)
 * - Bullet questions (-, •, *)
 */
export const extractQuestions = (text: string): string[] => {
  const questions: string[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if line contains a question mark
    if (line.includes('?')) {
      // Handle numbered lists (1. Question?)
      const numberedMatch = line.match(/^\d+\.\s*(.+\?)/);
      if (numberedMatch) {
        questions.push(numberedMatch[1].trim());
        continue;
      }
      
      // Handle bullet points (- Question?, • Question?, * Question?)
      const bulletMatch = line.match(/^[•\-\*]\s*(.+\?)/);
      if (bulletMatch) {
        questions.push(bulletMatch[1].trim());
        continue;
      }
      
      // Handle bold markdown questions (**Question?**)
      const boldMatch = line.match(/\*\*(.+\?)\*\*/);
      if (boldMatch) {
        questions.push(boldMatch[1].trim());
        continue;
      }
      
      // Regular question (just ends with ?)
      if (line.endsWith('?')) {
        questions.push(line);
      }
    }
  }
  
  return questions;
};

/**
 * Remove questions from main content (they'll be displayed separately)
 */
export const removeQuestionsFromContent = (text: string, questions: string[]): string => {
  let result = text;
  
  questions.forEach(question => {
    // Remove the question and its list marker if present
    const patterns = [
      new RegExp(`^\\d+\\.\\s*\\*\\*${escapeRegex(question)}\\*\\*`, 'gm'),
      new RegExp(`^\\d+\\.\\s*${escapeRegex(question)}`, 'gm'),
      new RegExp(`^[•\\-\\*]\\s*\\*\\*${escapeRegex(question)}\\*\\*`, 'gm'),
      new RegExp(`^[•\\-\\*]\\s*${escapeRegex(question)}`, 'gm'),
      new RegExp(`\\*\\*${escapeRegex(question)}\\*\\*`, 'g'),
      new RegExp(escapeRegex(question), 'g'),
    ];
    
    patterns.forEach(pattern => {
      result = result.replace(pattern, '');
    });
  });
  
  // Clean up extra newlines
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  
  return result;
};

/**
 * Escape special regex characters
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Format LLM response
 * - Strips <think> tags
 * - Extracts questions
 * - Returns formatted message
 */
export const formatLLMResponse = (rawResponse: string): FormattedMessage => {
  // Step 1: Remove think tags
  const contentWithoutThink = stripThinkTags(rawResponse);
  
  // Step 2: Extract questions
  const questions = extractQuestions(contentWithoutThink);
  
  // Step 3: Remove questions from main content
  const content = removeQuestionsFromContent(contentWithoutThink, questions);
  
  return {
    content,
    questions,
    hasQuestions: questions.length > 0,
  };
};


