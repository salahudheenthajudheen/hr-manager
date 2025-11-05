import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileText, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AttendanceCalendar from "@/components/hr/AttendanceCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ViewReportProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

const ViewReport = ({ onNavigate }: ViewReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [reportFormat, setReportFormat] = useState<"summary" | "detailed">("summary");
  const { toast } = useToast();
  const { employee } = useAuth();

  // Fetch attendance data for selected month
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['employee-attendance-report', employee?.employee_id, format(selectedMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!employee?.employee_id) return [];
      
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.employee_id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!employee?.employee_id,
  });

  // Calculate statistics
  const stats = {
    totalDays: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'present').length,
    late: attendanceRecords.filter(r => r.status === 'late').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    onLeave: attendanceRecords.filter(r => r.status === 'on_leave').length,
  };

  const generateCSV = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records found for this month",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Working Hours'];
    const rows = attendanceRecords.map(record => [
      record.date,
      record.status,
      record.check_in_time ? format(new Date(record.check_in_time), 'hh:mm a') : '-',
      record.check_out_time ? format(new Date(record.check_out_time), 'hh:mm a') : '-',
      record.check_in_time && record.check_out_time 
        ? `${Math.abs(new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60)}`
        : '-'
    ]);

    const csvContent = [
      `Attendance Report - ${employee?.name}`,
      `Employee ID: ${employee?.employee_id}`,
      `Period: ${format(selectedMonth, 'MMMM yyyy')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${employee?.employee_id}-${format(selectedMonth, 'yyyy-MM')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Attendance report has been downloaded as CSV",
    });
  };

  const generatePrintReport = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records found for this month",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${employee?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            .header { margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4a90e2; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-card { padding: 15px; border-radius: 8px; background: #f0f0f0; flex: 1; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-label { color: #666; font-size: 14px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <div class="info">
              <p><strong>Employee Name:</strong> ${employee?.name}</p>
              <p><strong>Employee ID:</strong> ${employee?.employee_id}</p>
              <p><strong>Department:</strong> ${employee?.department}</p>
              <p><strong>Period:</strong> ${format(selectedMonth, 'MMMM yyyy')}</p>
            </div>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${stats.totalDays}</div>
              <div class="stat-label">Total Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.present}</div>
              <div class="stat-label">Present</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.late}</div>
              <div class="stat-label">Late</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.absent}</div>
              <div class="stat-label">Absent</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.onLeave}</div>
              <div class="stat-label">On Leave</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRecords.map(record => `
                <tr>
                  <td>${format(new Date(record.date), 'MMM dd, yyyy')}</td>
                  <td style="text-transform: capitalize;">${record.status.replace('_', ' ')}</td>
                  <td>${record.check_in_time ? format(new Date(record.check_in_time), 'hh:mm a') : '-'}</td>
                  <td>${record.check_out_time ? format(new Date(record.check_out_time), 'hh:mm a') : '-'}</td>
                  <td>${record.check_in_time && record.check_out_time 
                    ? Math.round(Math.abs(new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10 + ' hrs'
                    : '-'
                  }</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 40px;">
            <button onclick="window.print()" style="background: #4a90e2; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
              Print Report
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast({
      title: "Report Generated",
      description: "Attendance report opened in new window",
    });
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
            <h1 className="text-3xl font-bold">Attendance Report</h1>
            <p className="text-muted-foreground">
              {employee?.name} ({employee?.employee_id}) - {employee?.department}
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Report Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Select Month</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedMonth, 'MMMM yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="p-4">
                        <Select
                          value={format(selectedMonth, 'yyyy-MM')}
                          onValueChange={(value) => {
                            const [year, month] = value.split('-');
                            setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => {
                              const date = new Date();
                              date.setMonth(date.getMonth() - i);
                              return (
                                <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                                  {format(date, 'MMMM yyyy')}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateCSV} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={generatePrintReport} variant="default">
                    <FileText className="mr-2 h-4 w-4" />
                    Print Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalDays}</div>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.onLeave}</div>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading attendance records...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for {format(selectedMonth, 'MMMM yyyy')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Check In</th>
                        <th className="text-left p-2">Check Out</th>
                        <th className="text-left p-2">Working Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => {
                        const workingHours = record.check_in_time && record.check_out_time
                          ? Math.round(Math.abs(new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10
                          : null;

                        return (
                          <tr key={record.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {record.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2">
                              {record.check_in_time ? format(new Date(record.check_in_time), 'hh:mm a') : '-'}
                            </td>
                            <td className="p-2">
                              {record.check_out_time ? format(new Date(record.check_out_time), 'hh:mm a') : '-'}
                            </td>
                            <td className="p-2">
                              {workingHours ? `${workingHours} hrs` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewReport;