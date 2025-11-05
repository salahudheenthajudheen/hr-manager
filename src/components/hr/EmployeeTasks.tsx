import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, Clock, AlertCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmployeeTasksProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

interface Task {
  id: string;  // UUID stored as string
  title: string;
  description: string;
  status: "pending" | "completed" | "accepted" | "rejected";
  due_date: string;
  priority: "low" | "medium" | "high";
  rejection_note?: string;
  created_at: string;
}

const EmployeeTasks = ({ onNavigate }: EmployeeTasksProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks for the logged-in employee
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['employee-tasks', employee?.employee_id],
    queryFn: async () => {
      if (!employee?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employee.employee_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!employee?.employee_id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Mutation to mark task as completed
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      toast({
        title: "Task Completed",
        description: "Task has been marked as completed and sent for review",
      });
    },
    onError: (error) => {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  });

  const handleTaskComplete = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50">
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Employee information not found. Please log in again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(task => task.status === "pending");
  const completedTasks = tasks.filter(task => task.status === "completed");
  const acceptedTasks = tasks.filter(task => task.status === "accepted");
  const rejectedTasks = tasks.filter(task => task.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate("home")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold">My Tasks</h1>
              <p className="text-muted-foreground">{employee.name} ({employee.employee_id})</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        )}

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{pendingTasks.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{completedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{acceptedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Accepted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{rejectedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Pending Tasks</h2>
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <Card key={task.id} className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleTaskComplete(task.id)}
                              disabled={completeTaskMutation.isPending}
                            />
                            <h3 className="font-semibold">{task.title}</h3>
                          </div>
                          <p className="text-muted-foreground mb-3">{task.description}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1 capitalize">{task.status}</span>
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Tasks */}
          {rejectedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Rejected Tasks (Needs Revision)</h2>
              <div className="space-y-4">
                {rejectedTasks.map((task) => (
                  <Card key={task.id} className="card-hover border-destructive/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleTaskComplete(task.id)}
                              disabled={completeTaskMutation.isPending}
                            />
                            <h3 className="font-semibold">{task.title}</h3>
                          </div>
                          <p className="text-muted-foreground mb-3">{task.description}</p>
                          {task.rejection_note && (
                            <Alert className="mb-3 border-destructive/30">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-destructive">
                                <strong>Revision needed:</strong> {task.rejection_note}
                              </AlertDescription>
                            </Alert>
                          )}
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1 capitalize">{task.status}</span>
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {(completedTasks.length > 0 || acceptedTasks.length > 0) && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
              <div className="space-y-4">
                {[...completedTasks, ...acceptedTasks].map((task) => (
                  <Card key={task.id} className="opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Checkbox checked={true} disabled />
                            <h3 className="font-semibold">{task.title}</h3>
                          </div>
                          <p className="text-muted-foreground mb-3">{task.description}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1 capitalize">{task.status}</span>
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tasks Assigned</h3>
                <p className="text-muted-foreground">
                  You currently have no tasks assigned. Check back later for new assignments.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeTasks;