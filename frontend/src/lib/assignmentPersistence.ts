/**
 * Assignment Persistence Service
 * Handles saving and loading assignment state to/from localStorage
 */

import type {
  Assignment,
  AssignmentAnalysis,
  AssignmentJourney,
  JourneyStep,
} from "@/domain/assignment";

// Storage keys - now per-assignment
const getStorageKeys = (assignmentId: string) => ({
  ASSIGNMENT: `astar_assignment_${assignmentId}`,
  ANALYSIS: `astar_analysis_${assignmentId}`,
  JOURNEY: `astar_journey_${assignmentId}`,
  CURRENT_STEP_INDEX: `astar_step_index_${assignmentId}`,
  STEP_NOTES: `astar_notes_${assignmentId}`,
  STEP_SUBTASKS: `astar_subtasks_${assignmentId}`,
  CHAT_HISTORY: `astar_chat_${assignmentId}`,
  LAST_UPDATED: `astar_updated_${assignmentId}`,
});

const ACTIVE_ASSIGNMENT_KEY = "astar_active_assignment_id";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface PersistedState {
  assignment: Assignment | null;
  analysis: AssignmentAnalysis | null;
  journey: AssignmentJourney | null;
  currentStepIndex: number;
  stepNotes: Record<string, string>;
  stepSubtasks: Record<string, Subtask[]>;
  chatHistory: Message[];
  lastUpdated: number;
}

/**
 * Save the current assignment state (per-assignment)
 */
export function saveAssignmentState(state: Partial<PersistedState>): void {
  try {
    if (!state.assignment?.id) return;
    
    const assignmentId = state.assignment.id;
    const keys = getStorageKeys(assignmentId);
    const timestamp = Date.now();

    if (state.assignment) {
      localStorage.setItem(keys.ASSIGNMENT, JSON.stringify(state.assignment));
      // Track this as the active assignment
      localStorage.setItem(ACTIVE_ASSIGNMENT_KEY, assignmentId);
    }

    if (state.analysis) {
      localStorage.setItem(keys.ANALYSIS, JSON.stringify(state.analysis));
    }

    if (state.journey) {
      localStorage.setItem(keys.JOURNEY, JSON.stringify(state.journey));
    }

    if (state.currentStepIndex !== undefined) {
      localStorage.setItem(keys.CURRENT_STEP_INDEX, state.currentStepIndex.toString());
    }

    if (state.stepNotes) {
      localStorage.setItem(keys.STEP_NOTES, JSON.stringify(state.stepNotes));
    }

    if (state.stepSubtasks) {
      localStorage.setItem(keys.STEP_SUBTASKS, JSON.stringify(state.stepSubtasks));
    }

    if (state.chatHistory) {
      localStorage.setItem(keys.CHAT_HISTORY, JSON.stringify(state.chatHistory));
    }

    localStorage.setItem(keys.LAST_UPDATED, timestamp.toString());
  } catch (error) {
    console.error("Failed to save assignment state:", error);
  }
}

/**
 * Load the persisted assignment state for a specific assignment or the active one
 */
export function loadAssignmentState(assignmentId?: string): PersistedState | null {
  try {
    // Use provided ID or get the active assignment
    const idToLoad = assignmentId || localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
    if (!idToLoad) return null;

    const keys = getStorageKeys(idToLoad);
    
    const assignment = localStorage.getItem(keys.ASSIGNMENT);
    if (!assignment) return null;

    const analysis = localStorage.getItem(keys.ANALYSIS);
    const journey = localStorage.getItem(keys.JOURNEY);
    const stepIndex = localStorage.getItem(keys.CURRENT_STEP_INDEX);
    const stepNotes = localStorage.getItem(keys.STEP_NOTES);
    const stepSubtasks = localStorage.getItem(keys.STEP_SUBTASKS);
    const chatHistory = localStorage.getItem(keys.CHAT_HISTORY);
    const lastUpdated = localStorage.getItem(keys.LAST_UPDATED);

    return {
      assignment: assignment ? JSON.parse(assignment) : null,
      analysis: analysis ? JSON.parse(analysis) : null,
      journey: journey ? JSON.parse(journey) : null,
      currentStepIndex: stepIndex ? parseInt(stepIndex) : 0,
      stepNotes: stepNotes ? JSON.parse(stepNotes) : {},
      stepSubtasks: stepSubtasks ? JSON.parse(stepSubtasks) : {},
      chatHistory: chatHistory ? JSON.parse(chatHistory) : [],
      lastUpdated: lastUpdated ? parseInt(lastUpdated) : Date.now(),
    };
  } catch (error) {
    console.error("Failed to load assignment state:", error);
    return null;
  }
}

/**
 * Clear a specific assignment's state (or active if not specified)
 */
export function clearAssignmentState(assignmentId?: string): void {
  try {
    const idToClear = assignmentId || localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
    if (!idToClear) return;

    const keys = getStorageKeys(idToClear);
    Object.values(keys).forEach((key) => {
      localStorage.removeItem(key);
    });

    // If clearing the active assignment, remove the active marker
    if (!assignmentId || idToClear === localStorage.getItem(ACTIVE_ASSIGNMENT_KEY)) {
      localStorage.removeItem(ACTIVE_ASSIGNMENT_KEY);
    }
  } catch (error) {
    console.error("Failed to clear assignment state:", error);
  }
}

/**
 * Check if a specific assignment has saved state
 */
export function hasSavedAssignment(assignmentId?: string): boolean {
  const idToCheck = assignmentId || localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
  if (!idToCheck) return false;
  
  const keys = getStorageKeys(idToCheck);
  return localStorage.getItem(keys.ASSIGNMENT) !== null;
}

/**
 * Get assignment info for display (active or specific assignment)
 */
export function getSavedAssignmentInfo(assignmentId?: string): {
  title: string;
  lastUpdated: Date;
  progress: number;
} | null {
  try {
    const idToGet = assignmentId || localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
    if (!idToGet) return null;

    const keys = getStorageKeys(idToGet);
    const assignment = localStorage.getItem(keys.ASSIGNMENT);
    const journey = localStorage.getItem(keys.JOURNEY);
    const stepIndex = localStorage.getItem(keys.CURRENT_STEP_INDEX);
    const lastUpdated = localStorage.getItem(keys.LAST_UPDATED);

    if (!assignment || !journey) return null;

    const assignmentData: Assignment = JSON.parse(assignment);
    const journeyData: AssignmentJourney = JSON.parse(journey);
    const currentStep = stepIndex ? parseInt(stepIndex) : 0;

    return {
      title: assignmentData.title,
      lastUpdated: new Date(lastUpdated ? parseInt(lastUpdated) : Date.now()),
      progress: Math.round((currentStep / journeyData.steps.length) * 100),
    };
  } catch (error) {
    console.error("Failed to get saved assignment info:", error);
    return null;
  }
}

/**
 * Update a specific step's notes (for current active assignment)
 */
export function saveStepNotes(stepId: string, notes: string): void {
  try {
    const activeId = localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
    if (!activeId) return;
    
    const state = loadAssignmentState(activeId);
    if (state) {
      state.stepNotes[stepId] = notes;
      saveAssignmentState(state);
    }
  } catch (error) {
    console.error("Failed to save step notes:", error);
  }
}

/**
 * Update a specific step's subtasks (for current active assignment)
 */
export function saveStepSubtasks(stepId: string, subtasks: Subtask[]): void {
  try {
    const activeId = localStorage.getItem(ACTIVE_ASSIGNMENT_KEY);
    if (!activeId) return;
    
    const state = loadAssignmentState(activeId);
    if (state) {
      state.stepSubtasks[stepId] = subtasks;
      saveAssignmentState(state);
    }
  } catch (error) {
    console.error("Failed to save step subtasks:", error);
  }
}

