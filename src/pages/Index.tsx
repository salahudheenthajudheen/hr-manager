import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Home from "@/components/hr/Home";
import MarkAttendance from "@/components/hr/MarkAttendance";
import ViewReport from "@/components/hr/ViewReport";
import ApplyLeave from "@/components/hr/ApplyLeave";
import EmployeeTasks from "@/components/hr/EmployeeTasks";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { LogOut } from "lucide-react";

type Page = "home" | "attendance" | "report" | "leave" | "tasks";

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const { employee, signOut, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Admin view
  if (isAdmin && employee) {
    return (
      <AdminDashboard
        adminData={{
          email: employee.email,
          name: employee.name,
          role: employee.role,
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Employee view
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Home onNavigate={setCurrentPage} />;
      case "attendance":
        return <MarkAttendance onNavigate={setCurrentPage} />;
      case "report":
        return <ViewReport onNavigate={setCurrentPage} />;
      case "leave":
        return <ApplyLeave onNavigate={setCurrentPage} />;
      case "tasks":
        return <EmployeeTasks onNavigate={setCurrentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Logout Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="shadow-lg"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {renderPage()}
    </div>
  );
};

export default Index;
