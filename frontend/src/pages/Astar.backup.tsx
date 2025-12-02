import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Menu, X, Download, Upload, FileText, Plus, Trash2, Link2, FileUp, Type, Brain, Zap, FolderOpen, Book, Workflow as WorkflowIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage, submitAssignmentToCanvas } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import ProgressTracker from "@/components/ProgressTracker";
import { generateStudyGuidePDF, generateAssignmentDraftPDF } from "@/lib/pdfGenerator";
import { formatLLMResponse } from "@/lib/messageFormatter";
import FormattedMessage from "@/components/FormattedMessage";
import { extractTextFromFile } from "@/lib/pdfExtractor";
import KnowledgeGraph, { ConceptNode } from "@/components/KnowledgeGraph";
import KnowledgeGraphFlow from "@/components/KnowledgeGraphFlow";
import StepSolver, { ProblemStep } from "@/components/StepSolver";
import { extractConcepts, addConceptsToGraph, saveKnowledgeGraph, loadKnowledgeGraph, updateConceptStatus, exportKnowledgeGraphAsImage } from "@/lib/conceptExtractor";
import { 
  getMindMaps, 
  getMindMapsByFolder, 
  createMindMap, 
  updateMindMap, 
  getOrCreateFolderForAssignment,
  setCurrentMindMapId,
  getCurrentMindMapId,
  getMindMapById,
  getFolders,
  getCourseMaterialsByFolder,
  createFolder 
} from "@/lib/folderManager";
import { getOrCreateFolderForConversation } from "@/lib/topicDetector";
import WorkflowSelector from "@/components/WorkflowSelector";
import SessionSelector from "@/components/SessionSelector";
import { 
  Workflow,
  initializeDefaultWorkflows,
  isTaskOrAssignment,
  detectRequiredServers,
  suggestWorkflowForTask,
  createWorkflow,
  incrementWorkflowUsage,
  getMCPServers,
  getDisconnectedServers
} from "@/lib/workflowManager";
import {
  WorkSession,
  createSession,
  updateSession,
  getSessionById
} from "@/lib/folderManager";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  questions?: string[];
  formattedContent?: string;
}

interface Assignment {
  id: string;
  title: string;
  course: string;
  courseColor: string;
  description: string;
  dueDate: string;
  daysUntilDue: number;
  points: number;
  course_id?: number;
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
  const assignment = (location.state as { assignment?: Assignment })?.assignment;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: assignment 
        ? `Hi! I'm ASTAR. I see you're working on "${assignment.title}" for ${assignment.course}. I'm here to help you think through this assignment at a fundamental level. What aspect would you like to explore first?`
        : "Hi! I'm ASTAR. I'm here to help you think through complex problems at a fundamental level. What would you like to understand today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!!assignment); // Open if assignment exists
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [generatedStudyGuide, setGeneratedStudyGuide] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [showAddContext, setShowAddContext] = useState(false);
  const [newContextType, setNewContextType] = useState<'pdf' | 'text' | 'link' | 'folder'>('text');
  const [newContextText, setNewContextText] = useState('');
  const [newContextUrl, setNewContextUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Knowledge Graph & Step Solver state
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(true);
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [currentConcept, setCurrentConcept] = useState<string | undefined>();
  const [stepMode, setStepMode] = useState(false);
  const [problemSteps, setProblemSteps] = useState<ProblemStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Session state
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Workflow state
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [workflowActive, setWorkflowActive] = useState(false);
  const [showWorkflowFeedback, setShowWorkflowFeedback] = useState(false);

  // Progress tracking
  const messageCount = Math.floor((messages.length - 1) / 2); // User messages only
  const targetMessages = 10; // Target number of exchanges for completion
  const progress = Math.min((messageCount / targetMessages) * 100, 100);
  const isComplete = progress >= 100;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper functions for session management
  const loadSession = (sessionId: string) => {
    const session = getSessionById(sessionId);
    if (session) {
      setConcepts(session.concepts);
      setMessages(session.conversationHistory.map((msg, idx) => ({
        id: `${idx}`,
        role: msg.role,
        content: msg.content,
      })));
      setNotes(session.notes);
      // Add addedAt property if missing for backwards compatibility
      setContextItems(session.contextItems.map(item => ({
        ...item,
        addedAt: item.addedAt || new Date()
      })) as ContextItem[]);
      setStepMode(session.stepMode);
      setProblemSteps(session.problemSteps);
      setCurrentStepIndex(session.currentStepIndex);
      setCurrentSessionIdState(session.id);
      setCurrentFolderId(session.folderId);
      setCurrentMindMapId(session.id);
      
      toast({
        title: "Session Loaded",
        description: `Loaded "${session.name}"`,
      });
    }
  };

  const startNewSession = () => {
    setConcepts([]);
    setMessages([{
      id: "1",
      role: "assistant",
      content: assignment 
        ? `Hi! I'm ASTAR. I see you're working on "${assignment.title}" for ${assignment.course}. I'm here to help you think through this assignment at a fundamental level. What aspect would you like to explore first?`
        : "Hi! I'm ASTAR. I'm here to help you think through complex problems at a fundamental level. What would you like to understand today?",
    }]);
    setNotes("");
    setContextItems([]);
    setStepMode(false);
    setProblemSteps([]);
    setCurrentStepIndex(0);
    setCurrentSessionIdState(null);
    setCurrentMindMapId(null);
    saveKnowledgeGraph([]);
  };

  // Initialize workflows on mount
  useEffect(() => {
    initializeDefaultWorkflows();
  }, []);

  // Load available folders on mount
  useEffect(() => {
    const folders = getFolders();
    setAvailableFolders(folders.map(f => ({ id: f.id, name: f.name })));
  }, []);

  // Initialize session system
  useEffect(() => {
    // Check if coming from Folders page with a specific session
    const sessionIdFromState = (location.state as { sessionId?: string; mindMapId?: string })?.sessionId 
      || (location.state as { mindMapId?: string })?.mindMapId;
    
    if (sessionIdFromState) {
      // Load the specific session
      loadSession(sessionIdFromState);
    } else if (assignment) {
      // Auto-create or get folder for this assignment
      const folder = getOrCreateFolderForAssignment(
        assignment.course_id?.toString() || assignment.id.split('-')[0],
        assignment.course
      );
      setCurrentFolderId(folder.id);
      
      // Check if there's already a session for this assignment
      const folderSessions = getMindMapsByFolder(folder.id);
      const existingSession = folderSessions.find(s => s.assignmentId === assignment.id);
      
      if (existingSession) {
        loadSession(existingSession.id);
      }
    } else {
      // No assignment - Start fresh in workbench
      startNewSession();
    }
  }, []);

  // Auto-save complete session whenever key data changes
  useEffect(() => {
    const saveCurrentSession = async () => {
      if (messages.length <= 1) return; // Don't save if only greeting message

      // Save to localStorage for current session
      saveKnowledgeGraph(concepts);
      
      // Prepare conversation history with timestamps
      const conversationWithTimestamps = messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date()
      }));
      
      // If we have a current session ID, update it
      if (currentSessionId) {
        updateSession(currentSessionId, {
          concepts,
          conversationHistory: conversationWithTimestamps,
          notes,
          contextItems,
          stepMode,
          problemSteps,
          currentStepIndex,
        });
      } else if (currentFolderId && messages.length >= 3) {
        // Auto-create session after user has interacted enough
        // Detect session name from conversation
        const sessionName = assignment?.title || messages[1]?.content.substring(0, 50) || "New Study Session";
        
        const newSession = createSession(sessionName, currentFolderId, {
          concepts,
          conversationHistory: conversationWithTimestamps,
          assignmentId: assignment?.id,
          assignmentTitle: assignment?.title,
          sessionType: assignment ? 'assignment' : 'general-study',
        });
        
        setCurrentSessionIdState(newSession.id);
        setCurrentMindMapId(newSession.id);
        
        toast({
          title: "Session Saved",
          description: `Created "${newSession.name}"`,
        });
      }
    };

    saveCurrentSession();
  }, [concepts, messages, notes, contextItems, stepMode, problemSteps, currentStepIndex]);

  const handleSelectWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    setWorkflowActive(true);
    incrementWorkflowUsage(workflow.id);
    
    toast({
      title: "Workflow Activated",
      description: `Using "${workflow.name}" workflow`,
    });

    // Auto-enable step mode for workflows
    setStepMode(true);
  };

  const handleWorkflowFeedback = (rating: 'up' | 'down') => {
    if (currentWorkflow) {
      const { rateWorkflow } = require('@/lib/workflowManager');
      rateWorkflow(currentWorkflow.id, rating);
      
      toast({
        title: rating === 'up' ? 'Thanks for the feedback!' : 'We\'ll improve this',
        description: rating === 'up' 
          ? 'This workflow will be prioritized in suggestions'
          : 'Help us understand what didn\'t work',
      });

      // If rated positively and workflow was ad-hoc, offer to save
      if (rating === 'up' && !currentWorkflow.id.startsWith('workflow-canvas')) {
        // This was a suggested/new workflow - already saved
        toast({
          title: "Workflow Saved!",
          description: "This workflow will be available for future use",
        });
      }
    }
    
    setShowWorkflowFeedback(false);
    setWorkflowActive(false);
    setCurrentWorkflow(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    // Detect if this is a task/assignment
    const isTask = isTaskOrAssignment(currentInput);
    
    // Detect required MCP servers
    const requiredServers = detectRequiredServers(
      currentInput, 
      assignment?.description
    );
    
    // Check for disconnected servers
    const disconnected = getDisconnectedServers().filter(s => 
      requiredServers.includes(s.id)
    );

    // Suggest workflow if task detected and no current workflow
    if (isTask && !workflowActive && messages.length < 3) {
      const suggestedWorkflow = suggestWorkflowForTask(currentInput, assignment?.description);
      if (suggestedWorkflow) {
        toast({
          title: "Workflow Suggested",
          description: `Try "${suggestedWorkflow.name}" for this task`,
          action: {
            label: "Use Workflow",
            onClick: () => handleSelectWorkflow(suggestedWorkflow)
          },
        } as any);
      }
    }

    // Notify about disconnected servers
    if (disconnected.length > 0 && isTask) {
      toast({
        title: "MCP Servers Needed",
        description: `Connect ${disconnected.map(s => s.name).join(', ')} to enable full functionality`,
        action: {
          label: "Connect",
          onClick: () => setShowWorkflowSelector(true)
        },
      } as any);
    }

    try {
      // Build additional context from context items
      let additionalContext = '';
      if (contextItems.length > 0) {
        additionalContext = '\n\nAdditional Context:\n' + contextItems.map(item => {
          if (item.type === 'link') {
            return `[Link: ${item.name}] ${item.content}`;
          } else if (item.type === 'pdf') {
            return `[Document: ${item.name}]\n${item.content.substring(0, 5000)}`; // Limit to 5000 chars
          } else {
            return `[Note: ${item.name}]\n${item.content}`;
          }
        }).join('\n\n');
      }

      // Build enhanced context with workflow and task detection
      let enhancedMessage = currentInput + additionalContext;
      
      // Add workflow context if active
      if (workflowActive && currentWorkflow) {
        enhancedMessage += `\n\n[SYSTEM: User is using the "${currentWorkflow.name}" workflow. Steps: ${currentWorkflow.steps.map(s => s.serverName).join(' → ')}. Focus on step-by-step guidance and resource identification.]`;
      }
      
      // Add task detection context
      if (isTask) {
        enhancedMessage += `\n\n[SYSTEM: This appears to be a task/assignment request. Use Step Mode to break down the process. Identify required resources and platforms (GitHub, Notion, etc.) that might help complete this task.]`;
      }
      
      // Add required servers context
      if (requiredServers.length > 0) {
        const connectedList = requiredServers.filter(id => 
          getMCPServers().find(s => s.id === id)?.connected
        );
        const disconnectedList = disconnected.map(s => s.name);
        
        if (disconnectedList.length > 0) {
          enhancedMessage += `\n\n[SYSTEM: Required platforms detected but not connected: ${disconnectedList.join(', ')}. Suggest connecting these to help with the task.]`;
        }
      }

      // Call real LLM backend with optional assignment context and additional context
      const response = await sendChatMessage({
        message: enhancedMessage,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        assignmentContext: assignment
      });

      // Format the LLM response (strip <think> tags, extract questions)
      const formatted = formatLLMResponse(response.response);

      // Extract concepts from LLM response and update knowledge graph
      const extractedConcepts = extractConcepts(response.response, concepts);
      if (extractedConcepts.length > 0) {
        const updatedConcepts = addConceptsToGraph(concepts, extractedConcepts, 'mentioned');
        setConcepts(updatedConcepts);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response, // Keep original for history
        formattedContent: formatted.content,
        questions: formatted.questions,
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Check if we should offer workflow feedback after significant progress
      if (workflowActive && !showWorkflowFeedback && messages.length >= 8) {
        setShowWorkflowFeedback(true);
      }

      // Auto-detect folder after a few messages (only if no folder/assignment assigned)
      if (!currentFolderId && !assignment && messages.length >= 4) {
        const allMessages = [...messages, userMessage, aiMessage];
        try {
          const folderResult = await getOrCreateFolderForConversation(
            allMessages.map(m => ({ role: m.role, content: m.content })),
            getFolders(),
            createFolder
          );

          if (folderResult) {
            setCurrentFolderId(folderResult.id);
            
            // Create a session name from the detected folder/topic
            const sessionName = allMessages[1]?.content.substring(0, 50) || folderResult.name;
            
            // Create new session in the detected folder
            const newSession = createSession(sessionName, folderResult.id, {
              concepts,
              conversationHistory: allMessages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: new Date()
              })),
              sessionType: 'exploration',
              classSubject: folderResult.name,
            });
            
            setCurrentSessionIdState(newSession.id);
            setCurrentMindMapId(newSession.id);
            
            if (folderResult.isNew) {
              toast({
                title: "Folder & Session Created",
                description: `Organized into "${folderResult.name}"`,
              });
            } else {
              toast({
                title: "Session Saved",
                description: `Added to "${folderResult.name}"`,
              });
            }
          }
        } catch (topicError) {
          console.error('Error detecting topic:', topicError);
          // Silent fail - not critical
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      toast({
        title: "Failed to Send Message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your message. Please make sure the backend is running and try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddTextContext = () => {
    if (!newContextText.trim()) {
      toast({
        title: "Empty Context",
        description: "Please enter some text",
        variant: "destructive",
      });
      return;
    }

    const newItem: ContextItem = {
      id: Date.now().toString(),
      type: 'text',
      name: `Text Note ${contextItems.filter(i => i.type === 'text').length + 1}`,
      content: newContextText,
      addedAt: new Date(),
    };

    setContextItems([...contextItems, newItem]);
    setNewContextText('');
    setShowAddContext(false);
    
    toast({
      title: "Context Added",
      description: "Text context has been added successfully",
    });
  };

  const handleAddLinkContext = () => {
    if (!newContextUrl.trim()) {
      toast({
        title: "Empty URL",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    const newItem: ContextItem = {
      id: Date.now().toString(),
      type: 'link',
      name: newContextUrl.split('/').pop() || 'Link',
      content: newContextUrl,
      addedAt: new Date(),
    };

    setContextItems([...contextItems, newItem]);
    setNewContextUrl('');
    setShowAddContext(false);
    
    toast({
      title: "Link Added",
      description: "Link has been added to context",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText = file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md');
    
    if (!isPDF && !isText) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or text file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading toast for PDFs (they take longer)
      if (isPDF) {
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF...",
        });
      }

      // Extract text using the proper extractor
      const text = await extractTextFromFile(file);
      
      const newItem: ContextItem = {
        id: Date.now().toString(),
        type: 'pdf',
        name: file.name,
        content: text,
        addedAt: new Date(),
      };

      setContextItems([...contextItems, newItem]);
      setShowAddContext(false);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been added to context (${Math.round(text.length / 1000)}KB)`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not read file",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveContext = (id: string) => {
    setContextItems(contextItems.filter(item => item.id !== id));
    toast({
      title: "Context Removed",
      description: "Item removed from context",
    });
  };

  const handleAddFolderMaterials = () => {
    if (!selectedFolderId) {
      toast({
        title: "No Folder Selected",
        description: "Please select a folder",
        variant: "destructive",
      });
      return;
    }

    // Get course materials from the selected folder
    const materials = getCourseMaterialsByFolder(selectedFolderId);
    const folder = getFolders().find(f => f.id === selectedFolderId);

    if (materials.length === 0) {
      toast({
        title: "No Materials",
        description: "This folder doesn't have any course materials",
        variant: "destructive",
      });
      return;
    }

    // Add each material as a context item
    const newItems: ContextItem[] = materials.map(material => ({
      id: `material-${material.id}`,
      type: 'text',
      name: `${folder?.name || 'Folder'} - ${material.name}`,
      content: material.content || '',
      addedAt: new Date(),
    }));

    setContextItems([...contextItems, ...newItems]);
    setSelectedFolderId(null);
    setShowAddContext(false);
    
    toast({
      title: "Materials Added",
      description: `Added ${newItems.length} material(s) to context`,
    });
  };

  // Step Solver handlers
  const handleAnswerSubmit = async (stepId: string, answer: string) => {
    // Update step with user answer
    const updatedSteps = problemSteps.map(step =>
      step.id === stepId ? { ...step, userAnswer: answer } : step
    );
    setProblemSteps(updatedSteps);

    // Send to LLM for evaluation
    try {
      const response = await sendChatMessage({
        message: `Step ${problemSteps[currentStepIndex].stepNumber}: My answer is: ${answer}. Is this correct?`,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        assignmentContext: assignment
      });

      // Parse LLM response for correctness
      const isCorrect = response.response.toLowerCase().includes('correct') || 
                       response.response.toLowerCase().includes('right') ||
                       response.response.toLowerCase().includes('yes');

      // Update step with feedback
      const finalSteps = updatedSteps.map(step =>
        step.id === stepId
          ? {
              ...step,
              isCorrect,
              feedback: response.response,
            }
          : step
      );
      setProblemSteps(finalSteps);

      // If correct, update concept status to in-progress or mastered
      const currentStep = problemSteps[currentStepIndex];
      if (isCorrect && currentStep.conceptsIntroduced.length > 0) {
        let updatedConcepts = concepts;
        currentStep.conceptsIntroduced.forEach(conceptLabel => {
          updatedConcepts = updateConceptStatus(
            updatedConcepts,
            concepts.find(c => c.label === conceptLabel)?.id || '',
            'in-progress'
          );
        });
        setConcepts(updatedConcepts);
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      toast({
        title: "Error",
        description: "Failed to check answer",
        variant: "destructive",
      });
    }
  };

  const handleHintRequest = async (stepId: string) => {
    const step = problemSteps.find(s => s.id === stepId);
    if (!step || step.hintsUsed >= step.maxHints) return;

    // Update hints used
    const updatedSteps = problemSteps.map(s =>
      s.id === stepId ? { ...s, hintsUsed: s.hintsUsed + 1 } : s
    );
    setProblemSteps(updatedSteps);

    // Request hint from LLM
    try {
      const response = await sendChatMessage({
        message: `I need a hint for: ${step.prompt}`,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        assignmentContext: assignment
      });

      toast({
        title: `Hint ${step.hintsUsed + 1}/${step.maxHints}`,
        description: response.response,
      });
    } catch (error) {
      console.error('Error getting hint:', error);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < problemSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      
      // Mark completed concepts as mastered
      const completedStep = problemSteps[currentStepIndex];
      if (completedStep.isCorrect && completedStep.conceptsIntroduced.length > 0) {
        let updatedConcepts = concepts;
        completedStep.conceptsIntroduced.forEach(conceptLabel => {
          const concept = concepts.find(c => c.label === conceptLabel);
          if (concept) {
            updatedConcepts = updateConceptStatus(updatedConcepts, concept.id, 'mastered');
          }
        });
        setConcepts(updatedConcepts);
      }
    } else {
      // All steps completed!
      toast({
        title: "Problem Solved!",
        description: "You've completed all steps. Great work!",
      });
    }
  };

  const handleConceptClick = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (concept) {
      setCurrentConcept(conceptId);
      // Could trigger a message asking about this concept
      toast({
        title: "Concept Selected",
        description: `Click again to ask ASTAR about "${concept.label}"`,
      });
    }
  };


  const handleGenerateDraft = async () => {
    if (!assignment) return;
    
    setIsGenerating(true);
    try {
      const response = await sendChatMessage({
        message: `Based on our entire conversation about "${assignment.title}", please generate a complete, polished draft for this assignment. Include all the concepts we discussed and structure it properly for submission.`,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        assignmentContext: assignment
      });

      // Save the generated content
      setGeneratedDraft(response.response);

      // Add the generated draft as a message
      const draftMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `# 📝 Assignment Draft\n\n${response.response}\n\n---\n\n*This draft is based on our discussion. Please review, edit, and add your own voice before submitting.*`,
      };
      
      setMessages((prev) => [...prev, draftMessage]);
      
      // Offer workflow feedback if active
      if (workflowActive && currentWorkflow) {
        setShowWorkflowFeedback(true);
      }
      
      toast({
        title: "Draft Generated!",
        description: "You can now submit to Canvas or download as PDF.",
      });
    } catch (error) {
      toast({
        title: "Failed to Generate Draft",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateStudyGuide = async () => {
    setIsGenerating(true);
    try {
      const response = await sendChatMessage({
        message: `Based on our entire conversation, please create a comprehensive study guide that summarizes all the key concepts, insights, and important points we discussed. Format it clearly with headings and bullet points.`,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        assignmentContext: assignment
      });

      // Save the generated content
      setGeneratedStudyGuide(response.response);

      // Add the study guide as a message
      const studyGuideMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `# 📚 Study Guide\n\n${response.response}\n\n---\n\n*This study guide captures the key points from our discussion.*`,
      };
      
      setMessages((prev) => [...prev, studyGuideMessage]);
      
      toast({
        title: "Study Guide Generated!",
        description: "Download as PDF below.",
      });
    } catch (error) {
      toast({
        title: "Failed to Generate Study Guide",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadDraftPDF = () => {
    if (!generatedDraft || !assignment) return;

    generateAssignmentDraftPDF({
      title: assignment.title,
      content: generatedDraft,
      subject: assignment.course,
    });

    toast({
      title: "PDF Downloaded!",
      description: "Check your downloads folder.",
    });
  };

  const handleDownloadStudyGuidePDF = async () => {
    if (!generatedStudyGuide) return;

    // Export knowledge graph as image if available
    const graphImage = concepts.length > 0 ? await exportKnowledgeGraphAsImage() : null;

    generateStudyGuidePDF({
      title: assignment ? `${assignment.title} - Study Guide` : 'Study Guide',
      content: generatedStudyGuide,
      subject: assignment?.course,
      knowledgeGraphImage: graphImage,
    });

    toast({
      title: "PDF Downloaded!",
      description: "Check your downloads folder.",
    });
  };

  const handleSubmitToCanvas = async () => {
    if (!generatedDraft || !assignment) return;

    setIsSubmitting(true);
    try {
      // Extract course ID from assignment (assuming it's stored)
      // For now, we'll need to add courseId to the assignment interface
      const courseId = (assignment as any).course_id || assignment.id.split('-')[0];

      await submitAssignmentToCanvas(
        assignment.id,
        courseId,
        generatedDraft
      );

      toast({
        title: "Submitted to Canvas!",
        description: `Your assignment "${assignment.title}" has been submitted successfully.`,
      });

      // Clear the draft after submission
      setGeneratedDraft(null);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit to Canvas",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Progress Tracker */}
      <ProgressTracker
        progress={progress}
        messageCount={messageCount}
        isComplete={isComplete}
        hasAssignment={!!assignment}
        onGenerateDraft={handleGenerateDraft}
        onGenerateStudyGuide={handleGenerateStudyGuide}
        isGenerating={isGenerating}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
      {/* Collapsible Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } border-r border-border bg-card transition-all duration-200 overflow-hidden flex flex-col`}
      >
        {assignment ? (
          // Show assignment context if assignment exists
          <>
            <div className="p-4 border-b border-border max-h-[400px] overflow-y-auto">
              <h2 className="font-semibold text-lg mb-2">Assignment Context</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Title:</span>
                  <p className="font-medium">{assignment.title}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Course:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: assignment.courseColor }}
                    />
                    <p className="font-medium">{assignment.course}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Due:</span>
                  <p className="font-medium">
                    In {assignment.daysUntilDue} {assignment.daysUntilDue === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Points:</span>
                  <p className="font-medium">{assignment.points} pts</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {assignment.description}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Show empty state if no assignment
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg mb-2">Assignment Context</h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No assignment selected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Start with ASTAR" on an assignment to get personalized help
              </p>
            </div>
          </div>
        )}
        
        {/* Context Section */}
        <div className="flex-1 flex flex-col p-4 border-t border-border overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Context</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddContext(!showAddContext)}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Add Context Form */}
          {showAddContext && (
            <div className="mb-3 p-3 bg-background/50 rounded-lg border border-border space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={newContextType === 'text' ? 'default' : 'outline'}
                  onClick={() => setNewContextType('text')}
                  className="flex-1"
                >
                  <Type className="w-3 h-3 mr-1" />
                  Text
                </Button>
                <Button
                  size="sm"
                  variant={newContextType === 'link' ? 'default' : 'outline'}
                  onClick={() => setNewContextType('link')}
                  className="flex-1"
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Link
                </Button>
                <Button
                  size="sm"
                  variant={newContextType === 'pdf' ? 'default' : 'outline'}
                  onClick={() => {
                    setNewContextType('pdf');
                    fileInputRef.current?.click();
                  }}
                  className="flex-1"
                >
                  <FileUp className="w-3 h-3 mr-1" />
                  File
                </Button>
                <Button
                  size="sm"
                  variant={newContextType === 'folder' ? 'default' : 'outline'}
                  onClick={() => setNewContextType('folder')}
                  className="flex-1"
                >
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Folder
                </Button>
              </div>

              {newContextType === 'text' && (
                <div className="space-y-2">
                  <Textarea
                    value={newContextText}
                    onChange={(e) => setNewContextText(e.target.value)}
                    placeholder="Paste text, notes, or instructions..."
                    className="min-h-[100px] text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTextContext}
                    className="w-full"
                  >
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
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-md focus:border-primary"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddLinkContext}
                    className="w-full"
                  >
                    Add Link
                  </Button>
                </div>
              )}

              {newContextType === 'folder' && (
                <div className="space-y-2">
                  <select
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-md focus:border-primary"
                  >
                    <option value="">Select a folder...</option>
                    {availableFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleAddFolderMaterials}
                    className="w-full"
                  >
                    <Book className="w-3 h-3 mr-2" />
                    Add Folder Materials
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

          {/* Context Items List */}
          <div className="space-y-2">
            {contextItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No context added yet. Click + to add PDFs, links, or text that ASTAR can reference.
              </p>
            ) : (
              contextItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-background/50 border border-border rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {item.type === 'pdf' && <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                      {item.type === 'link' && <Link2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                      {item.type === 'text' && <Type className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.type === 'link' ? item.content : `${item.content.substring(0, 50)}...`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveContext(item.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="p-4 border-t border-border">
          <h2 className="font-semibold text-sm mb-2">Quick Notes</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down quick thoughts..."
            className="min-h-[80px] text-xs resize-none bg-background/50 border-border focus:border-primary transition-colors"
          />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-muted"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">ASTAR Workbench</h1>
          </div>

          {/* Mode Toggle Buttons */}
          <div className="ml-auto flex items-center gap-2">
            {/* Session Selector */}
            <SessionSelector
              currentSessionId={currentSessionId}
              currentFolderId={currentFolderId}
              onSelectSession={(session) => loadSession(session.id)}
              onNewSession={startNewSession}
            />
            <Button
              variant={showKnowledgeGraph ? "default" : "outline"}
              size="sm"
              onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
              className="h-8"
            >
              <Brain className="w-4 h-4 mr-1" />
              Mind Map
            </Button>
            <Button
              variant={stepMode ? "default" : "outline"}
              size="sm"
              onClick={() => setStepMode(!stepMode)}
              className="h-8"
            >
              <Zap className="w-4 h-4 mr-1" />
              Step Mode
            </Button>
          </div>
        </div>

        {/* Main Content Area with Knowledge Graph and Chat Side by Side */}
        <div className="flex-1 flex overflow-hidden">
          {/* Knowledge Graph Panel (Main Focus - Left/Center) */}
          {showKnowledgeGraph && (
            <div className="flex-1 border-r border-border">
              <KnowledgeGraphFlow
                concepts={concepts}
                currentConcept={currentConcept}
                onConceptClick={handleConceptClick}
              />
            </div>
          )}

          {/* Chat Panel (Right Side) */}
          <div className={`flex flex-col ${showKnowledgeGraph ? 'w-[450px]' : 'flex-1'}`}>
            {stepMode && problemSteps.length > 0 ? (
              /* Step-by-Step Problem Solver */
              <StepSolver
                steps={problemSteps}
                currentStepIndex={currentStepIndex}
                onAnswerSubmit={handleAnswerSubmit}
                onHintRequest={handleHintRequest}
                onNextStep={handleNextStep}
                isCheckingAnswer={isTyping}
              />
            ) : (
              /* Normal Chat Interface */
              <>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-gradient-primary text-white shadow-glow"
                              : "bg-card border border-primary/20 text-foreground"
                          }`}
                        >
                          {message.role === "user" ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          ) : (
                            <FormattedMessage
                              content={message.formattedContent || message.content}
                              questions={message.questions || []}
                              hasQuestions={(message.questions?.length || 0) > 0}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-primary/20 rounded-xl px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for Generated Content */}
                    {generatedDraft && assignment && (
                      <div className="flex flex-col gap-3 p-4 bg-card/50 border border-primary/30 rounded-xl">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <FileText className="w-4 h-4 text-primary" />
                          Assignment Draft Ready
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleSubmitToCanvas}
                            disabled={isSubmitting}
                            className="flex-1 bg-gradient-primary text-white shadow-glow"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Submitting...' : 'Submit to Canvas'}
                          </Button>
                          <Button
                            onClick={handleDownloadDraftPDF}
                            variant="outline"
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )}

                    {generatedStudyGuide && (
                      <div className="flex flex-col gap-3 p-4 bg-card/50 border border-primary/30 rounded-xl">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <FileText className="w-4 h-4 text-primary" />
                          Study Guide Ready
                        </div>
                        <Button
                          onClick={handleDownloadStudyGuidePDF}
                          className="w-full bg-gradient-primary text-white shadow-glow"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Study Guide PDF
                        </Button>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Workflow Status Bar */}
            {workflowActive && currentWorkflow && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <WorkflowIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    Using: {currentWorkflow.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWorkflowFeedback(true)}
                    className="h-7 px-2 text-xs"
                  >
                    Rate Workflow
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWorkflowActive(false);
                      setCurrentWorkflow(null);
                      toast({ title: "Workflow Deactivated" });
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Workflow Feedback */}
            {showWorkflowFeedback && (
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                <span className="text-sm">Was this workflow helpful?</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWorkflowFeedback('up')}
                    className="h-8 gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWorkflowFeedback('down')}
                    className="h-8 gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    No
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWorkflowFeedback(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {/* Workflow Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowWorkflowSelector(true)}
                className="self-end"
                title="Select Workflow"
              >
                <WorkflowIcon className="w-5 h-5" />
              </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question... (ASTAR guides you to think through it)"
              className="resize-none min-h-[60px] bg-background border-border focus:border-primary transition-colors"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-primary text-white shadow-glow hover:shadow-lg hover:scale-105 transition-all self-end"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* Workflow Selector Dialog */}
      <WorkflowSelector
        isOpen={showWorkflowSelector}
        onClose={() => setShowWorkflowSelector(false)}
        onSelectWorkflow={handleSelectWorkflow}
      />
    </div>
  );
};

export default Astar;
