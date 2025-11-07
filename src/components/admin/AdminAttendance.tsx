import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle,
  CalendarIcon,
  MapPin,
  Filter,
  Edit
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminAttendanceProps {
  onBack: () => void;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "present" | "absent" | "late" | "on_leave";
  location_lat?: number | null;
  location_lng?: number | null;
  check_out_location_lat?: number | null;
  check_out_location_lng?: number | null;
  method?: string;
}

const AdminAttendance = ({ onBack }: AdminAttendanceProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  // Get local date in YYYY-MM-DD format using device timezone
  const getLocalDate = (date: Date = new Date()) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch attendance records for selected date
  const { data: attendanceRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['admin-attendance', getLocalDate(selectedDate)],
    queryFn: async () => {
      const dateStr = getLocalDate(selectedDate);
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!attendance_employee_id_fkey(name, employee_id)
        `)
        .eq('date', dateStr)
        .order('check_in_time', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(record => ({
        ...record,
        employee_name: record.employees?.name || 'Unknown Employee'
      }));
    },
    refetchInterval: 30000,
  });

  // Edit attendance mutation
  const editAttendanceMutation = useMutation({
    mutationFn: async (record: AttendanceRecord) => {
      const { error } = await supabase
        .from('attendance')
        .update({
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
          status: record.status,
        })
        .eq('id', record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
      setShowEditDialog(false);
      setEditingRecord(null);
      toast({
        title: "Attendance Updated",
        description: "Attendance record has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating attendance:", error);
      toast({
        title: "Error",
        description: "Failed to update attendance record",
        variant: "destructive"
      });
    }
  });

  const handleEditAttendance = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingRecord) {
      editAttendanceMutation.mutate(editingRecord);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = (record.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-success/10 text-success border-success/20";
      case "absent": return "bg-destructive/10 text-destructive border-destructive/20";
      case "late": return "bg-warning/10 text-warning border-warning/20";
      case "on_leave": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="h-4 w-4" />;
      case "absent": return <XCircle className="h-4 w-4" />;
      case "late": return <Clock className="h-4 w-4" />;
      case "on_leave": return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null): number => {
    if (!checkIn || !checkOut) return 0;
    try {
      const hours = differenceInHours(new Date(checkOut), new Date(checkIn));
      return Math.max(0, hours);
    } catch {
      return 0;
    }
  };

  const attendanceStats = {
    present: attendanceRecords.filter(r => r.status === "present").length,
    absent: attendanceRecords.filter(r => r.status === "absent").length,
    late: attendanceRecords.filter(r => r.status === "late").length,
    onLeave: attendanceRecords.filter(r => r.status === "on_leave").length,
  };

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Attendance data is being exported to CSV",
    });
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
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-muted-foreground">Monitor and manage employee attendance</p>
          </div>
        </div>
        <Button onClick={handleExportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold text-success">{attendanceStats.present}</div>
            <div className="text-sm text-muted-foreground">Present Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <div className="text-2xl font-bold text-destructive">{attendanceStats.absent}</div>
            <div className="text-sm text-muted-foreground">Absent Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold text-warning">{attendanceStats.late}</div>
            <div className="text-sm text-muted-foreground">Late Arrivals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-600">{attendanceStats.onLeave}</div>
            <div className="text-sm text-muted-foreground">On Leave</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {filteredRecords.length} of {attendanceRecords.length} records for {format(selectedDate, "MMMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading attendance records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found for {format(selectedDate, "MMMM dd, yyyy")}
              </div>
            ) : (
              filteredRecords.map((record) => {
                const workingHours = calculateWorkingHours(record.check_in_time, record.check_out_time);
                
                return (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="gradient-primary text-white">
                          {(record.employee_name || '').split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{record.employee_name}</h3>
                          <Badge variant="secondary" className="text-xs">{record.employee_id}</Badge>
                          <Badge className={getStatusColor(record.status)}>
                            {getStatusIcon(record.status)}
                            <span className="ml-1 capitalize">{record.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {record.check_in_time && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-success" />
                              In: {format(new Date(record.check_in_time), "hh:mm a")}
                            </div>
                          )}
                          {record.check_out_time && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-destructive" />
                              Out: {format(new Date(record.check_out_time), "hh:mm a")}
                            </div>
                          )}
                          {workingHours > 0 && (
                            <div>
                              Hours: {workingHours}h
                            </div>
                          )}
                        </div>
                        
                        {/* Check-in Location */}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1 text-success" />
                          <span className="font-medium mr-1">Check-in:</span>
                          {record.location_lat && record.location_lng 
                            ? (
                              <a 
                                href={`https://www.google.com/maps?q=${record.location_lat},${record.location_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {record.location_lat.toFixed(4)}, {record.location_lng.toFixed(4)}
                              </a>
                            )
                            : record.method === 'qr' ? 'QR Code Scan' : 'Manual Entry'}
                        </div>

                        {/* Check-out Location */}
                        {record.check_out_time && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1 text-destructive" />
                            <span className="font-medium mr-1">Check-out:</span>
                            {record.check_out_location_lat && record.check_out_location_lng 
                              ? (
                                <a 
                                  href={`https://www.google.com/maps?q=${record.check_out_location_lat},${record.check_out_location_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {record.check_out_location_lat.toFixed(4)}, {record.check_out_location_lng.toFixed(4)}
                                </a>
                              )
                              : 'Location not recorded'}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAttendance(record)}
                      className="ml-auto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update check-in/out times and status
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Employee</Label>
                <p className="text-sm">{editingRecord.employee_name} ({editingRecord.employee_id})</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Date</Label>
                <p className="text-sm">{format(new Date(editingRecord.date), "MMMM dd, yyyy")}</p>
              </div>

              <div>
                <Label htmlFor="edit-check-in">Check-in Time</Label>
                <Input
                  id="edit-check-in"
                  type="time"
                  value={editingRecord.check_in_time ? format(new Date(editingRecord.check_in_time), "HH:mm") : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [hours, minutes] = e.target.value.split(':');
                    const date = new Date(editingRecord.date);
                    date.setHours(parseInt(hours), parseInt(minutes));
                    setEditingRecord({ 
                      ...editingRecord, 
                      check_in_time: date.toISOString() 
                    });
                  }}
                />
              </div>

              <div>
                <Label htmlFor="edit-check-out">Check-out Time</Label>
                <Input
                  id="edit-check-out"
                  type="time"
                  value={editingRecord.check_out_time ? format(new Date(editingRecord.check_out_time), "HH:mm") : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [hours, minutes] = e.target.value.split(':');
                    const date = new Date(editingRecord.date);
                    date.setHours(parseInt(hours), parseInt(minutes));
                    setEditingRecord({ 
                      ...editingRecord, 
                      check_out_time: date.toISOString() 
                    });
                  }}
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(value: "present" | "absent" | "late" | "on_leave") => 
                    setEditingRecord({ ...editingRecord, status: value })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={editAttendanceMutation.isPending}
              className="gradient-primary text-white"
            >
              {editAttendanceMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAttendance;