import React, { useState } from "react";
import {
  AssignmentJourney,
  JourneyStep,
  JourneyStepStatus,
} from "@/domain/assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Circle, Play } from "lucide-react";

interface JourneyStepperProps {
  journey: AssignmentJourney;
}

export default function JourneyStepper({ journey }: JourneyStepperProps) {
  const [steps, setSteps] = useState<JourneyStep[]>(journey.steps);

  const updateStepStatus = (stepId: string, newStatus: JourneyStepStatus) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId ? { ...step, status: newStatus } : step
      )
    );
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercent = (completedSteps / steps.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Your Journey
          </span>
          <span className="text-sm font-normal text-gray-600 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            ~{Math.ceil(journey.totalEstimatedMinutes / 60)} hours
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {completedSteps} / {steps.length} steps completed
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.status === "completed"
                  ? "border-green-300 bg-green-50"
                  : step.status === "in_progress"
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Step icon */}
                <div className="flex-shrink-0 mt-1">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : step.status === "in_progress" ? (
                    <Circle className="w-6 h-6 text-blue-600 fill-blue-200" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Step {idx + 1}: {step.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Estimated time: {step.estimatedMinutes} minutes
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {step.status === "not_started" && (
                      <Button
                        size="sm"
                        onClick={() => updateStepStatus(step.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {step.status === "in_progress" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStepStatus(step.id, "completed")}
                        >
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStepStatus(step.id, "not_started")
                          }
                        >
                          Reset
                        </Button>
                      </>
                    )}
                    {step.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStepStatus(step.id, "in_progress")}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
