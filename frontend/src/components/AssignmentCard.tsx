import { Clock, Award, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

interface AssignmentCardProps {
  id: string;
  title: string;
  course: string;
  courseColor: string;
  description: string;
  dueDate: string;
  daysUntilDue: number;
  points: number;
  isCompleted?: boolean;
  submissionStatus?: string;
  submissionScore?: number | null;
  submissionGrade?: string | null;
}

const AssignmentCard = ({
  id,
  title,
  course,
  courseColor,
  description,
  dueDate,
  daysUntilDue,
  points,
  isCompleted = false,
  submissionStatus,
  submissionScore,
  submissionGrade,
}: AssignmentCardProps) => {
  const navigate = useNavigate();
  const isPast = daysUntilDue < 0;
  const isUrgent = !isPast && daysUntilDue <= 2;
  const isOverdue = isPast && !isCompleted;

  const handleAssignmentClick = () => {
    navigate('/astar', { 
      state: { 
        assignment: {
          id,
          title,
          course,
          courseColor,
          description,
          dueDate,
          daysUntilDue,
          points,
          isCompleted,
          submissionStatus,
          submissionScore,
          submissionGrade
        }
      }
    });
  };

  return (
    <div
      className={`bg-card border border-border rounded-xl p-6 transition-all ${
        isUrgent ? "shadow-urgent" : ""
      } ${isOverdue ? "opacity-90 border-destructive/30" : ""} hover:border-primary/30`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`text-xl font-bold ${isOverdue ? "text-muted-foreground" : "text-foreground"}`}>
              {title}
            </h3>
            {isCompleted && (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: courseColor }}
            />
            <span className="text-sm text-muted-foreground font-medium">
              {course}
            </span>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {description}
      </p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {isCompleted ? (
          <>
            <button
              onClick={handleAssignmentClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer group/pill"
              title="Reopen in ASTAR"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="group-hover/pill:hidden">Completed</span>
              <span className="hidden group-hover/pill:inline">Reopen in ASTAR</span>
            </button>
            {(submissionScore !== null && submissionScore !== undefined) || submissionGrade ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Award className="w-3.5 h-3.5" />
                {submissionGrade || (submissionScore !== null ? `${submissionScore}/${points}` : `${points} pts`)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Award className="w-3.5 h-3.5" />
                {points} pts
              </span>
            )}
          </>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isOverdue
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : isUrgent
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {isOverdue
                ? `Overdue ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "day" : "days"} ago`
                : `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Award className="w-3.5 h-3.5" />
              {points} pts
            </span>
          </>
        )}
      </div>

      {!isCompleted && (
        <Button
          onClick={handleAssignmentClick}
          className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          Start with ASTAR
        </Button>
      )}
    </div>
  );
};

export default AssignmentCard;
