import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3 sm:mb-4">
            HR Management System
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Choose your login portal to continue
          </p>
        </div>

        {/* Login Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-slide-up">
          {/* Employee Login Card */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 md:hover:scale-105 border-2 hover:border-primary/50">
            <CardHeader className="space-y-3 sm:space-y-4 text-center pb-3 sm:pb-4">
              <div className="flex justify-center">
                <div className="p-3 sm:p-4 rounded-2xl gradient-primary shadow-glow">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Employee Portal</CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2 px-2">
                  Access your attendance, tasks, and leave management
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></div>
                  Mark attendance
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></div>
                  View and update tasks
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></div>
                  Apply for leave
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></div>
                  View attendance reports
                </div>
              </div>
              <Link to="/signin/employee" className="block">
                <Button className="w-full h-11 sm:h-12 gradient-primary text-white text-sm sm:text-base font-medium">
                  Continue as Employee
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Login Card */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 md:hover:scale-105 border-2 hover:border-accent/50">
            <CardHeader className="space-y-3 sm:space-y-4 text-center pb-3 sm:pb-4">
              <div className="flex justify-center">
                <div className="p-3 sm:p-4 rounded-2xl gradient-hero shadow-glow">
                  <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Admin Portal</CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2 px-2">
                  Manage employees, attendance, tasks, and leave requests
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mr-2"></div>
                  Manage all employees
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mr-2"></div>
                  Review attendance records
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mr-2"></div>
                  Assign and track tasks
                </div>
                <div className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mr-2"></div>
                  Approve leave requests
                </div>
              </div>
              <Link to="/signin/admin" className="block">
                <Button className="w-full h-11 sm:h-12 gradient-hero text-white text-sm sm:text-base font-medium">
                  Continue as Admin
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs sm:text-sm text-muted-foreground animate-fade-in px-2">
          <p>Secure • Reliable • Easy to Use</p>
        </div>
      </div>
    </div>
  );
}
