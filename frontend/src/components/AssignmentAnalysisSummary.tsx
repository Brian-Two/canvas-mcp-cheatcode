import React from "react";
import { AssignmentAnalysis } from "@/domain/assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle2, Target } from "lucide-react";

interface AssignmentAnalysisSummaryProps {
  analysis: AssignmentAnalysis;
}

export default function AssignmentAnalysisSummary({
  analysis,
}: AssignmentAnalysisSummaryProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Assignment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Type</p>
          <Badge variant="outline" className="capitalize">
            {analysis.type.replace("_", " ")}
          </Badge>
        </div>

        {/* Estimated Time */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Estimated Time
          </p>
          <p className="text-lg font-semibold">
            {analysis.estimatedTimeHours} hours
          </p>
        </div>

        {/* Required Skills */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Required Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.requiredSkills.map((skill, idx) => (
              <Badge key={idx} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        {analysis.prerequisites.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              Prerequisites
            </p>
            <ul className="list-disc list-inside space-y-1">
              {analysis.prerequisites.map((prereq, idx) => (
                <li key={idx} className="text-sm text-gray-700">
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Deliverables */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">
            Deliverables
          </p>
          <ul className="space-y-2">
            {analysis.deliverables.map((deliverable, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    deliverable.required ? "text-red-500" : "text-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-700">
                  {deliverable.label}
                  {deliverable.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Success Criteria */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">
            Success Criteria
          </p>
          <ul className="space-y-1">
            {analysis.successCriteria.map((criterion, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sm text-gray-700 leading-relaxed">
                  • {criterion}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
