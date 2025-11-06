import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Edit,
  Trash2,
  MessageSquare
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminTasksProps {
  onBack: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_employee_name?: string;
  created_by: string;
  creator_name?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "completed" | "shelved" | "accepted" | "rejected";
  due_date: string;
  completed_at?: string;
  created_at: string;
  rejection_note?: string;
}

interface NewTask {
  title: string;
  description: string;
  assigned_to: string;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: Date | undefined;
}

interface Employee {
  employee_id: string;
  name: string;
}

const AdminTasks = ({ onBack }: AdminTasksProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const { toast } = useToast();
  const { employee } = useAuth();
  const queryClient = useQueryClient();

  const [newTask, setNewTask] = useState<NewTask>({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    due_date: undefined
  });

  // Fetch all employees for assignment dropdown
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch all tasks with employee names
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['admin-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned:employees!tasks_assigned_to_fkey(name),
          creator:employees!tasks_created_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(task => ({
        ...task,
        assigned_employee_name: task.assigned?.name || 'Unknown',
        creator_name: task.creator?.name || 'Unknown'
      }));
    },
    refetchInterval: 30000,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: NewTask) => {
      if (!employee?.employee_id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          created_by: employee.employee_id,
          due_date: task.due_date ? format(task.due_date, 'yyyy-MM-dd') : null,
          priority: task.priority,
          status: 'not_started'
        })
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message || "Failed to create task");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        due_date: undefined
      });
      toast({
        title: "Task Created",
        description: "Task has been assigned successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating task:", error);
      toast({
        title: "Error Creating Task",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.assigned_employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "bg-gray-100 text-gray-800 border-gray-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "accepted": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      case "shelved": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not_started": return <Clock className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      case "shelved": return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleCreateTask = () => {
    // Validate required fields
    if (!newTask.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a task title",
        variant: "destructive"
      });
      return;
    }

    if (!newTask.assigned_to) {
      toast({
        title: "Validation Error",
        description: "Please select an employee to assign the task to",
        variant: "destructive"
      });
      return;
    }

    if (!newTask.due_date) {
      toast({
        title: "Validation Error",
        description: "Please select a due date",
        variant: "destructive"
      });
      return;
    }

    createTaskMutation.mutate(newTask);
  };

  const taskStats = {
    not_started: tasks.filter(t => t.status === "not_started").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    shelved: tasks.filter(t => t.status === "shelved").length,
    accepted: tasks.filter(t => t.status === "accepted").length,
    rejected: tasks.filter(t => t.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Task Management</h1>
            <p className="text-muted-foreground">Assign and manage employee tasks</p>
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a new task to an employee
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="taskDescription">Description</Label>
                <Textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign To *</Label>
                  <Select value={newTask.assigned_to} onValueChange={(value) => 
                    setNewTask(prev => ({ ...prev, assigned_to: value }))
                  }>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.employee_id} value={employee.employee_id}>
                          {employee.name} ({employee.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                    setNewTask(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !newTask.due_date && "text-muted-foreground"
                      )}
                    >
                      {newTask.due_date ? format(newTask.due_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newTask.due_date}
                      onSelect={(date) => setNewTask(prev => ({ ...prev, due_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTask} 
                  className="gradient-primary text-white"
                  disabled={!newTask.title || !newTask.assigned_to || !newTask.due_date || createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-gray-600 mb-2" />
            <div className="text-xl font-bold text-gray-600">{taskStats.not_started}</div>
            <div className="text-xs text-muted-foreground">Not Started</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <div className="text-xl font-bold text-blue-600">{taskStats.in_progress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <div className="text-xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-xs text-muted-foreground">Awaiting Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
            <div className="text-xl font-bold text-emerald-600">{taskStats.accepted}</div>
            <div className="text-xs text-muted-foreground">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
            <div className="text-xl font-bold text-red-600">{taskStats.rejected}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <div className="text-xl font-bold text-orange-600">{taskStats.shelved}</div>
            <div className="text-xs text-muted-foreground">Shelved</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="shelved">Shelved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>
            {filteredTasks.length} of {tasks.length} tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="gradient-primary text-white">
                        {(task.assigned_employee_name || '').split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Assigned to:</strong> {task.assigned_employee_name}</p>
                        <p><strong>Due:</strong> {format(new Date(task.due_date), "MMM dd, yyyy")}</p>
                        <p><strong>Created:</strong> {format(new Date(task.created_at), "MMM dd, yyyy")}</p>
                        {task.completed_at && (
                          <p><strong>Completed:</strong> {format(new Date(task.completed_at), "MMM dd, yyyy")}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTask(task)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Task Details</DialogTitle>
                          <DialogDescription>
                            Review and manage task for {task.assigned_employee_name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedTask && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Assigned To</label>
                                <p>{selectedTask.assigned_employee_name}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Priority</label>
                                <Badge className={getPriorityColor(selectedTask.priority)}>
                                  {selectedTask.priority.toUpperCase()}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <Badge className={getStatusColor(selectedTask.status)}>
                                  {getStatusIcon(selectedTask.status)}
                                  <span className="ml-1 capitalize">{selectedTask.status.replace('_', ' ')}</span>
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Due Date</label>
                                <p>{format(new Date(selectedTask.due_date), "MMM dd, yyyy")}</p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <p>{selectedTask.title}</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Description</label>
                              <p>{selectedTask.description}</p>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTasks;