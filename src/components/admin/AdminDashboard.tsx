import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckSquare, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
  UserCheck,
  UserX,
  CalendarCheck,
  CalendarX,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import AdminEmployees from "./AdminEmployees";
import AdminAttendance from "./AdminAttendance";
import AdminLeaveRequests from "./AdminLeaveRequests";
import AdminTasks from "./AdminTasks";
import AdminSettings from "./AdminSettings";

interface AdminDashboardProps {
  adminData: { email: string; name: string; role: string };
  onLogout: () => void;
}

type AdminPage = "dashboard" | "employees" | "attendance" | "leave" | "tasks" | "settings";

const AdminDashboard = ({ adminData, onLogout }: AdminDashboardProps) => {
  const [currentPage, setCurrentPage] = useState<AdminPage>("dashboard");

  // Fetch real dashboard stats
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Get total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      // Get today's attendance
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);

      // Get pending leave requests
      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get tasks stats
      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: pendingTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const lateArrivals = todayAttendance?.filter(a => a.status === 'late').length || 0;
      const onLeaveToday = todayAttendance?.filter(a => a.status === 'on_leave').length || 0;
      const absentToday = (totalEmployees || 0) - presentToday - onLeaveToday;

      return {
        totalEmployees: totalEmployees || 0,
        presentToday,
        absentToday: absentToday > 0 ? absentToday : 0,
        pendingLeaves: pendingLeaves || 0,
        completedTasks: completedTasks || 0,
        pendingTasks: pendingTasks || 0,
        onLeaveToday,
        lateArrivals
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const activities: any[] = [];

      // Recent attendance
      const { data: recentAttendance } = await supabase
        .from('attendance')
        .select('*, employees!attendance_employee_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(3);

      recentAttendance?.forEach((att: any) => {
        activities.push({
          id: att.id,
          type: 'attendance',
          message: `${att.employees?.name || 'Employee'} marked attendance`,
          time: getRelativeTime(att.created_at),
          status: att.status === 'late' ? 'warning' : 'success'
        });
      });

      // Recent leave requests
      const { data: recentLeaves } = await supabase
        .from('leave_requests')
        .select('*, employees!leave_requests_employee_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(2);

      recentLeaves?.forEach((leave: any) => {
        activities.push({
          id: leave.id,
          type: 'leave',
          message: `${leave.employees?.name || 'Employee'} applied for ${leave.leave_type} leave`,
          time: getRelativeTime(leave.created_at),
          status: leave.status === 'approved' ? 'success' : 'pending'
        });
      });

      return activities.slice(0, 5);
    },
    refetchInterval: 30000,
  });

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leave", label: "Leave Requests", icon: Calendar },
    { id: "tasks", label: "Task Management", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case "employees":
        return <AdminEmployees onBack={() => setCurrentPage("dashboard")} />;
      case "attendance":
        return <AdminAttendance onBack={() => setCurrentPage("dashboard")} />;
      case "leave":
        return <AdminLeaveRequests onBack={() => setCurrentPage("dashboard")} />;
      case "tasks":
        return <AdminTasks onBack={() => setCurrentPage("dashboard")} />;
      case "settings":
        return <AdminSettings onBack={() => setCurrentPage("dashboard")} />;
      default:
        return (
          <div className="p-6 space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {adminData.name}</h1>
                <p className="text-muted-foreground">{adminData.role} • {adminData.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Employees</p>
                          <p className="text-2xl font-bold">{dashboardStats?.totalEmployees || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Present Today</p>
                          <p className="text-2xl font-bold text-success">{dashboardStats?.presentToday || 0}</p>
                        </div>
                        <UserCheck className="h-8 w-8 text-success" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Absent Today</p>
                          <p className="text-2xl font-bold text-destructive">{dashboardStats?.absentToday || 0}</p>
                        </div>
                        <UserX className="h-8 w-8 text-destructive" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Leaves</p>
                          <p className="text-2xl font-bold text-warning">{dashboardStats?.pendingLeaves || 0}</p>
                        </div>
                        <CalendarX className="h-8 w-8 text-warning" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CalendarCheck className="h-6 w-6 mx-auto text-accent mb-2" />
                      <div className="text-lg font-semibold">{dashboardStats?.onLeaveToday || 0}</div>
                      <div className="text-sm text-muted-foreground">On Leave Today</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-6 w-6 mx-auto text-warning mb-2" />
                      <div className="text-lg font-semibold">{dashboardStats?.lateArrivals || 0}</div>
                      <div className="text-sm text-muted-foreground">Late Arrivals</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckSquare className="h-6 w-6 mx-auto text-success mb-2" />
                      <div className="text-lg font-semibold">{dashboardStats?.completedTasks || 0}</div>
                      <div className="text-sm text-muted-foreground">Completed Tasks</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
                      <div className="text-lg font-semibold">{dashboardStats?.pendingTasks || 0}</div>
                      <div className="text-sm text-muted-foreground">Pending Tasks</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Recent Activities
                </CardTitle>
                <CardDescription>
                  Latest updates from your HR system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activities</p>
                    <p className="text-sm">Activity will appear here when employees use the system</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === 'success' ? 'bg-success' :
                            activity.status === 'warning' ? 'bg-warning' :
                            'bg-primary'
                          }`} />
                          <span className="text-sm">{activity.message}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            activity.status === 'success' ? 'default' :
                            activity.status === 'warning' ? 'destructive' :
                            'secondary'
                          }>
                            {activity.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={() => setCurrentPage("employees")}
                variant="outline" 
                className="h-16 flex-col space-y-2"
              >
                <Users className="h-6 w-6" />
                <span>Manage Employees</span>
              </Button>
              <Button 
                onClick={() => setCurrentPage("attendance")}
                variant="outline" 
                className="h-16 flex-col space-y-2"
              >
                <Clock className="h-6 w-6" />
                <span>View Attendance</span>
              </Button>
              <Button 
                onClick={() => setCurrentPage("leave")}
                variant="outline" 
                className="h-16 flex-col space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>Leave Requests</span>
              </Button>
              <Button 
                onClick={() => setCurrentPage("tasks")}
                variant="outline" 
                className="h-16 flex-col space-y-2"
              >
                <CheckSquare className="h-6 w-6" />
                <span>Assign Tasks</span>
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold">HR Admin</h2>
              <p className="text-xs text-muted-foreground">Management Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              className={`w-full justify-start ${currentPage === item.id ? 'gradient-primary text-white' : ''}`}
              onClick={() => setCurrentPage(item.id as AdminPage)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t mt-auto">
          <Button 
            variant="outline" 
            className="w-full hover:bg-destructive hover:text-destructive-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;