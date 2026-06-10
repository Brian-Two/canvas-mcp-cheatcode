/**
 * Export Training CSV Utility
 * Generates ML training data from Canvas assignments + ASTAR session data
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Hash user ID for anonymization
 */
function hashUserId(userId) {
  const salt = process.env.ML_HASH_SALT || 'astar-ml-2025';
  return crypto.createHash('sha256').update(`${userId}-${salt}`).digest('hex').substring(0, 16);
}

/**
 * Calculate days until due from a due date string
 */
function calculateDaysUntilDue(dueAt) {
  if (!dueAt) return 999; // Far future for assignments without due dates
  const due = new Date(dueAt);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Compute derived features from session summaries
 */
function computeSessionFeatures(sessionSummaries, assignmentId) {
  const sessions = sessionSummaries.filter(s => s.assignmentId === assignmentId);
  
  if (sessions.length === 0) {
    return {
      num_sessions: 0,
      num_messages: 0,
      avg_messages_per_session: 0,
      used_step_mode: 0,
      num_concepts: 0,
      num_context_items: 0,
      session_duration_hours: 0,
      session_span_days: 0,
      early_start_days: 0,
      message_length_avg: 0,
      question_ratio: 0,
      engagement_score: 0,
    };
  }

  const numSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.numMessages || 0), 0);
  const avgMessagesPerSession = totalMessages / numSessions;
  const usedStepMode = sessions.some(s => s.usedStepMode) ? 1 : 0;
  const totalConcepts = sessions.reduce((sum, s) => sum + (s.numConcepts || 0), 0);
  const totalContextItems = sessions.reduce((sum, s) => sum + (s.numContextItems || 0), 0);
  const totalDurationHours = sessions.reduce((sum, s) => sum + (s.sessionDurationMinutes || 0), 0) / 60;
  
  // Temporal features
  const sessionDates = sessions
    .map(s => s.createdAt ? new Date(s.createdAt).getTime() : null)
    .filter(d => d !== null)
    .sort();
  
  const sessionSpanDays = sessionDates.length > 1
    ? (sessionDates[sessionDates.length - 1] - sessionDates[0]) / (1000 * 60 * 60 * 24)
    : 0;
  
  // Message analysis
  const allMessages = sessions.flatMap(s => s.messages || []);
  const userMessages = allMessages.filter(m => m.role === 'user');
  const avgMessageLength = userMessages.length > 0
    ? userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / userMessages.length
    : 0;
  const questionCount = userMessages.filter(m => (m.content || '').includes('?')).length;
  const questionRatio = userMessages.length > 0 ? questionCount / userMessages.length : 0;
  
  // Engagement score (composite metric)
  const engagementScore = (
    totalMessages * 0.3 +
    totalConcepts * 0.2 +
    totalContextItems * 0.2 +
    (usedStepMode ? 20 : 0) +
    totalDurationHours * 0.3
  );

  return {
    num_sessions: numSessions,
    num_messages: totalMessages,
    avg_messages_per_session: parseFloat(avgMessagesPerSession.toFixed(2)),
    used_step_mode: usedStepMode,
    num_concepts: totalConcepts,
    num_context_items: totalContextItems,
    session_duration_hours: parseFloat(totalDurationHours.toFixed(2)),
    session_span_days: parseFloat(sessionSpanDays.toFixed(2)),
    early_start_days: 0, // Will be computed with due_date
    message_length_avg: parseFloat(avgMessageLength.toFixed(2)),
    question_ratio: parseFloat(questionRatio.toFixed(3)),
    engagement_score: parseFloat(engagementScore.toFixed(2)),
  };
}

/**
 * Generate training CSV from Canvas assignments and session data
 */
export async function generateTrainingCsv(assignments, sessionSummaries = [], options = {}) {
  const {
    anonymize = true,
    outputPath = path.join(__dirname, '../../../data/training.csv'),
  } = options;

  const rows = [];
  const headers = [
    'user_id_hash',
    'assignment_id',
    'course_id',
    'course_name',
    'assignment_name',
    'days_until_due',
    'points_possible',
    'submission_types_count',
    'num_sessions',
    'num_messages',
    'avg_messages_per_session',
    'used_step_mode',
    'num_concepts',
    'num_context_items',
    'session_duration_hours',
    'session_span_days',
    'early_start_days',
    'message_length_avg',
    'question_ratio',
    'engagement_score',
    'is_completed',
    'submission_status',
    'submission_score',
    'submission_grade',
    'grade_bucket',
  ];

  for (const assignment of assignments) {
    const daysUntilDue = calculateDaysUntilDue(assignment.due_at);
    const sessionFeatures = computeSessionFeatures(sessionSummaries, assignment.id.toString());
    
    // Compute early_start_days if we have session data
    if (sessionFeatures.num_sessions > 0 && daysUntilDue < 999) {
      // Assuming first session was created at assignment start
      // This is approximate - would need actual first session timestamp
      sessionFeatures.early_start_days = Math.max(0, daysUntilDue + sessionFeatures.session_span_days);
    }

    // Compute grade bucket
    let gradeBucket = 'Unknown';
    if (assignment.submission_score !== null && assignment.submission_score !== undefined && assignment.points_possible > 0) {
      const gradePct = assignment.submission_score / assignment.points_possible;
      if (gradePct >= 0.9) gradeBucket = 'A';
      else if (gradePct >= 0.8) gradeBucket = 'B';
      else if (gradePct >= 0.7) gradeBucket = 'C';
      else if (gradePct >= 0.6) gradeBucket = 'D';
      else gradeBucket = 'F';
    }

    const userId = anonymize ? hashUserId(assignment.user_id || 'anonymous') : (assignment.user_id || 'anonymous');
    
    const row = {
      user_id_hash: userId,
      assignment_id: assignment.id,
      course_id: assignment.course_id,
      course_name: (assignment.course_name || '').replace(/,/g, ';'), // Escape commas
      assignment_name: (assignment.name || '').replace(/,/g, ';'),
      days_until_due: daysUntilDue,
      points_possible: assignment.points_possible || 0,
      submission_types_count: Array.isArray(assignment.submission_types) ? assignment.submission_types.length : 0,
      ...sessionFeatures,
      is_completed: assignment.is_completed ? 1 : 0,
      submission_status: assignment.submission_status || 'unsubmitted',
      submission_score: assignment.submission_score !== null ? assignment.submission_score : '',
      submission_grade: assignment.submission_grade || '',
      grade_bucket: gradeBucket,
    };

    rows.push(row);
  }

  // Convert to CSV
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    });
    csvLines.push(values.join(','));
  }

  const csvContent = csvLines.join('\n');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  return {
    success: true,
    rowCount: rows.length,
    filePath: outputPath,
    features: headers.length - 1, // Exclude user_id_hash
  };
}

