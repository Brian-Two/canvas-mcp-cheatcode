/**
 * ASTAR Workbench - Integrated Assignment Completion Assistant
 * Phase 1: Sleek dark UI with step-by-step journey
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Menu, X, Upload, Plus, Trash2, CheckCircle2, ArrowUp, Star, File, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import FormattedMessage from "@/components/FormattedMessage";
import WorkflowSelector from "@/components/WorkflowSelector";
import { sendChatMessage, getAssignments, analyzeAssignment, reviewAssignment, type ReviewRequest, type ReviewResponse } from "@/lib/api";
import { 
  Workflow,
  initializeDefaultWorkflows,
  incrementWorkflowUsage,
} from "@/lib/workflowManager";
import {
  saveAssignmentState,
  loadAssignmentState,
  clearAssignmentState,
  hasSavedAssignment,
  getSavedAssignmentInfo,
  saveStepNotes,
  saveStepSubtasks,
  type Subtask,
} from "@/lib/assignmentPersistence";
import type {
  Assignment,
  AssignmentAnalysis,
  AssignmentJourney,
  JourneyStep,
} from "@/domain/assignment";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ContextItem {
  id: string;
  type: 'pdf' | 'text' | 'link';
  name: string;
  content: string;
  addedAt: Date;
}

const Astar = () => {
  const location = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assignment from navigation state
  const passedAssignment = (location.state as { assignment?: any })?.assignment;
  
  // Convert to Phase 1 Assignment type
  const [assignment, setAssignment] = useState<Assignment | null>(
    passedAssignment
      ? {
          id: passedAssignment.id,
          title: passedAssignment.title,
          rawDescription: passedAssignment.description || passedAssignment.rawDescription || "",
          courseName: passedAssignment.course || passedAssignment.courseName,
          dueDate: passedAssignment.dueDate,
          points: passedAssignment.points,
          source: "canvas" as const,
        }
      : null
  );

  // Phase 1 State
  const [analysis, setAnalysis] = useState<AssignmentAnalysis | null>(null);
  const [journey, setJourney] = useState<AssignmentJourney | null>(null);
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBreakdownAnimation, setShowBreakdownAnimation] = useState(false);
  const [showExpandedSteps, setShowExpandedSteps] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: assignment 
        ? `Hi! I'm ASTAR. I see you're working on "${assignment.title}". Let me analyze this assignment and create your step-by-step journey!`
        : "Hi! I'm ASTAR. I'm here to help you complete your assignments step by step. Select an assignment from your board to get started!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  // Context state
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [newContextType, setNewContextType] = useState<'pdf' | 'text' | 'link'>('text');
  const [newContextText, setNewContextText] = useState('');
  const [newContextUrl, setNewContextUrl] = useState('');

  // Assignment selection state
  const [canvasAssignments, setCanvasAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');
  const [manualPoints, setManualPoints] = useState('');

  // Phase 2A: Persistence state
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [stepSubtasks, setStepSubtasks] = useState<Record<string, Subtask[]>>({});
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // AI Review state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; content: string; name: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState<ReviewResponse | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showReviewSection, setShowReviewSection] = useState(false);

  // Initialize workflows
  useEffect(() => {
    initializeDefaultWorkflows();
  }, []);

  // Note: We no longer show a resume prompt - users can see progress directly on assignment cards

  // Save state whenever it changes
  useEffect(() => {
    if (assignment && analysis && journey) {
      // Update journey with current step statuses before saving
      const updatedJourney = {
        ...journey,
        steps: steps
      };
      
      saveAssignmentState({
        assignment,
        analysis,
        journey: updatedJourney,
          currentStepIndex,
        stepNotes,
        stepSubtasks,
        chatHistory: messages,
      });
    }
  }, [assignment, analysis, journey, currentStepIndex, stepNotes, stepSubtasks, messages, steps]);

  // Fetch Canvas assignments if no assignment selected
  useEffect(() => {
    if (!assignment) {
      fetchCanvasAssignments();
    }
  }, [assignment]);

  const fetchCanvasAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const assignments = await getAssignments(false); // Don't include past assignments
      setCanvasAssignments(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Failed to Load Assignments',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSelectCanvasAssignment = (canvasAssignment: any) => {
    const formattedAssignment: Assignment = {
      id: canvasAssignment.id.toString(),
      title: canvasAssignment.title,
      rawDescription: canvasAssignment.description || '',
      courseName: canvasAssignment.course || '',
      dueDate: canvasAssignment.dueDate || '',
      points: canvasAssignment.points || 0,
      source: 'canvas',
    };
    
    // Check if this specific assignment has saved progress
    const savedState = loadAssignmentState(canvasAssignment.id.toString());
    const hasProgress = !!savedState;
    
    if (hasProgress) {
      // Resume existing assignment directly without animation
      setAssignment(savedState.assignment);
      setAnalysis(savedState.analysis);
      setJourney(savedState.journey);
      
      // Load steps and mark previous steps as completed
      const loadedSteps = savedState.journey?.steps || [];
      const updatedSteps = loadedSteps.map((step, idx) => ({
        ...step,
        status: idx < savedState.currentStepIndex 
          ? 'completed' as const
          : idx === savedState.currentStepIndex 
            ? 'in_progress' as const 
            : step.status
      }));
      setSteps(updatedSteps);
      
      setCurrentStepIndex(savedState.currentStepIndex);
      setStepNotes(savedState.stepNotes);
      setStepSubtasks(savedState.stepSubtasks);
      setMessages(savedState.chatHistory.length > 0 ? savedState.chatHistory : messages);
      
      toast({
        title: 'Assignment Resumed',
        description: `Continuing from step ${savedState.currentStepIndex + 1}.`,
      });
    } else {
      // New assignment - will trigger analysis and animation
      setAssignment(formattedAssignment);
    }
  };

  const handleManualSubmit = () => {
    if (!manualTitle.trim() || !manualDescription.trim()) {
        toast({
        title: 'Missing Information',
        description: 'Please provide at least a title and description',
        variant: 'destructive',
      });
      return;
    }

    const formattedAssignment: Assignment = {
      id: `manual_${Date.now()}`,
      title: manualTitle,
      rawDescription: manualDescription,
      dueDate: manualDueDate || undefined,
      points: manualPoints ? parseInt(manualPoints) : undefined,
      source: 'manual',
    };
    setAssignment(formattedAssignment);
  };


  // Auto-analyze assignment on load (only for new assignments)
  useEffect(() => {
    if (assignment && !analysis && !journey) {
      handleAnalyzeAssignment();
    }
  }, [assignment, analysis, journey]);

  // Update steps when journey changes
  useEffect(() => {
    if (journey) {
      setSteps(journey.steps);
    }
  }, [journey]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAnalyzeAssignment = async () => {
    if (!assignment) return;

    setIsAnalyzing(true);
    setShowBreakdownAnimation(true);
    addMessage("assistant", "Analyzing your assignment...");

    try {
      const result = await analyzeAssignment(assignment);
      setAnalysis(result.analysis);
      setJourney(result.journey);
      setSteps(result.journey.steps);

      addMessage(
        "assistant",
        `Great! I've analyzed "${assignment.title}" and created a ${result.journey.steps.length}-step journey for you. Let's start with Step 1: "${result.journey.steps[0].title}".`
      );

      // Show breakdown animation for 3 seconds, then show horizontal timeline
      setTimeout(() => {
        setShowBreakdownAnimation(false);
        setShowExpandedSteps(true); // Show horizontal timeline first
      }, 3500);
    } catch (error) {
      console.error("Failed to analyze assignment:", error);
      addMessage(
        "assistant",
        "I encountered an error analyzing the assignment. You can still ask me questions!"
      );
        toast({
        title: "Analysis Failed",
        description: "Could not analyze the assignment.",
        variant: "destructive",
      });
      setShowBreakdownAnimation(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    addMessage("user", userMessage);
    setIsTyping(true);

    try {
      // Build comprehensive context for AI
      let contextMessage = "";

      // Assignment context
      if (assignment) {
        contextMessage += `\n\n## Assignment Context\n`;
        contextMessage += `Title: ${assignment.title}\n`;
        if (assignment.courseName) contextMessage += `Course: ${assignment.courseName}\n`;
        if (assignment.dueDate) contextMessage += `Due: ${new Date(assignment.dueDate).toLocaleDateString()}\n`;
      }

      // Analysis context
      if (analysis) {
        contextMessage += `\n## Assignment Details\n`;
        contextMessage += `Type: ${analysis.type}\n`;
        contextMessage += `Estimated Time: ${analysis.estimatedTimeHours} hours\n`;
        contextMessage += `Required Skills: ${analysis.requiredSkills.join(', ')}\n`;
        contextMessage += `Success Criteria:\n${analysis.successCriteria.map(c => `- ${c}`).join('\n')}\n`;
        contextMessage += `Deliverables:\n${analysis.deliverables.map(d => `- ${d.label}${d.required ? ' (Required)' : ''}`).join('\n')}\n`;
      }

      // Current step context
      const currentStep = steps[currentStepIndex];
      if (currentStep) {
        contextMessage += `\n## Current Step (${currentStepIndex + 1}/${steps.length})\n`;
        contextMessage += `Title: ${currentStep.title}\n`;
        contextMessage += `Description: ${currentStep.description}\n`;
        contextMessage += `Estimated Time: ${currentStep.estimatedMinutes} minutes\n`;
        contextMessage += `Status: ${currentStep.status}\n`;
        
        // Include step notes if available
        const notes = stepNotes[currentStep.id];
        if (notes && notes.trim()) {
          contextMessage += `\nStudent's Notes:\n${notes}\n`;
        }

        // Include subtasks if available
        const subtasks = stepSubtasks[currentStep.id];
        if (subtasks && subtasks.length > 0) {
          contextMessage += `\nSubtasks:\n${subtasks.map(t => `${t.completed ? '✓' : '○'} ${t.text}`).join('\n')}\n`;
        }
      }

      // User-added context items
      if (contextItems.length > 0) {
        contextMessage += `\n## Additional Context\n`;
        contextMessage += contextItems.map(item => `- ${item.name}: ${item.content.substring(0, 200)}...`).join('\n');
      }

      // System instruction
      const systemInstruction = `You are ASTAR, a helpful AI assistant for completing assignments. ${contextMessage}

Help the student with their current step. Be specific, encouraging, and actionable. Reference the assignment context when relevant.`;

      const response = await sendChatMessage({
        message: `${systemInstruction}\n\nStudent: ${userMessage}`,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        assignmentContext: assignment || undefined
      });

      addMessage("assistant", response.response);
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage("assistant", "I encountered an error. Please try again.");
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const updateStepStatus = (stepId: string, newStatus: "not_started" | "in_progress" | "completed") => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId ? { ...step, status: newStatus } : step
      )
    );

    // If marking as completed, advance to next step
    if (newStatus === "completed") {
      const currentIdx = steps.findIndex(step => step.id === stepId);
      if (currentIdx !== -1 && currentIdx < steps.length - 1) {
        setCurrentStepIndex(currentIdx + 1);
              toast({
          title: "Step Completed! 🎉",
          description: `Moving to step ${currentIdx + 2}`,
              });
      } else if (currentIdx === steps.length - 1) {
              toast({
          title: "Assignment Complete! 🎉",
          description: "You've finished all steps!",
              });
            }
          }
  };

  // Step notes handlers
  const handleNoteChange = (stepId: string, note: string) => {
    setStepNotes(prev => ({
      ...prev,
      [stepId]: note
    }));
    saveStepNotes(stepId, note);
  };

  // Subtask handlers
  const addSubtask = (stepId: string, text: string) => {
    const newSubtask: Subtask = {
      id: `subtask_${Date.now()}`,
      text,
      completed: false
    };
    setStepSubtasks(prev => ({
      ...prev,
      [stepId]: [...(prev[stepId] || []), newSubtask]
    }));
    saveStepSubtasks(stepId, [...(stepSubtasks[stepId] || []), newSubtask]);
  };

  const toggleSubtask = (stepId: string, subtaskId: string) => {
    const updated = (stepSubtasks[stepId] || []).map(t =>
      t.id === subtaskId ? { ...t, completed: !t.completed } : t
    );
    setStepSubtasks(prev => ({
      ...prev,
      [stepId]: updated
    }));
    saveStepSubtasks(stepId, updated);
  };

  const deleteSubtask = (stepId: string, subtaskId: string) => {
    const updated = (stepSubtasks[stepId] || []).filter(t => t.id !== subtaskId);
    setStepSubtasks(prev => ({
      ...prev,
      [stepId]: updated
    }));
    saveStepSubtasks(stepId, updated);
  };

  const handleSelectWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    incrementWorkflowUsage(workflow.id);
    setShowWorkflowSelector(false);

      toast({
      title: "Workflow Activated",
      description: `Using "${workflow.name}" workflow`,
    });

    addMessage("assistant", `I've activated the "${workflow.name}" workflow to help guide you through this assignment.`);
  };

  // File upload handlers
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      
      // Read as text for text files, base64 for others
      if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newFiles = await Promise.all(
      fileArray.map(async (file) => {
        try {
          const content = await readFileContent(file);
          return { file, content, name: file.name };
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
          toast({
            title: "File Read Error",
            description: `Failed to read ${file.name}`,
            variant: "destructive",
          });
          return null;
        }
      })
    );

    const validFiles = newFiles.filter((f): f is { file: File; content: string; name: string } => f !== null);
    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // AI Review handlers
  const handleSubmitReview = async () => {
    if (!assignment || !analysis || !journey) {
      toast({
        title: "Error",
        description: "Missing assignment data for review",
        variant: "destructive",
      });
      return;
    }

    setIsReviewing(true);
    try {
      // Combine all uploaded file contents
      const finalWork = uploadedFiles
        .map((f) => `=== ${f.name} ===\n${f.content}`)
        .join('\n\n');

      const reviewRequest: ReviewRequest = {
        assignment,
        analysis,
        journey,
        stepNotes,
        stepSubtasks,
        chatHistory: messages,
        finalWork: finalWork || undefined,
        additionalContext: additionalContext || '',
      };

      const review = await reviewAssignment(reviewRequest);
      setReviewFeedback(review);
      setIsReviewing(false);
    } catch (error) {
      console.error("Error reviewing assignment:", error);
      toast({
        title: "Review Error",
        description: error instanceof Error ? error.message : "Failed to review assignment",
        variant: "destructive",
      });
      setIsReviewing(false);
    }
  };

  const handleAddTextContext = () => {
    if (!newContextText.trim()) return;

    const newItem: ContextItem = {
      id: Date.now().toString(),
      type: 'text',
      name: `Note ${contextItems.length + 1}`,
      content: newContextText,
      addedAt: new Date(),
    };

    setContextItems([...contextItems, newItem]);
    setNewContextText('');
    setShowContextDialog(false);
    
    toast({
      title: "Context Added",
      description: "Text note added successfully",
    });
  };

  const handleAddLinkContext = () => {
    if (!newContextUrl.trim()) return;

    const newItem: ContextItem = {
      id: Date.now().toString(),
      type: 'link',
      name: newContextUrl,
      content: newContextUrl,
      addedAt: new Date(),
    };

    setContextItems([...contextItems, newItem]);
    setNewContextUrl('');
    setShowContextDialog(false);
    
    toast({
      title: "Context Added",
      description: "Link added successfully",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const newItem: ContextItem = {
        id: Date.now().toString(),
        type: 'pdf',
        name: file.name,
        content: text,
        addedAt: new Date(),
      };

      setContextItems([...contextItems, newItem]);
      setShowContextDialog(false);
      
      toast({
        title: "File Added",
        description: `${file.name} added to context`,
      });
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveContext = (id: string) => {
    setContextItems(contextItems.filter(item => item.id !== id));
  };

  const currentStep = steps[currentStepIndex];
  const completedSteps = steps.filter((s) => s.status === "completed").length;

  const handleProgressBarHover = () => {
    setIsHoveringProgressBar(true);
    const timeout = setTimeout(() => {
      setShowExpandedSteps(true);
      setIsHoveringProgressBar(false);
    }, 1000); // 1 second hover
    setHoverTimeout(timeout);
  };

  const handleProgressBarLeave = () => {
    setIsHoveringProgressBar(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  // Don't show separate resume prompt - integrate into assignment list

  // Show assignment selection screen if no assignment
  if (!assignment) {
  return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
                </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome to ASTAR
            </h1>
            <p className="text-muted-foreground">
              Select an assignment or enter one manually to get started
            </p>
                </div>
                </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Canvas Assignments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Canvas Assignments</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchCanvasAssignments}
                    disabled={loadingAssignments}
                  >
                    {loadingAssignments ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>

                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading assignments...</p>
              </div>
            </div>
                ) : canvasAssignments.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {canvasAssignments.map((assignment) => {
                      // Check if this specific assignment has progress
                      const savedState = loadAssignmentState(assignment.id.toString());
                      const hasProgress = !!savedState;
                      const progressPercent = hasProgress && savedState?.journey?.steps
                        ? Math.round((savedState.currentStepIndex / savedState.journey.steps.length) * 100)
                        : 0;

                      return (
                        <button
                          key={assignment.id}
                          onClick={() => handleSelectCanvasAssignment(assignment)}
                          className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary transition-all text-left relative"
                        >
                          {hasProgress && (
                            <div className="absolute top-2 right-2">
                              <div className="px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full border border-primary/30">
                                {progressPercent}% complete
                              </div>
                            </div>
                          )}
                          <h3 className="font-semibold text-foreground mb-1 pr-24">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{assignment.course}</span>
                            <span>•</span>
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                            {assignment.points && (
                              <>
                                <span>•</span>
                                <span>{assignment.points} pts</span>
                              </>
                            )}
                          </div>
                          {hasProgress && (
                            <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground mb-2">No assignments found</p>
              <p className="text-sm text-muted-foreground">
                      Make sure you've connected Canvas in{' '}
                      <a href="/connections" className="text-primary hover:underline">
                        Connections
                      </a>
                    </p>
          </div>
        )}
          </div>

              {/* Manual Input */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Manual Input</h2>
                
                <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Assignment Title *
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g., Lab #5 - Data Structures"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:border-primary text-foreground"
                    />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description *
                    </label>
                  <Textarea
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      placeholder="Paste the assignment description here..."
                      className="min-h-[120px] bg-background border-border"
                    />
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Due Date
                      </label>
                  <input
                        type="date"
                        value={manualDueDate}
                        onChange={(e) => setManualDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:border-primary text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={manualPoints}
                        onChange={(e) => setManualPoints(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:border-primary text-foreground"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleManualSubmit}
                    className="w-full bg-gradient-primary text-white shadow-glow"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start with ASTAR
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Breakdown Animation Screen
  if (showBreakdownAnimation && steps.length > 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background overflow-hidden">
        <div className="max-w-4xl w-full p-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Breaking Down Your Assignment
            </h1>
            <p className="text-muted-foreground">
              Creating your personalized step-by-step journey...
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="p-6 bg-card border border-border rounded-lg opacity-0 animate-fadeInUp"
                style={{ animationDelay: `${idx * 0.3}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                    <span className="text-white font-bold text-lg">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                    <p className="text-sm text-primary mt-2">
                      Estimated: {step.estimatedMinutes} minutes
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeInUp {
            animation: fadeInUp 0.5s ease-out;
          }
          @keyframes fillUp {
            0% {
              height: 0%;
              opacity: 0.5;
            }
            100% {
              height: 100%;
              opacity: 1;
            }
          }
          .animate-fillUp {
            animation: fillUp 1s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // Expanded Steps View (hover on progress bar)
  if (showExpandedSteps && steps.length > 0) {
    const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

  return (
      <div className="h-screen flex flex-col bg-background/95 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center py-8 px-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {assignment?.title || "Your Journey"}
          </h2>
          <p className="text-muted-foreground">
            Estimated time: {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMinutes}min
          </p>
        </div>

        {/* Horizontal Timeline - Scrollable */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-16 pb-8">
          <div className="relative inline-flex min-w-max" style={{ height: '600px' }}>
            {/* Horizontal timeline line - positioned at vertical center */}
            <div className="absolute left-0 right-0 h-1 bg-border" style={{ top: '50%', transform: 'translateY(-50%)' }} />

            {steps.map((step, idx) => {
              const isTop = idx % 2 === 0;
  return (
                <div key={step.id} className="relative" style={{ width: '400px' }}>
                  {/* Timeline dot - at center */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-background transition-all ${
                        step.status === "completed"
                          ? "bg-primary shadow-glow"
                          : currentStepIndex === idx
                          ? "bg-primary shadow-glow scale-110"
                          : "bg-muted"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-white">{idx + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Card + Connector - positioned above or below */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center ${
                      isTop ? 'bottom-[55%]' : 'top-[55%]'
                    }`}
                  >
                    {isTop ? (
                      <>
                        {/* Card on top */}
                        <button
                          onClick={() => {
                            setCurrentStepIndex(idx);
                            setShowExpandedSteps(false);
                          }}
                          className={`group w-80 p-6 rounded-xl border-2 transition-all text-left ${
                            step.status === "completed"
                              ? "bg-primary/10 border-primary hover:shadow-xl hover:scale-105"
                              : currentStepIndex === idx
                              ? "bg-card border-primary shadow-2xl scale-105"
                              : "bg-card border-border hover:border-primary hover:shadow-xl hover:scale-105"
                          }`}
                        >
              <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                {step.title}
                              </h3>
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                                {step.estimatedMinutes} min
                              </span>
                </div>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {step.description}
                            </p>
                            {step.resources && step.resources.length > 0 && (
                              <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                  {step.resources.length} resource{step.resources.length > 1 ? 's' : ''} available
                  </p>
                </div>
                            )}
              </div>
                        </button>
                        {/* Connector line below card */}
                        <div className="w-0.5 h-12 bg-border" />
          </>
        ) : (
                      <>
                        {/* Connector line above card */}
                        <div className="w-0.5 h-12 bg-border" />
                        {/* Card on bottom */}
                        <button
                          onClick={() => {
                            setCurrentStepIndex(idx);
                            setShowExpandedSteps(false);
                          }}
                          className={`group w-80 p-6 rounded-xl border-2 transition-all text-left ${
                            step.status === "completed"
                              ? "bg-primary/10 border-primary hover:shadow-xl hover:scale-105"
                              : currentStepIndex === idx
                              ? "bg-card border-primary shadow-2xl scale-105"
                              : "bg-card border-border hover:border-primary hover:shadow-xl hover:scale-105"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                {step.title}
                              </h3>
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                                {step.estimatedMinutes} min
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {step.description}
                            </p>
                            {step.resources && step.resources.length > 0 && (
                              <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                  {step.resources.length} resource{step.resources.length > 1 ? 's' : ''} available
              </p>
            </div>
                            )}
          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
            <Button
            onClick={() => setShowExpandedSteps(false)}
            variant="outline"
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Close Journey View
            </Button>
          </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* TOP PROGRESS METER */}
      {steps.length > 0 && (
        <div 
          className="border-b border-border bg-card px-6 py-4 relative overflow-hidden"
          onMouseEnter={handleProgressBarHover}
          onMouseLeave={handleProgressBarLeave}
        >
          {/* Loading animation on hover - fills from bottom to top */}
          {isHoveringProgressBar && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 bg-primary/10 animate-fillUp" />
            </div>
          )}
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Bubble */}
                  <button
                    onClick={() => setCurrentStepIndex(idx)}
                    className="relative group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        step.status === "completed"
                          ? "bg-primary text-white"
                          : step.status === "in_progress"
                          ? "bg-primary text-white"
                          : currentStepIndex === idx
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{idx + 1}</span>
                      )}
              </div>
                  </button>
                  
                  {/* Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-1">
                      <div
                        className={`h-full transition-all ${
                          step.status === "completed" ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Final Star - no circle */}
              <button
                onClick={() => {
                  if (completedSteps === steps.length) {
                    setShowReviewSection(true);
                  }
                }}
                className={`transition-all ${
                  completedSteps === steps.length 
                    ? "cursor-pointer hover:scale-110" 
                    : "cursor-default"
                }`}
                disabled={completedSteps !== steps.length}
              >
                <Star
                  className={`w-8 h-8 transition-all ${
                    completedSteps === steps.length
                      ? "fill-white text-white drop-shadow-glow"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
                      </div>
                    </div>
                </div>
              )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR - OVERLAY */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar Panel */}
            <aside className="absolute left-4 top-4 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-lg">Assignment Overview</h2>
                  <Button
                    size="sm"
                      variant="ghost"
                  onClick={() => setSidebarOpen(false)}
              className="h-7 w-7 p-0"
                  >
                  <X className="w-4 h-4" />
                  </Button>
                </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Assignment Info */}
                {assignment && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Assignment</h3>
                    <p className="font-medium text-foreground">{assignment.title}</p>
                    {assignment.courseName && (
                      <p className="text-sm text-muted-foreground">{assignment.courseName}</p>
                    )}
                    {assignment.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    {assignment.points && (
                      <p className="text-sm text-muted-foreground">{assignment.points} points</p>
                    )}
                    {assignment.rawDescription && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">Description</h4>
                        <p className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: assignment.rawDescription }} />
                </div>
              )}
            </div>
          )}

                {/* Analysis Summary */}
                {analysis && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="font-semibold text-sm text-muted-foreground">Analysis</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium capitalize text-foreground">
                          {analysis.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Time:</span>
                        <span className="font-medium text-foreground">{analysis.estimatedTimeHours}h</span>
                    </div>
                <div>
                        <span className="text-muted-foreground block mb-2">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.requiredSkills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>
                <div>
                        <span className="text-muted-foreground block mb-2">Deliverables:</span>
                        <ul className="text-xs space-y-1">
                          {analysis.deliverables.map((deliverable, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              {deliverable.label}
                            </li>
                          ))}
                        </ul>
          </div>
        </div>
                </div>
              )}
        </div>
      </aside>
          </>
        )}

        {/* Toggle Sidebar - Three Bars Icon */}
        {!sidebarOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 hover:bg-muted"
                    >
              <Menu className="w-5 h-5" />
                    </Button>
        )}

        {/* CENTER - Current Step */}
        <main className={`flex-1 flex flex-col overflow-hidden bg-background transition-all ${chatOpen ? 'mr-96' : ''}`}>
          <div className="flex-1 overflow-y-auto p-8">
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing assignment...</p>
                  </div>
                </div>
            ) : currentStep ? (
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Step Title & Description - No Boxes */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-foreground mb-2">
                        {currentStep.title}
                      </h2>
                      <p className="text-muted-foreground">
                        Estimated time: {currentStep.estimatedMinutes} minutes
                        </p>
                      </div>
                    <div className="flex gap-2">
                      {currentStep.status === "not_started" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                    <Button
                                onClick={() => updateStepStatus(currentStep.id, "in_progress")}
            size="icon"
                                className="bg-gradient-primary text-white shadow-glow"
                              >
                                <Sparkles className="w-4 h-4" />
                    </Button>
                            </TooltipTrigger>
                            <TooltipContent>Start Step</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
            )}
          </div>
        </div>

                  <div className="space-y-4 mt-6">
                    <p className="text-lg text-foreground leading-relaxed">
                      {currentStep.description}
                    </p>

                    {currentStep.resources && currentStep.resources.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-foreground mb-3">Resources:</h3>
                        <ul className="space-y-2">
                          {currentStep.resources.map((resource, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              • {resource}
                            </li>
                          ))}
                        </ul>
            </div>
          )}
        </div>

                  {/* Step Notes */}
                  <div className="mt-8 border-t border-border pt-6">
                    <h3 className="font-semibold text-foreground mb-3">📝 Your Notes</h3>
          <Textarea
                      placeholder="Take notes about this step, your progress, questions, etc..."
                      value={stepNotes[currentStep.id] || ''}
                      onChange={(e) => handleNoteChange(currentStep.id, e.target.value)}
                      className="min-h-[120px] bg-background/50 border-border"
          />
        </div>

                  {/* Subtasks */}
                  <div className="mt-6 border-t border-border pt-6">
                    <h3 className="font-semibold text-foreground mb-3">✓ Subtasks</h3>
                    
                    {/* Subtask List */}
                    {stepSubtasks[currentStep.id] && stepSubtasks[currentStep.id].length > 0 && (
                      <div className="space-y-2 mb-4">
                        {stepSubtasks[currentStep.id].map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-3 p-3 bg-background/30 rounded-lg border border-border"
                          >
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={() => toggleSubtask(currentStep.id, subtask.id)}
                              className="w-5 h-5 rounded border-2 border-primary text-primary focus:ring-primary cursor-pointer"
                            />
                            <span
                              className={`flex-1 ${
                                subtask.completed
                                  ? 'text-muted-foreground line-through'
                                  : 'text-foreground'
                              }`}
                            >
                              {subtask.text}
                            </span>
          <Button
            size="icon"
                              variant="ghost"
                              onClick={() => deleteSubtask(currentStep.id, subtask.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
          </Button>
            </div>
                        ))}
          </div>
                    )}

                    {/* Add Subtask */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a subtask..."
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newSubtaskText.trim()) {
                            addSubtask(currentStep.id, newSubtaskText);
                            setNewSubtaskText('');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
                        onClick={() => {
                          if (newSubtaskText.trim()) {
                            addSubtask(currentStep.id, newSubtaskText);
                            setNewSubtaskText('');
                          }
                        }}
                        size="icon"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4" />
            </Button>
                    </div>
                  </div>

                  {/* Complete Button at Bottom */}
                  {currentStep.status === "in_progress" && (
                    <div className="mt-8 flex justify-center">
            <Button
                        onClick={() => updateStepStatus(currentStep.id, "completed")}
                        className="bg-gradient-primary text-white shadow-glow px-8"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Complete Step
            </Button>
          </div>
                  )}
        </div>
            </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {assignment ? (
                    <p className="text-muted-foreground">Waiting for analysis...</p>
                  ) : (
                    <>
                      <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">
                        Select an assignment from your board to get started
                      </p>
                    </>
                  )}
            </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR - Chat with Input (Overlay) */}
        {chatOpen && (
          <aside className="absolute right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                  className={`${
                    message.role === "user"
                      ? "ml-4"
                      : "mr-4"
                        }`}
                      >
                        <div
                    className={`p-3 rounded-lg ${
                            message.role === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-card/50 border border-border"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <FormattedMessage content={message.content} questions={[]} hasQuestions={false} />
                    ) : (
                      <p className="text-sm text-foreground">{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                <div className="mr-4">
                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
              <div ref={messagesEndRef} />
                        </div>

            {/* Chat Input */}
            <div className="border-t border-border bg-card p-4">
              <div className="space-y-3">
                {/* Context Items */}
                {contextItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contextItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm"
                      >
                        <span className="text-primary text-xs">{item.name}</span>
                        <button
                          onClick={() => handleRemoveContext(item.id)}
                          className="text-primary hover:text-primary/70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        </div>
                    ))}
                      </div>
                    )}

                {/* Input Box with Cursor-style buttons */}
                <TooltipProvider>
                  <div className="relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask ASTAR for help..."
                      className="pr-28 pl-4 py-3 min-h-[60px] resize-none bg-background/50 border-border focus:border-primary"
                      disabled={isTyping}
                    />
                    
                    {/* Button Group - positioned inside textarea */}
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      {/* Context Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowContextDialog(!showContextDialog)}
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                          >
                            <Plus className="w-4 h-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Context</TooltipContent>
                      </Tooltip>

                      {/* Workflow Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                            size="icon"
                            onClick={() => setShowWorkflowSelector(!showWorkflowSelector)}
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                          >
                            <Sparkles className="w-4 h-4" />
                  </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select Workflow</TooltipContent>
                      </Tooltip>

                      {/* Send Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                  <Button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isTyping}
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-gradient-primary text-white shadow-glow hover:opacity-90 disabled:opacity-50"
                          >
                            <ArrowUp className="w-4 h-4" />
                  </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Message</TooltipContent>
                      </Tooltip>
                </div>
              </div>
                </TooltipProvider>

                {/* Context Dialog */}
                {showContextDialog && (
                  <div className="p-3 bg-background border border-border rounded-lg space-y-3">
                    <div className="flex gap-2">
                  <Button
                    size="sm"
                        variant={newContextType === 'text' ? 'default' : 'outline'}
                        onClick={() => setNewContextType('text')}
                  >
                        Text
                  </Button>
                  <Button
                    size="sm"
                        variant={newContextType === 'link' ? 'default' : 'outline'}
                        onClick={() => setNewContextType('link')}
                  >
                        Link
                  </Button>
                  <Button
                    size="sm"
                        variant={newContextType === 'pdf' ? 'default' : 'outline'}
                        onClick={() => fileInputRef.current?.click()}
                  >
                        <Upload className="w-3 h-3 mr-1" />
                        File
                  </Button>
                </div>

                    {newContextType === 'text' && (
                      <div className="space-y-2">
                        <Textarea
                          value={newContextText}
                          onChange={(e) => setNewContextText(e.target.value)}
                          placeholder="Paste notes, instructions..."
                          className="min-h-[80px] bg-background/50 text-sm"
                        />
                        <Button size="sm" onClick={handleAddTextContext} className="w-full">
                          Add Text
                        </Button>
              </div>
            )}

                    {newContextType === 'link' && (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={newContextUrl}
                          onChange={(e) => setNewContextUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary"
                        />
                        <Button size="sm" onClick={handleAddLinkContext} className="w-full">
                          Add Link
                        </Button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Close Chat Button */}
              <Button
              variant="ghost"
                size="icon"
              onClick={() => setChatOpen(false)}
              className="absolute top-2 right-2 h-8 w-8 hover:bg-muted z-10"
              >
              <X className="w-4 h-4" />
              </Button>
          </aside>
        )}

        {/* Collapsed Chat - Show Button to Open */}
        {!chatOpen && (
            <Button
            variant="ghost"
              size="icon"
            onClick={() => setChatOpen(true)}
            className="absolute top-4 right-4 z-10 hover:bg-muted shadow-md"
            >
            <Sparkles className="w-5 h-5" />
            </Button>
        )}
      </div>

      {/* Workflow Selector Modal */}
      <WorkflowSelector
        isOpen={showWorkflowSelector}
        onClose={() => setShowWorkflowSelector(false)}
        onSelectWorkflow={handleSelectWorkflow}
      />

      {/* AI Review Modal */}
      {showReviewSection && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={() => {
              if (!isReviewing) {
                setShowReviewSection(false);
                setReviewFeedback(null);
                setUploadedFiles([]);
                setAdditionalContext('');
              }
            }}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {reviewFeedback ? 'Review Results' : 'Assignment Complete!'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviewFeedback 
                      ? 'AI analysis of your completed assignment'
                      : 'Ready for AI Review?'
                    }
                  </p>
                </div>
                {!isReviewing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowReviewSection(false);
                      setReviewFeedback(null);
                      setUploadedFiles([]);
                      setAdditionalContext('');
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {!reviewFeedback ? (
                  /* Preparation Screen */
                  <div className="space-y-6">
                    {/* Auto-collected info */}
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Auto-collected:
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• All step notes ({Object.keys(stepNotes).length} steps)</li>
                        <li>• All subtasks ({Object.values(stepSubtasks).reduce((sum, subs) => sum + subs.length, 0)} total)</li>
                        <li>• Chat history ({messages.length} messages)</li>
                        <li>• Assignment requirements</li>
                        <li>• Journey progress</li>
                      </ul>
                    </div>

                    {/* Final work file upload */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Upload your final work:
                      </label>
                      
                      {/* File upload area */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                          isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-background'
                        }`}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className={`w-12 h-12 mx-auto mb-4 ${
                            isDragging ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <p className="text-foreground font-medium mb-2">
                            Drag and drop files here, or click to browse
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Supports text files, PDFs, images, and more
                          </p>
                        </label>
                      </div>

                      {/* Uploaded files list */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            Uploaded Files ({uploadedFiles.length}):
                          </p>
                          {uploadedFiles.map((uploadedFile, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {uploadedFile.file.type.startsWith('text/') || uploadedFile.file.name.endsWith('.md') || uploadedFile.file.name.endsWith('.txt') ? (
                                  <FileText className="w-5 h-5 text-primary" />
                                ) : (
                                  <File className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {uploadedFile.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(uploadedFile.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(index)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional context */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Additional context (optional):
                      </label>
                      <Textarea
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder="Links, resources, notes, or any other context..."
                        className="min-h-[100px] bg-background border-border focus:border-primary text-foreground"
                      />
                    </div>
                  </div>
                ) : isReviewing ? (
                  /* Loading Screen */
                  <div className="flex flex-col items-center justify-center py-12">
                    <Sparkles className="w-12 h-12 text-primary animate-pulse mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">AI Review in Progress...</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Analyzing your work, checking against requirements, and reviewing your progress...
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">This may take 30-60 seconds</p>
                  </div>
                ) : (
                  /* Results Screen */
                  <div className="space-y-6">
                    {/* Completeness */}
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground">Completeness</h3>
                        <span className="text-2xl font-bold text-primary">{reviewFeedback.completeness}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${reviewFeedback.completeness}%` }}
                        />
                      </div>
                    </div>

                    {/* Submission Readiness */}
                    <div className={`border rounded-lg p-4 ${
                      reviewFeedback.submissionReadiness === 'ready' 
                        ? 'bg-primary/10 border-primary/20' 
                        : reviewFeedback.submissionReadiness === 'almost'
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      <h3 className="font-semibold text-foreground mb-2">Submission Readiness</h3>
                      <p className="text-sm text-foreground">
                        {reviewFeedback.submissionReadiness === 'ready' 
                          ? 'Your work looks ready for submission!'
                          : reviewFeedback.submissionReadiness === 'almost'
                          ? 'Almost ready! Address the remaining items before submission.'
                          : 'Needs more work. Focus on the improvements below before submitting.'
                        }
                      </p>
                    </div>

                    {/* Strengths */}
                    {reviewFeedback.strengths.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Strengths</h3>
                        <ul className="space-y-2">
                          {reviewFeedback.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {reviewFeedback.improvements.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Areas for Improvement</h3>
                        <ul className="space-y-2">
                          {reviewFeedback.improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              <span>{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Rubric Scores */}
                    {Object.keys(reviewFeedback.rubricScores).length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Rubric Check</h3>
                        <div className="space-y-2">
                          {Object.entries(reviewFeedback.rubricScores).map(([criterion, score]) => (
                            <div key={criterion} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                              <span className="text-sm text-foreground">{criterion}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      score >= 85 ? 'bg-primary' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{score}/100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {reviewFeedback.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Recommendations</h3>
                        <ul className="space-y-2">
                          {reviewFeedback.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="text-primary mt-0.5">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Detailed Feedback */}
                    {reviewFeedback.detailedFeedback && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">📄 Detailed Feedback</h3>
                        <div className="bg-background border border-border rounded-lg p-4">
                          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                            {reviewFeedback.detailedFeedback}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border p-6 flex items-center justify-between">
                {!reviewFeedback ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowReviewSection(false);
                        setUploadedFiles([]);
                        setAdditionalContext('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      disabled={isReviewing}
                      className="bg-gradient-primary text-white shadow-glow"
                    >
                      {isReviewing ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                          Reviewing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowReviewSection(false);
                        setReviewFeedback(null);
                        setUploadedFiles([]);
                        setAdditionalContext('');
                      }}
                    >
                      Close
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(reviewFeedback, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `review-${assignment?.title || 'assignment'}-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Report
                      </Button>
                      <Button
                        onClick={() => {
                          setShowReviewSection(false);
                          setReviewFeedback(null);
                          setUploadedFiles([]);
                          setAdditionalContext('');
                          toast({
                            title: "Assignment Complete! 🎉",
                            description: "Great work on completing your assignment!",
                          });
                        }}
                        className="bg-gradient-primary text-white shadow-glow"
                      >
                        Mark as Complete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Astar;

