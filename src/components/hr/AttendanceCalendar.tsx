import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Coffee, Heart, Baby, User } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface AttendanceCalendarProps {
  employeeId?: string;
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface AttendanceData {
  [key: string]: {
    status: "present" | "absent" | "late" | "on_leave";
    leaveType?: "Annual" | "Casual" | "Sick" | "Optional" | "Maternity" | "Parent";
    hours?: number;
  };
}

const AttendanceCalendar = ({ employeeId: propEmployeeId }: AttendanceCalendarProps) => {
  const [value, setValue] = useState<Value>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { employee } = useAuth();
  
  const employeeId = propEmployeeId || employee?.employee_id;

  // Fetch attendance data for current month
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['employee-attendance-calendar', employeeId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Fetch approved leave requests for current month
  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['employee-leaves-calendar', employeeId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .lte('from_date', format(monthEnd, 'yyyy-MM-dd'))
        .gte('to_date', format(monthStart, 'yyyy-MM-dd'));

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Convert attendance records to calendar format
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});

  useEffect(() => {
    const data: AttendanceData = {};

    // Add attendance records
    attendanceRecords.forEach(record => {
      data[record.date] = {
        status: record.status as "present" | "absent" | "late" | "on_leave",
        hours: record.check_in_time && record.check_out_time 
          ? Math.abs(new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60)
          : undefined
      };
    });

    // Add leave records
    leaveRecords.forEach(leave => {
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);
      
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        data[dateKey] = {
          status: "on_leave",
          leaveType: leave.leave_type as "Annual" | "Casual" | "Sick" | "Optional" | "Maternity" | "Parent"
        };
      }
    });

    // Mark weekends as holidays
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dateKey = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay();
      
      if ((dayOfWeek === 0 || dayOfWeek === 6) && !data[dateKey]) {
        data[dateKey] = { status: "on_leave" }; // Mark weekends as on_leave for visual consistency
      }
    }

    setAttendanceData(data);
  }, [attendanceRecords, leaveRecords, currentMonth]);

  const getTileClassName = ({ date }: { date: Date }) => {
    const dateKey = date.toISOString().split('T')[0];
    const attendance = attendanceData[dateKey];
    
    if (!attendance) return "";
    
    switch (attendance.status) {
      case "present":
        return "bg-success/20 text-success-foreground";
      case "absent":
        return "bg-destructive/20 text-destructive-foreground";
      case "late":
        return "bg-warning/20 text-warning-foreground";
      case "on_leave":
        return "bg-blue-100 text-blue-800";
      default:
        return "";
    }
  };

  const getTileContent = ({ date }: { date: Date }) => {
    const dateKey = date.toISOString().split('T')[0];
    const attendance = attendanceData[dateKey];
    
    if (!attendance) return null;
    
    return (
      <div className="text-xs mt-1">
        {attendance.status === "present" && "✓"}
        {attendance.status === "absent" && "✗"}
        {attendance.status === "late" && "⏰"}
        {attendance.status === "on_leave" && "📅"}
      </div>
    );
  };

  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType) {
      case "Annual": return <CalendarIcon className="h-4 w-4" />;
      case "Casual": return <Coffee className="h-4 w-4" />;
      case "Sick": return <Heart className="h-4 w-4" />;
      case "Optional": return <Clock className="h-4 w-4" />;
      case "Maternity": return <Baby className="h-4 w-4" />;
      case "Parent": return <User className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getLeaveTypeColor = (leaveType: string) => {
    switch (leaveType) {
      case "Annual": return "bg-blue-100 text-blue-800";
      case "Casual": return "bg-green-100 text-green-800";
      case "Sick": return "bg-red-100 text-red-800";
      case "Optional": return "bg-purple-100 text-purple-800";
      case "Maternity": return "bg-pink-100 text-pink-800";
      case "Parent": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const currentMonthStats = Object.values(attendanceData).reduce(
    (stats, day) => {
      if (day.status === "present") stats.present++;
      else if (day.status === "absent") stats.absent++;
      else if (day.status === "late") stats.late++;
      else if (day.status === "on_leave") stats.leave++;
      return stats;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  const leaveBreakdown = Object.values(attendanceData)
    .filter(day => day.status === "on_leave" && day.leaveType)
    .reduce((breakdown, day) => {
      const type = day.leaveType!;
      breakdown[type] = (breakdown[type] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{currentMonthStats.present}</div>
            <div className="text-sm text-muted-foreground">Present Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{currentMonthStats.absent}</div>
            <div className="text-sm text-muted-foreground">Absent Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{currentMonthStats.late}</div>
            <div className="text-sm text-muted-foreground">Late Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{currentMonthStats.leave}</div>
            <div className="text-sm text-muted-foreground">Leave Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Attendance Calendar
          </CardTitle>
          <CardDescription>
            View your monthly attendance record
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Calendar
              onChange={setValue}
              value={value}
              onActiveStartDateChange={({ activeStartDate }) => {
                if (activeStartDate) setCurrentMonth(activeStartDate);
              }}
              tileClassName={getTileClassName}
              tileContent={getTileContent}
              className="react-calendar border-0 w-full max-w-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leave Breakdown */}
      {Object.keys(leaveBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Breakdown</CardTitle>
            <CardDescription>
              Types of leaves taken this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(leaveBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-2">
                  <Badge variant="secondary" className={`${getLeaveTypeColor(type)} border-0`}>
                    {getLeaveTypeIcon(type)}
                    <span className="ml-1">{type}</span>
                  </Badge>
                  <span className="text-sm font-medium">{count} days</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-success/20 rounded"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-destructive/20 rounded"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-warning/20 rounded"></div>
              <span>Late</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span>On Leave</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;