import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, QrCode, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import QRScanner from "@/components/hr/QRScanner";

interface MarkAttendanceProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

const MarkAttendance = ({ onNavigate }: MarkAttendanceProps) => {
  const { employee } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkingAttendance, setCheckingAttendance] = useState(true);
  const { toast } = useToast();

  // Set employee ID from logged-in user
  useEffect(() => {
    if (employee) {
      setEmployeeId(employee.employee_id);
    }
  }, [employee]);

  // Check today's attendance status
  useEffect(() => {
    const checkTodayAttendance = async () => {
      if (!employeeId) return;

      setCheckingAttendance(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', today)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking attendance:', error);
        }

        setTodayAttendance(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setCheckingAttendance(false);
      }
    };

    checkTodayAttendance();
  }, [employeeId]);

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enable location services.",
            variant: "destructive"
          });
        }
      );
    }
  }, [toast]);

  const handleMarkAttendance = async (method: "qr" | "manual") => {
    if (!employeeId.trim()) {
      setMessage({ type: "error", text: "Employee ID not found" });
      return;
    }

    if (!location) {
      setMessage({ type: "error", text: "Location not available. Please enable location services." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      if (todayAttendance) {
        // Check out
        if (!todayAttendance.check_out_time) {
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ 
              check_out_time: now,
            })
            .eq('id', todayAttendance.id);

          if (updateError) throw updateError;

          setMessage({ type: "success", text: "Check-out marked successfully!" });
          toast({
            title: "Success",
            description: "Check-out time recorded!",
          });

          // Update local state
          setTodayAttendance({ ...todayAttendance, check_out_time: now });
        } else {
          setMessage({ type: "error", text: "You have already checked out for today" });
          toast({
            title: "Already Checked Out",
            description: "You have already completed attendance for today",
            variant: "destructive",
          });
        }
      } else {
        // Check in
        const { data, error: insertError } = await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: today,
            check_in_time: now,
            location_lat: location.lat,
            location_lng: location.lng,
            status: 'present',
            method: method
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setMessage({ type: "success", text: "Check-in marked successfully!" });
        toast({
          title: "Success",
          description: "Attendance check-in successful!",
        });

        // Update local state
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage({ type: "error", text: "Failed to mark attendance. Please try again." });
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (scannedData: string) => {
    setEmployeeId(scannedData);
    setShowScanner(false);
    toast({
      title: "QR Code Scanned",
      description: `Employee ID: ${scannedData}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
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
            <h1 className="text-3xl font-bold">Mark Attendance</h1>
            <p className="text-muted-foreground">Scan QR code or enter employee ID manually</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Location Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-accent" />
                Location Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {location ? (
                <div className="flex items-center text-success">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Location detected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
              ) : (
                <div className="flex items-center text-warning">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Getting location...
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2 text-primary" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Scan employee ID QR code for quick attendance marking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowScanner(!showScanner)}
                className="w-full"
                variant="outline"
                disabled={todayAttendance && todayAttendance.check_out_time}
              >
                {showScanner ? "Close Scanner" : "Open QR Scanner"}
              </Button>
              
              {showScanner && (
                <div className="animate-slide-up space-y-4">
                  <QRScanner onScan={handleQRScan} />
                  <Button 
                    onClick={() => handleMarkAttendance("qr")}
                    disabled={
                      loading || 
                      !employeeId.trim() || 
                      !location || 
                      checkingAttendance ||
                      (todayAttendance && todayAttendance.check_out_time)
                    }
                    className={`w-full text-white ${
                      todayAttendance && !todayAttendance.check_out_time
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    variant="default"
                  >
                    {loading 
                      ? "Processing..." 
                      : checkingAttendance
                      ? "Checking..."
                      : todayAttendance && !todayAttendance.check_out_time
                      ? "Check Out (QR)"
                      : todayAttendance && todayAttendance.check_out_time
                      ? "Already Checked Out"
                      : "Check In (QR)"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-accent" />
                Attendance
              </CardTitle>
              <CardDescription>
                {checkingAttendance 
                  ? "Checking attendance status..." 
                  : !todayAttendance 
                  ? "Check in to mark your arrival" 
                  : todayAttendance.check_out_time 
                  ? "You have completed attendance for today" 
                  : "Check out when you're leaving"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your employee ID"
                  className="mt-1"
                  disabled
                />
              </div>

              {/* Check In/Out Status Display */}
              {todayAttendance && (
                <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Check In:</span>
                    <span className="font-medium">
                      {todayAttendance.check_in_time 
                        ? new Date(todayAttendance.check_in_time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : '-'}
                    </span>
                  </div>
                  {todayAttendance.check_out_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Check Out:</span>
                      <span className="font-medium">
                        {new Date(todayAttendance.check_out_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={() => handleMarkAttendance("manual")}
                disabled={
                  loading || 
                  !employeeId.trim() || 
                  !location || 
                  checkingAttendance ||
                  (todayAttendance && todayAttendance.check_out_time)
                }
                className={`w-full text-white ${
                  todayAttendance && !todayAttendance.check_out_time
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                variant="default"
              >
                {loading 
                  ? "Processing..." 
                  : checkingAttendance
                  ? "Checking..."
                  : todayAttendance && !todayAttendance.check_out_time
                  ? "Check Out"
                  : todayAttendance && todayAttendance.check_out_time
                  ? "Already Checked Out"
                  : "Check In"}
              </Button>
            </CardContent>
          </Card>

          {/* Status Message */}
          {message && (
            <Alert className={`animate-slide-up ${message.type === 'success' ? 'border-success' : 'border-destructive'}`}>
              <AlertDescription className={message.type === 'success' ? 'text-success' : 'text-destructive'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;