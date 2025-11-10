import React, { useState } from 'react';
import { CheckCircle, Circle, Lightbulb, ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

export interface ProblemStep {
  id: string;
  stepNumber: number;
  title: string;
  prompt: string;
  userAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
  hintsUsed: number;
  maxHints: number;
  conceptsIntroduced: string[]; // Concepts to add to knowledge graph
}

interface StepSolverProps {
  steps: ProblemStep[];
  currentStepIndex: number;
  onAnswerSubmit: (stepId: string, answer: string) => void;
  onHintRequest: (stepId: string) => void;
  onNextStep: () => void;
  isCheckingAnswer?: boolean;
  className?: string;
}

const StepSolver: React.FC<StepSolverProps> = ({
  steps,
  currentStepIndex,
  onAnswerSubmit,
  onHintRequest,
  onNextStep,
  isCheckingAnswer = false,
  className = '',
}) => {
  const [localAnswer, setLocalAnswer] = useState('');
  
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isCorrect).length;
  const progress = (completedSteps / totalSteps) * 100;

  const handleSubmit = () => {
    if (localAnswer.trim()) {
      onAnswerSubmit(currentStep.id, localAnswer);
      // Don't clear answer yet - wait for feedback
    }
  };

  const handleNext = () => {
    setLocalAnswer('');
    onNextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !currentStep.isCorrect) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderStepIndicator = (step: ProblemStep, index: number) => {
    const isCurrent = index === currentStepIndex;
    const isCompleted = step.isCorrect;
    const isPast = index < currentStepIndex;

    return (
      <div key={step.id} className="flex items-center">
        <div
          className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
            isCompleted
              ? 'bg-primary text-white shadow-glow'
              : isCurrent
              ? 'bg-gradient-primary text-white shadow-glow animate-pulse'
              : isPast
              ? 'bg-muted text-muted-foreground'
              : 'bg-background border-2 border-border text-muted-foreground'
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <span className="text-sm font-semibold">{index + 1}</span>
          )}
        </div>
        {index < totalSteps - 1 && (
          <div
            className={`h-0.5 w-8 mx-1 transition-all duration-300 ${
              isCompleted ? 'bg-primary' : 'bg-border'
            }`}
          />
        )}
      </div>
    );
  };

  if (!currentStep) {
    // All steps completed!
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow mb-4 animate-bounce">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Problem Solved! 🎉</h2>
        <p className="text-muted-foreground text-center mb-4">
          You've completed all {totalSteps} steps. Great work!
        </p>
        <div className="flex gap-2">
          <Button variant="outline">Review Steps</Button>
          <Button className="bg-gradient-primary">New Problem</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Progress Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">
              Step {currentStep.stepNumber} of {totalSteps}
            </h3>
            <h2 className="text-lg font-bold">{currentStep.title}</h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center">
          {steps.map((step, index) => renderStepIndicator(step, index))}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* LLM Prompt */}
        <div className="flex items-start gap-3 p-4 bg-card border border-primary/20 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed">{currentStep.prompt}</p>
          </div>
        </div>

        {/* Answer Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Your Answer:</label>
          <Textarea
            value={localAnswer || currentStep.userAnswer || ''}
            onChange={(e) => setLocalAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here..."
            className="min-h-[100px] bg-background"
            disabled={currentStep.isCorrect || isCheckingAnswer}
          />
        </div>

        {/* Feedback */}
        {currentStep.feedback && (
          <div
            className={`p-4 rounded-lg border ${
              currentStep.isCorrect
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
            }`}
          >
            <div className="flex items-start gap-2">
              {currentStep.isCorrect ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{currentStep.feedback}</p>
            </div>
          </div>
        )}

        {/* Concepts Being Learned */}
        {currentStep.conceptsIntroduced.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Circle className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Concepts in this step:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentStep.conceptsIntroduced.map(concept => (
                <span
                  key={concept}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="flex gap-2">
          {!currentStep.isCorrect ? (
            <>
              <Button
                variant="outline"
                onClick={() => onHintRequest(currentStep.id)}
                disabled={currentStep.hintsUsed >= currentStep.maxHints || isCheckingAnswer}
                className="flex-1"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Hint ({currentStep.hintsUsed}/{currentStep.maxHints})
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!localAnswer.trim() || isCheckingAnswer}
                className="flex-1 bg-gradient-primary text-white"
              >
                {isCheckingAnswer ? 'Checking...' : 'Check Answer'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-primary text-white"
            >
              {currentStepIndex < totalSteps - 1 ? (
                <>
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Complete!
                  <Trophy className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepSolver;


