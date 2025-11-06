import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ApplyLeaveProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

interface LeaveFormData {
  leaveType: string;
  subject: string;
  description: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  document: File | null;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
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

const ApplyLeave = ({ onNavigate }: ApplyLeaveProps) => {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: "",
    subject: "",
    description: "",
    fromDate: undefined,
    toDate: undefined,
    document: null
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employee's leave requests
  const { data: leaveRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['my-leave-requests', employee?.employee_id],
    queryFn: async () => {
      if (!employee?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.employee_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!employee?.employee_id,
    refetchInterval: 10000, // Refresh every 10 seconds to see updates
  });

  const leaveTypes = [
    { value: "annual", label: "Annual Leave" },
    { value: "casual", label: "Casual Leave" }, 
    { value: "sick", label: "Sick Leave" },
    { value: "maternity", label: "Maternity Leave" },
    { value: "paternity", label: "Paternity Leave" },
    { value: "unpaid", label: "Unpaid Leave" }
  ];

  const handleSubmitLeave = async () => {
    if (!formData.leaveType || !formData.subject || !formData.fromDate || !formData.toDate) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!employee) {
      setMessage({ type: "error", text: "Employee information not found" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: employee.employee_id,
          leave_type: formData.leaveType,
          subject: formData.subject,
          description: formData.description || '',
          from_date: formData.fromDate.toISOString().split('T')[0],
          to_date: formData.toDate.toISOString().split('T')[0],
          has_document: !!formData.document,
          status: 'pending'
        });

      if (error) throw error;

      setMessage({ type: "success", text: "Leave application submitted successfully!" });
      toast({
        title: "Success",
        description: "Your leave application has been submitted for approval",
      });
      
      // Invalidate and refetch leave requests
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      
      // Reset form
      setFormData({
        leaveType: "",
        subject: "",
        description: "",
        fromDate: undefined,
        toDate: undefined,
        document: null
      });
    } catch (error) {
      console.error("Error submitting leave:", error);
      setMessage({ type: "error", text: "Failed to submit leave application. Please try again." });
      toast({
        title: "Error",
        description: "Failed to submit leave application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, document: file }));
    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} has been selected`,
      });
    }
  };

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

  const calculateDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate("home")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground">{employee?.name} ({employee?.employee_id})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Apply Leave Form */}
          <Card>
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
              <CardDescription>
                Fill in the details for your leave request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select value={formData.leaveType} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, leaveType: value }))
                }>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief reason for leave"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description (optional)"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>From Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !formData.fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate ? format(formData.fromDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, fromDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>To Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !formData.toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.toDate ? format(formData.toDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.toDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, toDate: date }))}
                        initialFocus
                        disabled={(date) => formData.fromDate ? date < formData.fromDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="document">Supporting Document (Optional)</Label>
                <div className="mt-1">
                  <Input
                    id="document"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                  />
                  {formData.document && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {formData.document.name}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSubmitLeave}
                disabled={loading}
                className="w-full gradient-primary text-white"
              >
                {loading ? "Submitting..." : "Submit Leave Application"}
              </Button>

              {message && (
                <Alert className={`animate-slide-up ${message.type === 'success' ? 'border-success' : 'border-destructive'}`}>
                  <AlertDescription className={message.type === 'success' ? 'text-success' : 'text-destructive'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Leave Request History */}
          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
              <CardDescription>
                View your submitted leave requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading your leave requests...
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No leave requests submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {leaveRequests.map((request) => {
                    const days = calculateDays(request.from_date, request.to_date);
                    
                    return (
                      <div 
                        key={request.id} 
                        className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="capitalize">{request.leave_type.replace('_', ' ')}</Badge>
                              <Badge className={getStatusColor(request.status)}>
                                {getStatusIcon(request.status)}
                                <span className="ml-1 capitalize">{request.status}</span>
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{request.subject}</h4>
                          </div>
                        </div>

                        <div className="text-sm space-y-1">
                          <div className="flex items-center text-muted-foreground">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(new Date(request.from_date), "MMM dd")} - {format(new Date(request.to_date), "MMM dd, yyyy")}
                            <span className="ml-2">({days} days)</span>
                          </div>
                          
                          {request.description && (
                            <p className="text-muted-foreground">
                              <strong>Description:</strong> {request.description}
                            </p>
                          )}
                          
                          <p className="text-muted-foreground text-xs">
                            Applied on {format(new Date(request.created_at), "MMM dd, yyyy 'at' HH:mm")}
                          </p>

                          {request.approved_at && (
                            <p className="text-muted-foreground text-xs">
                              {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.approved_by} on {format(new Date(request.approved_at), "MMM dd, yyyy")}
                            </p>
                          )}

                          {request.rejection_reason && (
                            <div className="bg-muted/50 p-2 rounded mt-2">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium">Admin Comments:</p>
                                  <p className="text-xs text-muted-foreground">{request.rejection_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
