import { Star, FileText, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface ProgressTrackerProps {
  progress: number; // 0-100
  messageCount: number;
  isComplete: boolean;
  hasAssignment: boolean;
  onGenerateDraft: () => void;
  onGenerateStudyGuide: () => void;
  isGenerating: boolean;
}

const ProgressTracker = ({
  progress,
  messageCount,
  isComplete,
  hasAssignment,
  onGenerateDraft,
  onGenerateStudyGuide,
  isGenerating,
}: ProgressTrackerProps) => {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card/50">
      {/* Title */}
      <div className="flex items-center gap-2 min-w-fit">
        <h1 className="text-lg font-semibold">ASTAR Workbench</h1>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-primary via-primary to-yellow-500"
                : "bg-gradient-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <span className="text-sm text-muted-foreground min-w-fit">
          {messageCount} exchanges
        </span>
      </div>

      {/* Completion Star */}
      {isComplete ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-yellow-500 text-white shadow-glow animate-pulse hover:scale-110 transition-all"
            >
              <Star className="w-4 h-4 mr-2 fill-current" />
              Complete Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                Great Work! Session Complete
              </DialogTitle>
              <DialogDescription>
                You've thoroughly explored this topic. What would you like to do next?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-4">
              {hasAssignment && (
                <Button
                  onClick={onGenerateDraft}
                  disabled={isGenerating}
                  className="w-full bg-gradient-primary text-white justify-start h-auto py-4"
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Generate Assignment Draft</p>
                    <p className="text-xs opacity-80">
                      Create a polished draft based on our discussion
                    </p>
                  </div>
                </Button>
              )}
              
              <Button
                onClick={onGenerateStudyGuide}
                disabled={isGenerating}
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <BookOpen className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Generate Study Guide</p>
                  <p className="text-xs text-muted-foreground">
                    Summarize key concepts and insights from this session
                  </p>
                </div>
              </Button>

              {isGenerating && (
                <p className="text-sm text-center text-muted-foreground pt-2">
                  Generating your document...
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Star className="w-4 h-4" />
          <span className="text-sm">Keep exploring...</span>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;


