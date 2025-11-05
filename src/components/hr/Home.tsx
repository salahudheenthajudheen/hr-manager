import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Calendar, CheckSquare, Users } from "lucide-react";

interface HomeProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const menuItems = [
    {
      title: "Mark Attendance",
      description: "Scan QR code or enter employee ID to mark attendance",
      icon: Clock,
      action: () => onNavigate("attendance"),
      gradient: "gradient-primary"
    },
    {
      title: "View Reports",
      description: "View attendance reports and calendar",
      icon: FileText,
      action: () => onNavigate("report"),
      gradient: "gradient-primary"
    },
    {
      title: "Apply Leave",
      description: "Submit leave applications and requests",
      icon: Calendar,
      action: () => onNavigate("leave"),
      gradient: "gradient-primary"
    },
    {
      title: "Employee Tasks",
      description: "View and manage daily assigned tasks",
      icon: CheckSquare,
      action: () => onNavigate("tasks"),
      gradient: "gradient-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl gradient-hero shadow-glow">
              <Users className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            HR Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your HR processes with our comprehensive employee portal
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item, index) => (
            <Card 
              key={item.title} 
              className="card-hover cursor-pointer group animate-slide-up border-0 shadow-lg"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={item.action}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl gradient-primary shadow-md group-hover:shadow-glow transition-all duration-300">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {item.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {item.description}
                </CardDescription>
                <Button 
                  variant="ghost" 
                  className="mt-4 w-full justify-start text-primary hover:bg-primary/10"
                >
                  Get Started →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Need help? Contact your HR administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;