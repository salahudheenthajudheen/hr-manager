import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Download,
  FileText,
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminLeaveRequestsProps {
  onBack: () => void;
}

interface LeaveRequest {
  id: string;  // UUID stored as string
  employee_id: string;
  employee_name?: string;
  leave_type: string;
  subject: string;
  description: string;
  from_date: string;
  to_date: string;
  status: "pending" | "approved" | "rejected";
  has_document: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

const AdminLeaveRequests = ({ onBack }: AdminLeaveRequestsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const { toast } = useToast();
  const { employee } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all leave requests with employee names
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees!leave_requests_employee_id_fkey (
            name,
            employee_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include employee name
      return (data || []).map(request => ({
        ...request,
        employee_name: request.employees?.name || 'Unknown Employee',
        employee_id: request.employees?.employee_id || request.employee_id
      })) as LeaveRequest[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Approve leave mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: employee?.employee_id,
          approved_at: new Date().toISOString(),
          rejection_reason: comment || null
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      setReviewComment("");
      setSelectedRequest(null);
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error approving leave:", error);
      toast({
        title: "Error",
        description: "Failed to approve leave request",
        variant: "destructive"
      });
    }
  });

  // Reject leave mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!reason.trim()) {
        throw new Error("Rejection reason is required");
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: employee?.employee_id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      setReviewComment("");
      setSelectedRequest(null);
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected.",
        variant: "destructive"
      });
    },
    onError: (error: any) => {
      console.error("Error rejecting leave:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject leave request",
        variant: "destructive"
      });
    }
  });

  // Edit leave mutation (for changing status after approval/rejection)
  const editStatusMutation = useMutation({
    mutationFn: async ({ requestId, newStatus, comment }: { requestId: string; newStatus: string; comment?: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: newStatus,
          approved_by: employee?.employee_id,
          approved_at: new Date().toISOString(),
          rejection_reason: comment || null
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      setReviewComment("");
      setSelectedRequest(null);
      toast({
        title: "Status Updated",
        description: "Leave request status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating leave status:", error);
      toast({
        title: "Error",
        description: "Failed to update leave status",
        variant: "destructive"
      });
    }
  });

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = (request.employee_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         request.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.leave_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getLeaveTypeColor = (leaveType: string) => {
    const type = leaveType.toLowerCase();
    if (type.includes('annual')) return "bg-blue-100 text-blue-800";
    if (type.includes('sick')) return "bg-red-100 text-red-800";
    if (type.includes('casual')) return "bg-green-100 text-green-800";
    if (type.includes('maternity') || type.includes('paternity')) return "bg-pink-100 text-pink-800";
    return "bg-gray-100 text-gray-800";
  };

  const calculateDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApproveRequest = (requestId: string) => {
    approveMutation.mutate({ requestId, comment: reviewComment });
  };

  const handleRejectRequest = (requestId: string) => {
    if (!reviewComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }
    rejectMutation.mutate({ requestId, reason: reviewComment });
  };

  const leaveStats = {
    pending: leaveRequests.filter(r => r.status === "pending").length,
    approved: leaveRequests.filter(r => r.status === "approved").length,
    rejected: leaveRequests.filter(r => r.status === "rejected").length,
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
            <h1 className="text-3xl font-bold">Leave Request Management</h1>
            <p className="text-muted-foreground">Review and manage employee leave requests</p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold text-warning">{leaveStats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold text-success">{leaveStats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <div className="text-2xl font-bold text-destructive">{leaveStats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
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
                placeholder="Search leave requests..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} of {leaveRequests.length} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading leave requests...</p>
            </div>
          )}
          
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const days = calculateDays(request.from_date, request.to_date);
              
              return (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="gradient-primary text-white">
                          {(request.employee_name || 'U').split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="font-semibold">{request.employee_name}</h3>
                          <Badge variant="secondary" className="text-xs">{request.employee_id}</Badge>
                          <Badge className={getLeaveTypeColor(request.leave_type)}>
                            {request.leave_type}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1 capitalize">{request.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(request.from_date), "MMM dd")} - {format(new Date(request.to_date), "MMM dd, yyyy")}
                            </div>
                            <span>({days} days)</span>
                          </div>
                          <p><strong>Subject:</strong> {request.subject}</p>
                          {request.description && (
                            <p><strong>Description:</strong> {request.description}</p>
                          )}
                          <p>Applied on {format(new Date(request.created_at), "MMM dd, yyyy")}</p>
                          {request.approved_at && (
                            <p>Reviewed by {request.approved_by} on {format(new Date(request.approved_at), "MMM dd, yyyy")}</p>
                          )}
                          {request.rejection_reason && (
                            <div className="bg-muted/50 p-2 rounded text-sm">
                              <strong>Comments:</strong> {request.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Leave Request Details</DialogTitle>
                            <DialogDescription>
                              Review and manage leave request for {request.employee_name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedRequest && selectedRequest.id === request.id && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Employee</label>
                                  <p>{selectedRequest.employee_name} ({selectedRequest.employee_id})</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Leave Type</label>
                                  <p>{selectedRequest.leave_type}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Duration</label>
                                  <p>{format(new Date(selectedRequest.from_date), "MMM dd")} - {format(new Date(selectedRequest.to_date), "MMM dd, yyyy")} ({calculateDays(selectedRequest.from_date, selectedRequest.to_date)} days)</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Badge className={getStatusColor(selectedRequest.status)}>
                                    {getStatusIcon(selectedRequest.status)}
                                    <span className="ml-1 capitalize">{selectedRequest.status}</span>
                                  </Badge>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Subject</label>
                                <p>{selectedRequest.subject}</p>
                              </div>
                              
                              {selectedRequest.description && (
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <p>{selectedRequest.description}</p>
                                </div>
                              )}

                              {selectedRequest.has_document && (
                                <div className="bg-blue-50 p-3 rounded flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="text-sm">Supporting document attached</span>
                                </div>
                              )}

                              {selectedRequest.status === "pending" && (
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium">Review Comments</label>
                                    <Textarea
                                      value={reviewComment}
                                      onChange={(e) => setReviewComment(e.target.value)}
                                      placeholder="Add your comments for this review..."
                                      className="mt-1"
                                    />
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => handleApproveRequest(selectedRequest.id)}
                                      className="gradient-primary text-white"
                                      disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button 
                                      onClick={() => handleRejectRequest(selectedRequest.id)}
                                      variant="destructive"
                                      disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {selectedRequest.rejection_reason && (
                                <div className="bg-muted/50 p-3 rounded">
                                  <div className="flex items-center mb-2">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    <span className="font-medium">Review Comments</span>
                                  </div>
                                  <p>{selectedRequest.rejection_reason}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {request.status === "pending" && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedRequest(request);
                              setReviewComment("Leave request approved.");
                              handleApproveRequest(request.id);
                            }}
                            className="text-success border-success hover:bg-success/10"
                            variant="outline"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                variant="outline"
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Leave Request</DialogTitle>
                                <DialogDescription>
                                  Please provide a reason for rejecting this leave request
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="Enter rejection reason..."
                                  rows={3}
                                />
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setReviewComment("")}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    variant="destructive"
                                    onClick={() => handleRejectRequest(request.id)}
                                    disabled={!reviewComment.trim() || rejectMutation.isPending}
                                  >
                                    Reject Request
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {(request.status === "approved" || request.status === "rejected") && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedRequest(request)}
                              className="text-primary border-primary hover:bg-primary/10"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Leave Request Status</DialogTitle>
                              <DialogDescription>
                                Change the status of this leave request
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Current Status:</label>
                                <Badge className={`${getStatusColor(request.status)} ml-2`}>
                                  {request.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Change To:</label>
                                <div className="flex gap-2 mt-2">
                                  {request.status !== "approved" && (
                                    <Button 
                                      onClick={() => {
                                        editStatusMutation.mutate({ 
                                          requestId: request.id, 
                                          newStatus: 'approved',
                                          comment: reviewComment || 'Status changed to approved'
                                        });
                                      }}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                      disabled={editStatusMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                  )}
                                  {request.status !== "rejected" && (
                                    <Button 
                                      variant="destructive"
                                      className="flex-1"
                                      onClick={() => {
                                        if (!reviewComment.trim()) {
                                          toast({
                                            title: "Comment Required",
                                            description: "Please provide a reason for rejection",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        editStatusMutation.mutate({ 
                                          requestId: request.id, 
                                          newStatus: 'rejected',
                                          comment: reviewComment
                                        });
                                      }}
                                      disabled={editStatusMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      editStatusMutation.mutate({ 
                                        requestId: request.id, 
                                        newStatus: 'pending',
                                        comment: reviewComment || 'Status reset to pending'
                                      });
                                    }}
                                    disabled={editStatusMutation.isPending}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Reset to Pending
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Comment (required for rejection):</label>
                                <Textarea
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="Add comment for status change..."
                                  rows={3}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!isLoading && filteredRequests.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Leave Requests Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters"
                    : "No leave requests have been submitted yet"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeaveRequests;