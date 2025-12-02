/**
 * Canvas Context Service
 * 
 * Fetches relevant Canvas context for an assignment to enhance AI journey generation.
 * Phase 2: Canvas-aware step generation
 */

import { canvasClient } from '../canvasMCP.js';

/**
 * @typedef {Object} CanvasContext
 * @property {string} courseName - Name of the course
 * @property {string|null} courseCode - Course code (if available)
 * @property {string[]} moduleTitles - List of module titles
 * @property {Array<{title: string, url: string}>} keyPages - List of important course pages
 * @property {string|null} syllabusSnippet - First 500 chars of syllabus
 */

/**
 * Gets Canvas context for an assignment to enhance journey generation
 * 
 * @param {Object} assignment - Assignment object with courseId, courseName, etc.
 * @returns {Promise<CanvasContext|null>} Canvas context or null if unavailable
 */
export async function getCanvasContextForAssignment(assignment) {
  if (!assignment.courseId) {
    return null; // Not a Canvas assignment
  }

  try {
    console.log(`🎓 Fetching Canvas context for course ${assignment.courseId}`);

    // Fetch course materials (modules, pages, files)
    const materials = await canvasClient.getCourseMaterials(assignment.courseId);
    
    // Extract module titles
    const moduleTitles = materials.modules
      ?.filter(m => m.name)
      .map(m => m.name)
      .slice(0, 10) || []; // Max 10 modules

    // Extract key pages (prioritize recently updated or with relevant keywords)
    const keyPages = materials.pages
      ?.filter(p => p.title && p.url)
      .map(p => ({
        title: p.title,
        url: p.html_url || `https://canvas.instructure.com/courses/${assignment.courseId}/pages/${p.url}`
      }))
      .slice(0, 5) || []; // Max 5 pages

    // Optionally fetch syllabus
    const syllabusData = await canvasClient.getCourseSyllabus(assignment.courseId);
    const syllabusSnippet = syllabusData.syllabus
      ? syllabusData.syllabus.substring(0, 500) // First 500 chars
      : null;

    const context = {
      courseName: assignment.courseName || 'Unknown Course',
      courseCode: assignment.courseCode || null,
      moduleTitles,
      keyPages,
      syllabusSnippet
    };

    console.log(`✅ Canvas context fetched: ${moduleTitles.length} modules, ${keyPages.length} pages`);
    return context;

  } catch (error) {
    console.error('❌ Failed to fetch Canvas context:', error.message);
    return null; // Graceful degradation
  }
}


