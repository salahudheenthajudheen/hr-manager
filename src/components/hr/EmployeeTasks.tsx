import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, Clock, AlertCircle, User, Play, Pause, Archive, Eye, ExternalLink, Upload, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface EmployeeTasksProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

interface Task {
  id: string;  // UUID stored as string
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed" | "shelved" | "accepted" | "rejected";
  due_date: string;
  priority: "low" | "medium" | "high";
  rejection_note?: string;
  created_at: string;
  created_by: string;
  creator_name?: string;
  reference_materials?: string;
  delivery_location?: string;
  completion_notes?: string;
  auto_reassigned?: boolean;
  reassignment_count?: number;
  employee_references?: string;
  employee_photos?: string[];  // Array of photo URLs
}

const EmployeeTasks = ({ onNavigate }: EmployeeTasksProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskForReferences, setSelectedTaskForReferences] = useState<Task | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [employeeReferences, setEmployeeReferences] = useState("");
  const [showAddReferenceDialog, setShowAddReferenceDialog] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch tasks for the logged-in employee
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['employee-tasks', employee?.employee_id],
    queryFn: async () => {
      if (!employee?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:employees!tasks_created_by_fkey(name)
        `)
        .eq('assigned_to', employee.employee_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(task => ({
        ...task,
        creator_name: task.creator?.name || 'Unknown'
      })) as Task[];
    },
    enabled: !!employee?.employee_id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Mutation to update task status
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: string; notes?: string }) => {
      const updateData: any = { status };
      
      // If marking as completed, add completion notes
      if (status === 'completed' && notes) {
        updateData.completion_notes = notes;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] }); // Also refresh admin view
      setCompletionNotes("");
      setSelectedTask(null);
      toast({
        title: "Status Updated",
        description: "Task status has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    // If marking as completed, open dialog for notes
    if (newStatus === 'completed') {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        return;
      }
    }
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const handleCompleteTask = () => {
    if (selectedTask) {
      updateTaskStatusMutation.mutate({ 
        taskId: selectedTask.id, 
        status: 'completed',
        notes: completionNotes 
      });
    }
  };

  // Mutation to update employee references
  const updateReferencesMutation = useMutation({
    mutationFn: async ({ taskId, references, photos }: { taskId: string; references: string; photos: string[] }) => {
      console.log('Saving references:', { taskId, references, photosCount: photos.length });
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          employee_references: references,
          employee_photos: photos 
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Save successful:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      
      // Clear state after successful save
      setEmployeeReferences("");
      setUploadedPhotos([]);
      setSelectedTaskForReferences(null);
      setShowAddReferenceDialog(false);
      
      toast({
        title: "References Updated",
        description: "Your references and photos have been saved successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error updating references:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update references. Check console for details.",
        variant: "destructive"
      });
    }
  });

  const handleAddReferences = (task: Task) => {
    console.log('Opening reference dialog for task:', task.id);
    setSelectedTaskForReferences(task);
    setEmployeeReferences(task.employee_references || "");
    setUploadedPhotos(task.employee_photos || []);
    setShowAddReferenceDialog(true);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Max size is 5MB.`);
        }

        // Convert to base64
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      });

      const base64Urls = await Promise.all(uploadPromises);
      setUploadedPhotos([...uploadedPhotos, ...base64Urls]);
      
      // Reset file input
      event.target.value = '';
      
      toast({
        title: "Photos Uploaded",
        description: `${base64Urls.length} photo(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error("Error uploading photos:", error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (photoUrl: string) => {
    setUploadedPhotos(uploadedPhotos.filter(url => url !== photoUrl));
  };

  const handleCloseReferenceDialog = () => {
    setShowAddReferenceDialog(false);
    setSelectedTaskForReferences(null);
    setEmployeeReferences("");
    setUploadedPhotos([]);
  };

  const handleSaveReferences = () => {
    console.log('handleSaveReferences called', { 
      selectedTaskForReferences: selectedTaskForReferences?.id, 
      referencesLength: employeeReferences.length,
      photosCount: uploadedPhotos.length 
    });
    
    if (selectedTaskForReferences) {
      updateReferencesMutation.mutate({
        taskId: selectedTaskForReferences.id,
        references: employeeReferences,
        photos: uploadedPhotos
      });
    } else {
      console.error('No selected task!');
      toast({
        title: "Error",
        description: "No task selected. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "bg-gray-100 text-gray-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "shelved": return "bg-orange-100 text-orange-800";
      case "accepted": return "bg-emerald-100 text-emerald-800";
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
      case "not_started": return <Clock className="h-4 w-4" />;
      case "in_progress": return <Play className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "shelved": return <Archive className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "not_started": return "Not Started";
      case "in_progress": return "In Progress";
      case "completed": return "Completed";
      case "shelved": return "Shelved";
      case "accepted": return "Accepted";
      case "rejected": return "Rejected";
      default: return status;
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

  const activeTasks = tasks.filter(task => 
    task.status === "not_started" || 
    task.status === "in_progress" ||
    task.status === "shelved"
  );
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
              <div className="text-2xl font-bold text-primary">{activeTasks.length}</div>
              <div className="text-sm text-muted-foreground">Active Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{completedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Awaiting Review</div>
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
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <Card key={task.id} className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                          <p className="text-muted-foreground mb-3">{task.description}</p>
                          
                          {/* Task Details */}
                          <div className="space-y-2 mb-4 text-sm">
                            {task.creator_name && (
                              <div className="flex items-center text-muted-foreground">
                                <User className="h-3 w-3 mr-2" />
                                <span>Assigned by: <strong>{task.creator_name}</strong></span>
                              </div>
                            )}
                            {task.reference_materials && (
                              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                <div className="flex items-start">
                                  <ExternalLink className="h-4 w-4 mr-2 mt-0.5 text-blue-600" />
                                  <div>
                                    <p className="font-medium text-blue-900 mb-1">Admin's Reference Materials:</p>
                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{task.reference_materials}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {task.employee_references && (
                              <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                <div className="flex items-start">
                                  <ExternalLink className="h-4 w-4 mr-2 mt-0.5 text-purple-600" />
                                  <div className="flex-1">
                                    <p className="font-medium text-purple-900 mb-1">My References:</p>
                                    <p className="text-sm text-purple-800 whitespace-pre-wrap">{task.employee_references}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleAddReferences(task)}
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            )}
                            {task.employee_photos && task.employee_photos.length > 0 && (
                              <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                <div className="flex items-start">
                                  <ImageIcon className="h-4 w-4 mr-2 mt-0.5 text-purple-600" />
                                  <div className="flex-1">
                                    <p className="font-medium text-purple-900 mb-2">My Uploaded Photos:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {task.employee_photos.map((photoUrl, index) => (
                                        <a 
                                          key={index}
                                          href={photoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="relative group rounded-md overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition-colors"
                                        >
                                          <img 
                                            src={photoUrl} 
                                            alt={`Reference ${index + 1}`}
                                            className="w-full h-24 object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                                            <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleAddReferences(task)}
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            )}
                            {!task.employee_references && (!task.employee_photos || task.employee_photos.length === 0) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddReferences(task)}
                                className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Add Your References/Links/Photos
                              </Button>
                            )}
                            {task.delivery_location && (
                              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                                <p className="text-sm">
                                  <strong className="text-green-900">Deliver to:</strong>{' '}
                                  <span className="text-green-800">{task.delivery_location}</span>
                                </p>
                              </div>
                            )}
                            {task.auto_reassigned && task.reassignment_count && (
                              <Alert className="border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                  <strong>Needs Revision:</strong> This task has been reassigned {task.reassignment_count} time(s)
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-[180px]">
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Task Status
                          </label>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value)}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  Not Started
                                </div>
                              </SelectItem>
                              <SelectItem value="in_progress">
                                <div className="flex items-center">
                                  <Play className="h-4 w-4 mr-2" />
                                  In Progress
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Completed
                                </div>
                              </SelectItem>
                              <SelectItem value="shelved">
                                <div className="flex items-center">
                                  <Archive className="h-4 w-4 mr-2" />
                                  Shelved
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                          <p className="text-muted-foreground mb-3">{task.description}</p>
                          {task.rejection_note && (
                            <Alert className="mb-4 border-destructive/30">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-destructive">
                                <strong>Revision needed:</strong> {task.rejection_note}
                              </AlertDescription>
                            </Alert>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-[180px]">
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Task Status
                          </label>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value)}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  Not Started
                                </div>
                              </SelectItem>
                              <SelectItem value="in_progress">
                                <div className="flex items-center">
                                  <Play className="h-4 w-4 mr-2" />
                                  In Progress
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Completed
                                </div>
                              </SelectItem>
                              <SelectItem value="shelved">
                                <div className="flex items-center">
                                  <Archive className="h-4 w-4 mr-2" />
                                  Shelved
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed/Accepted Tasks */}
          {(completedTasks.length > 0 || acceptedTasks.length > 0) && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Finished Tasks</h2>
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
                              <span className="ml-1">{getStatusLabel(task.status)}</span>
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

      {/* Add/Edit Employee References Dialog */}
      <Dialog open={showAddReferenceDialog} onOpenChange={(open) => {
        if (!open) {
          handleCloseReferenceDialog();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Your References, Links & Photos</DialogTitle>
            <DialogDescription>
              Add helpful links, documents, reference materials, or upload photos you're using for this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Text References */}
            <div>
              <Label htmlFor="employee-references">Text References & Links</Label>
              <Textarea
                id="employee-references"
                value={employeeReferences}
                onChange={(e) => setEmployeeReferences(e.target.value)}
                placeholder="Add links, documents, or notes here...&#10;Example:&#10;- Research document: https://example.com/doc&#10;- Reference code: https://github.com/...&#10;- Tutorial: https://youtube.com/..."
                rows={6}
                className="mt-1 font-mono text-sm"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label htmlFor="photo-upload">Upload Photos</Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    disabled={uploadingPhoto}
                    className="w-full border-dashed"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingPhoto ? "Uploading..." : "Choose Photos to Upload"}
                  </Button>
                </div>

                {/* Uploaded Photos Preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    {uploadedPhotos.map((photoUrl, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={photoUrl} 
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md border-2 border-purple-200"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(photoUrl)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <a
                          href={photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-1 right-1 bg-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4 text-purple-600" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPG, PNG, GIF, etc. You can upload multiple photos at once.
              </p>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p><strong>Tip:</strong> These references and photos will be visible to you and the admin. You can update them anytime while working on the task.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseReferenceDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveReferences}
              disabled={updateReferencesMutation.isPending}
              className="gradient-primary text-white"
            >
              {updateReferencesMutation.isPending ? "Saving..." : "Save References & Photos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Notes Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Add notes about your completed work (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completion-notes">Completion Notes</Label>
              <Textarea
                id="completion-notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe what you did, any challenges faced, or additional information..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              These notes will be visible to the admin reviewing your work.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteTask}
              disabled={updateTaskStatusMutation.isPending}
              className="gradient-primary text-white"
            >
              {updateTaskStatusMutation.isPending ? "Completing..." : "Mark as Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeTasks;