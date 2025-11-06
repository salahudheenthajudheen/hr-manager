import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, FileText, Calendar, Clock, CheckSquare, UserCheck, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface AdminSettingsProps {
  onBack: () => void;
}

interface Employee {
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  location: string;
  role: string;
  created_at: string;
}

interface ReportOptions {
  includeAttendance: boolean;
  includeLeaves: boolean;
  includeTasks: boolean;
  includePersonalInfo: boolean;
  dateRange: 'all' | '30days' | '90days' | '1year';
}

const AdminSettings = ({ onBack }: AdminSettingsProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    includeAttendance: true,
    includeLeaves: true,
    includeTasks: true,
    includePersonalInfo: true,
    dateRange: '30days'
  });
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch all employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
  });

  const getDateRangeFilter = () => {
    const today = new Date();
    let startDate = new Date();

    switch (reportOptions.dateRange) {
      case '30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date('2000-01-01'); // All time
    }

    return startDate.toISOString().split('T')[0];
  };

  const generateEmployeeReport = async () => {
    if (!selectedEmployee) {
      toast({
        title: "No Employee Selected",
        description: "Please select an employee to generate a report",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);

    try {
      console.log("Fetching employee data for:", selectedEmployee);
      
      // Fetch employee details
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .single();

      if (empError) {
        console.error("Employee fetch error:", empError);
        throw empError;
      }

      if (!employee) {
        console.error("Employee not found");
        throw new Error("Employee not found");
      }

      console.log("Employee found:", employee);

      const startDate = getDateRangeFilter();
      console.log("Date range from:", startDate);

      // Fetch attendance records
      let attendanceData = [];
      if (reportOptions.includeAttendance) {
        console.log("Fetching attendance...");
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('date', startDate)
          .order('date', { ascending: false });
        
        if (error) {
          console.error("Attendance fetch error:", error);
        }
        attendanceData = data || [];
        console.log("Attendance records:", attendanceData.length);
      }

      // Fetch leave requests
      let leaveData = [];
      if (reportOptions.includeLeaves) {
        console.log("Fetching leaves...");
        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Leave fetch error:", error);
        }
        leaveData = data || [];
        console.log("Leave records:", leaveData.length);
      }

      // Fetch tasks
      let tasksData = [];
      if (reportOptions.includeTasks) {
        console.log("Fetching tasks...");
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', selectedEmployee)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Tasks fetch error:", error);
        }
        tasksData = data || [];
        console.log("Task records:", tasksData.length);
      }

      console.log("Generating PDF...");
      // Generate PDF
      generatePDF(employee, attendanceData, leaveData, tasksData);

      toast({
        title: "Report Generated",
        description: `Employee report for ${employee.name} has been downloaded`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate employee report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = (employee: Employee, attendance: any[], leaves: any[], tasks: any[]) => {
    try {
      console.log("Creating PDF document...");
      const doc = new jsPDF();
      let yPos = 20;

      // Header - More subtle color scheme
      doc.setFillColor(248, 250, 252); // Light gray-blue background
      doc.rect(0, 0, 210, 35, 'F');
      
      // Add a subtle border at bottom of header
      doc.setDrawColor(226, 232, 240); // Light gray border
      doc.setLineWidth(0.5);
      doc.line(0, 35, 210, 35);
      
      doc.setTextColor(51, 65, 85); // Slate gray text
      doc.setFontSize(22);
      // Center text manually
      const headerText = 'Employee Report';
      const headerWidth = doc.getTextWidth(headerText);
      doc.text(headerText, (210 - headerWidth) / 2, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Lighter gray for subtitle
      const subHeaderText = 'HR Management System';
      const subHeaderWidth = doc.getTextWidth(subHeaderText);
      doc.text(subHeaderText, (210 - subHeaderWidth) / 2, 25);
      
      yPos = 45;
      doc.setTextColor(0, 0, 0);

    // Personal Information
    if (reportOptions.includePersonalInfo) {
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // Subtle dark gray
      doc.text('Personal Information', 14, yPos);
      
      // Add subtle underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const personalInfo = [
        ['Employee ID:', employee.employee_id],
        ['Name:', employee.name],
        ['Email:', employee.email],
        ['Phone:', employee.phone || 'N/A'],
        ['Department:', employee.department],
        ['Position:', employee.position],
        ['Location:', employee.location || 'N/A'],
        ['Role:', employee.role],
        ['Joined:', format(new Date(employee.created_at), 'MMM dd, yyyy')]
      ];

      personalInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(String(label), 14, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(String(value), 60, yPos);
        yPos += 6;
      });

      yPos += 5;
    }

    // Attendance Summary
    if (reportOptions.includeAttendance && attendance.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // Subtle dark gray
      doc.text('Attendance Summary', 14, yPos);
      
      // Add subtle underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 10;

      const presentCount = attendance.filter(a => a.status === 'present').length;
      const lateCount = attendance.filter(a => a.status === 'late').length;
      const absentCount = attendance.filter(a => a.status === 'absent').length;
      const leaveCount = attendance.filter(a => a.status === 'on_leave').length;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Total Days: ' + attendance.length, 14, yPos);
      yPos += 6;
      doc.text('Present: ' + presentCount + ' | Late: ' + lateCount + ' | Absent: ' + absentCount + ' | On Leave: ' + leaveCount, 14, yPos);
      yPos += 10;

      // Attendance table
      const attendanceRows = attendance.slice(0, 20).map(a => [
        format(new Date(a.date), 'MMM dd, yyyy'),
        a.status.toUpperCase(),
        a.check_in || 'N/A',
        a.check_out || 'N/A'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Status', 'Check In', 'Check Out']],
        body: attendanceRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [241, 245, 249], // Very light gray
          textColor: [51, 65, 85], // Dark gray text
          fontStyle: 'bold',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Subtle alternating rows
        },
        margin: { left: 14, right: 14 },
        styles: { 
          fontSize: 9,
          textColor: [71, 85, 105],
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Leave Requests
    if (reportOptions.includeLeaves && leaves.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // Subtle dark gray
      doc.text('Leave Requests', 14, yPos);
      
      // Add subtle underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 10;

      const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
      const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;
      const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Total Requests: ' + leaves.length + ' | Approved: ' + approvedLeaves + ' | Rejected: ' + rejectedLeaves + ' | Pending: ' + pendingLeaves, 14, yPos);
      yPos += 10;

      const leaveRows = leaves.slice(0, 15).map(l => [
        l.leave_type,
        format(new Date(l.from_date), 'MMM dd') + ' - ' + format(new Date(l.to_date), 'MMM dd, yyyy'),
        l.status.toUpperCase(),
        l.subject.substring(0, 30) + (l.subject.length > 30 ? '...' : '')
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Duration', 'Status', 'Subject']],
        body: leaveRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [241, 245, 249], // Very light gray
          textColor: [51, 65, 85], // Dark gray text
          fontStyle: 'bold',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Subtle alternating rows
        },
        margin: { left: 14, right: 14 },
        styles: { 
          fontSize: 9,
          textColor: [71, 85, 105],
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tasks
    if (reportOptions.includeTasks && tasks.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // Subtle dark gray
      doc.text('Assigned Tasks', 14, yPos);
      
      // Add subtle underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 10;

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter(t => t.status === 'not_started').length;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Total Tasks: ' + tasks.length + ' | Completed: ' + completedTasks + ' | In Progress: ' + inProgressTasks + ' | Pending: ' + pendingTasks, 14, yPos);
      yPos += 10;

      const taskRows = tasks.slice(0, 15).map(t => [
        t.title.substring(0, 30) + (t.title.length > 30 ? '...' : ''),
        format(new Date(t.created_at), 'MMM dd, yyyy'),
        t.due_date ? format(new Date(t.due_date), 'MMM dd, yyyy') : 'N/A',
        t.status.replace('_', ' ').toUpperCase()
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Task', 'Assigned', 'Due Date', 'Status']],
        body: taskRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [241, 245, 249], // Very light gray
          textColor: [51, 65, 85], // Dark gray text
          fontStyle: 'bold',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Subtle alternating rows
        },
        margin: { left: 14, right: 14 },
        styles: { 
          fontSize: 9,
          textColor: [71, 85, 105],
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        }
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        'Generated on ' + format(new Date(), 'MMM dd, yyyy HH:mm'),
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        'Page ' + i + ' of ' + pageCount,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }

    // Save PDF
    doc.save(`${employee.name.replace(/\s+/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    console.log("PDF saved successfully");
    } catch (error) {
      console.error("Error in PDF generation:", error);
      throw new Error("Failed to generate PDF: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
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
            <h1 className="text-3xl font-bold">Settings & Reports</h1>
            <p className="text-muted-foreground">Generate detailed employee reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Employee Report Generator
            </CardTitle>
            <CardDescription>
              Generate comprehensive PDF reports for individual employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading employees...
                    </SelectItem>
                  ) : employees.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No employees found
                    </SelectItem>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.employee_id} value={emp.employee_id}>
                        {emp.name} ({emp.employee_id}) - {emp.department}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="dateRange">Report Period</Label>
              <Select 
                value={reportOptions.dateRange} 
                onValueChange={(value: any) => setReportOptions(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger id="dateRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="1year">Last 1 Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Sections */}
            <div className="space-y-3">
              <Label>Include in Report</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="personalInfo"
                  checked={reportOptions.includePersonalInfo}
                  onCheckedChange={(checked) => 
                    setReportOptions(prev => ({ ...prev, includePersonalInfo: checked as boolean }))
                  }
                />
                <label htmlFor="personalInfo" className="text-sm cursor-pointer flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Personal Information
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="attendance"
                  checked={reportOptions.includeAttendance}
                  onCheckedChange={(checked) => 
                    setReportOptions(prev => ({ ...prev, includeAttendance: checked as boolean }))
                  }
                />
                <label htmlFor="attendance" className="text-sm cursor-pointer flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Attendance Records
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="leaves"
                  checked={reportOptions.includeLeaves}
                  onCheckedChange={(checked) => 
                    setReportOptions(prev => ({ ...prev, includeLeaves: checked as boolean }))
                  }
                />
                <label htmlFor="leaves" className="text-sm cursor-pointer flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Leave Requests
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="tasks"
                  checked={reportOptions.includeTasks}
                  onCheckedChange={(checked) => 
                    setReportOptions(prev => ({ ...prev, includeTasks: checked as boolean }))
                  }
                />
                <label htmlFor="tasks" className="text-sm cursor-pointer flex items-center">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Assigned Tasks
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateEmployeeReport}
              disabled={!selectedEmployee || generating}
              className="w-full gradient-primary text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview Info */}
        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
            <CardDescription>
              What's included in the employee report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <UserCheck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Personal Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Employee ID, name, contact details, department, position, and employment date
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Attendance Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Daily attendance records with check-in/out times, present/absent/late statistics
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Leave History</h4>
                  <p className="text-sm text-muted-foreground">
                    All leave requests with types, dates, approval status, and reasons
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Task Performance</h4>
                  <p className="text-sm text-muted-foreground">
                    Assigned tasks, completion status, deadlines, and progress tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-2">Export Format</h4>
              <p className="text-sm text-muted-foreground">
                Reports are generated as professionally formatted PDF documents with:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Company branding and headers</li>
                <li>Organized sections with tables</li>
                <li>Summary statistics</li>
                <li>Generation timestamp</li>
                <li>Page numbers</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
