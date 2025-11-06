import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Filter
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
import { useQuery } from "@tanstack/react-query";

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
  method?: string;
}

const AdminAttendance = ({ onBack }: AdminAttendanceProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Get local date in YYYY-MM-DD format using device timezone
  const getLocalDate = (date: Date = new Date()) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

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
                        
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {record.location_lat && record.location_lng 
                            ? `${record.location_lat.toFixed(4)}, ${record.location_lng.toFixed(4)}`
                            : record.method === 'qr' ? 'QR Code Scan' : 'Manual Entry'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAttendance;