import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Building, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginProps {
  onLogin: (adminData: { email: string; name: string; role: string }) => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage({ type: "error", text: "Please enter both email and password" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, accept any credentials
      const adminData = {
        email: email,
        name: "Admin User",
        role: "HR Manager"
      };
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${adminData.name}!`,
      });
      
      onLogin(adminData);
    } catch (error) {
      console.error("Error logging in:", error);
      setMessage({ type: "error", text: "Login failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail("admin@company.com");
    setPassword("demo123");
    setTimeout(() => handleLogin(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl gradient-hero shadow-glow">
              <Building className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Admin Portal
          </h1>
          <p className="text-muted-foreground">
            HR Management System - Employer Access
          </p>
        </div>

        {/* Login Card */}
        <Card className="animate-slide-up shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center text-2xl">
              <Shield className="h-6 w-6 mr-2 text-primary" />
              Admin Login
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-11 gradient-primary text-white font-medium"
              variant="default"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button 
              onClick={handleDemoLogin}
              variant="outline"
              className="w-full h-11"
              disabled={loading}
            >
              Try Demo Account
            </Button>

            {/* Status Message */}
            {message && (
              <Alert className={`animate-slide-up ${message.type === 'success' ? 'border-success' : 'border-destructive'}`}>
                <AlertDescription className={message.type === 'success' ? 'text-success' : 'text-destructive'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Secure admin access • Protected by enterprise security</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;