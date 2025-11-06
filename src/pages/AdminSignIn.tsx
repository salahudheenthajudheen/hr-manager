import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Authenticate
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        toast({
          title: "Login Failed",
          description: signInError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check role BEFORE allowing any redirect
      if (authData.user) {
        const { data: employeeData, error: roleError } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', authData.user.id)
          .single();

        if (roleError || !employeeData) {
          await supabase.auth.signOut();
          setError("Unable to verify account. Please contact support.");
          toast({
            title: "Error",
            description: "Unable to verify account",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // BLOCK non-admins
        if (employeeData.role !== 'admin') {
          await supabase.auth.signOut();
          setError("Access Denied: This portal is for administrators only. Please use the Employee Portal at /signin/employee");
          toast({
            title: "Wrong Portal",
            description: "Employees must use /signin/employee",
            variant: "destructive",
            duration: 6000,
          });
          setLoading(false);
          return;
        }

        // Success - manually navigate
        toast({
          title: "Welcome Admin!",
          description: "Logged in successfully!",
        });
        
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      }

    } catch (err) {
      console.error("Login error:", err);
      try {
        await supabase.auth.signOut();
      } catch {}
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 sm:space-y-4">
          <Link to="/signin" className="flex items-center text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Back to login options
          </Link>
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 rounded-2xl gradient-hero shadow-glow">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>
          <div className="text-center px-2">
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Portal
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
              Sign in to access the admin dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 sm:h-11 pr-10 text-sm sm:text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
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
              type="submit"
              className="w-full h-10 sm:h-11 gradient-hero text-white text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In as Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
