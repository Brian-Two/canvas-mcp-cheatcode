import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, Calendar } from "lucide-react";
import AssignmentCard from "@/components/AssignmentCard";
import { getAssignments, Assignment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Board = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAssignments(true); // Include past assignments
      setAssignments(data);
      
      if (data.length === 0) {
        toast({
          title: "No Assignments Found",
          description: "You don't have any assignments in Canvas",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assignments';
      setError(errorMessage);
      console.error('Error fetching assignments:', err);
      
      toast({
        title: "Failed to Load Assignments",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Separate assignments into completed, past (not completed), and upcoming (not completed)
  const completedAssignments = assignments.filter(a => a.isCompleted === true);
  const notCompletedAssignments = assignments.filter(a => !a.isCompleted);
  
  const upcomingAssignments = notCompletedAssignments.filter(a => a.daysUntilDue >= 0);
  const pastAssignments = notCompletedAssignments.filter(a => a.daysUntilDue < 0);
  
  // Sort upcoming by days until due (ascending)
  const sortedUpcoming = [...upcomingAssignments].sort(
    (a, b) => a.daysUntilDue - b.daysUntilDue
  );
  
  // Sort past by days until due (ascending, so most recent past first)
  const sortedPast = [...pastAssignments].sort(
    (a, b) => b.daysUntilDue - a.daysUntilDue
  );
  
  // Sort completed by due date (most recent first)
  const sortedCompleted = [...completedAssignments].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold">Your Board</h1>
        </div>
        {!isLoading && !error && (
          <p className="text-muted-foreground">
            {upcomingAssignments.length} upcoming, {pastAssignments.length} past, {completedAssignments.length} completed assignment{completedAssignments.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Assignments List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Assignments</h2>
            <p className="text-muted-foreground">Fetching your assignments from Canvas...</p>
          </div>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Failed to Load</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
            >
              Try Again
            </button>
          </div>
        ) : sortedUpcoming.length > 0 || sortedPast.length > 0 || sortedCompleted.length > 0 ? (
          // Assignments List - Three Column Layout
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Past Assignments Section - Left Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-2xl font-bold text-muted-foreground">Past Assignments</h2>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  {sortedPast.length}
                </span>
              </div>
              {sortedPast.length > 0 ? (
                <div className="space-y-4">
                  {sortedPast.map((assignment) => (
                    <AssignmentCard key={assignment.id} {...assignment} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Calendar className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No past assignments</p>
                </div>
              )}
            </div>

            {/* Upcoming Assignments Section - Middle Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Upcoming Assignments</h2>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {sortedUpcoming.length}
                </span>
              </div>
              {sortedUpcoming.length > 0 ? (
                <div className="space-y-4">
                  {sortedUpcoming.map((assignment) => (
                    <AssignmentCard key={assignment.id} {...assignment} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-primary/5 rounded-xl border border-dashed border-primary/20">
                  <Sparkles className="w-8 h-8 text-primary/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming assignments</p>
                </div>
              )}
            </div>

            {/* Completed Assignments Section - Right Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-primary">Completed</h2>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {sortedCompleted.length}
                </span>
              </div>
              {sortedCompleted.length > 0 ? (
                <div className="space-y-4">
                  {sortedCompleted.map((assignment) => (
                    <AssignmentCard key={assignment.id} {...assignment} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Sparkles className="w-8 h-8 text-primary/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No completed assignments</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">🎉 All caught up!</h2>
            <p className="text-muted-foreground">No assignments found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;
