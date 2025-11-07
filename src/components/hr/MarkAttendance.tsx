import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, QrCode, MapPin, Clock, CheckCircle, AlertCircle, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import QRScanner from "@/components/hr/QRScanner";
import { OFFICE_CONFIG, isWithinOfficeRange } from "@/config/office";

interface MarkAttendanceProps {
  onNavigate: (page: "home" | "attendance" | "report" | "leave" | "tasks") => void;
}

const MarkAttendance = ({ onNavigate }: MarkAttendanceProps) => {
  const { employee } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [manualEmployeeId, setManualEmployeeId] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationCheck, setLocationCheck] = useState<{ isWithinRange: boolean; distance: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
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
        // Get local date in YYYY-MM-DD format using device timezone
        const today = new Date();
        const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
          .toISOString()
          .split('T')[0];

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', localDate)
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
    
    // Recheck at midnight to allow next day's attendance
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      checkTodayAttendance();
      // Set up daily interval
      const dailyInterval = setInterval(checkTodayAttendance, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, [employeeId]);

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(userLocation);

          // Check if within office range (for in-office employees)
          if (employee?.location === 'in-office' && OFFICE_CONFIG.enforceLocationCheck) {
            const rangeCheck = isWithinOfficeRange(userLocation.lat, userLocation.lng);
            setLocationCheck(rangeCheck);
          } else {
            // For WFH and field work, always allow
            setLocationCheck({ isWithinRange: true, distance: 0 });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enable location services.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [toast, employee]);

  const handleMarkAttendance = async (method: "qr" | "manual") => {
    const idToUse = method === "qr" ? employeeId : manualEmployeeId;
    
    if (!idToUse.trim()) {
      setMessage({ type: "error", text: "Employee ID not found" });
      toast({
        title: "Error",
        description: "Employee ID is required",
        variant: "destructive"
      });
      return;
    }

    // Validate that employee can only mark their own attendance
    if (employee && idToUse.trim() !== employee.employee_id) {
      setMessage({ type: "error", text: "You can only mark attendance for your own Employee ID" });
      toast({
        title: "Access Denied",
        description: "You cannot mark attendance for other employees",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    if (!location) {
      setMessage({ type: "error", text: "Location not available. Please enable location services." });
      return;
    }

    // Check if in-office employee is within allowed range
    if (employee?.location === 'in-office' && OFFICE_CONFIG.enforceLocationCheck) {
      if (!locationCheck || !locationCheck.isWithinRange) {
        const distance = locationCheck?.distance || 0;
        setMessage({ 
          type: "error", 
          text: `You must be within ${OFFICE_CONFIG.allowedRadius}m of the office to mark attendance. You are ${distance}m away.` 
        });
        toast({
          title: "Location Check Failed",
          description: `You are too far from the office (${distance}m away). Please move closer to mark attendance.`,
          variant: "destructive",
          duration: 6000,
        });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      // Get local date and time using device timezone
      const now = new Date();
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
      const localDateTime = now.toISOString();

      if (todayAttendance) {
        // Check out
        if (!todayAttendance.check_out_time) {
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ 
              check_out_time: localDateTime,
              check_out_location_lat: location.lat,
              check_out_location_lng: location.lng,
            })
            .eq('id', todayAttendance.id);

          if (updateError) throw updateError;

          setMessage({ type: "success", text: "✓ Check-out marked successfully!" });
          toast({
            title: "✓ Success",
            description: "Check-out time recorded!",
          });

          // Update local state
          setTodayAttendance({ ...todayAttendance, check_out_time: localDateTime });
          setQrScanned(false);
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
            employee_id: idToUse,
            date: localDate,
            check_in_time: localDateTime,
            location_lat: location.lat,
            location_lng: location.lng,
            status: 'present',
            method: method
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setMessage({ type: "success", text: "✓ Check-in marked successfully!" });
        toast({
          title: "✓ Success",
          description: "Attendance check-in successful!",
          duration: 5000
        });

        // Update local state
        setTodayAttendance(data);
        setQrScanned(false);
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
    // Validate scanned ID matches logged-in employee
    if (employee && scannedData.trim() !== employee.employee_id) {
      toast({
        title: "Invalid QR Code",
        description: "This QR code doesn't match your Employee ID. Please scan your own QR code.",
        variant: "destructive",
        duration: 5000
      });
      setShowScanner(false);
      return;
    }
    
    setEmployeeId(scannedData);
    setQrScanned(true);
    setShowScanner(false);
    
    toast({
      title: "QR Code Scanned Successfully",
      description: `Employee ID: ${scannedData} - Ready to mark attendance`,
      duration: 3000
    });
    
    // Automatically mark attendance after successful scan
    setTimeout(() => {
      handleMarkAttendance("qr");
    }, 500);
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
            <p className="text-muted-foreground">Scan your QR code to mark attendance</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Today's Attendance Status - Prominent Display */}
          {!checkingAttendance && todayAttendance && (
            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Today's Attendance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-800">Check In:</span>
                    <span className="font-bold text-green-900">
                      {new Date(todayAttendance.check_in_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {todayAttendance.check_out_time ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-blue-800">Check Out:</span>
                      <span className="font-bold text-blue-900">
                        {new Date(todayAttendance.check_out_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  ) : (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Remember to check out when leaving
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-accent" />
                Location Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {location ? (
                <>
                  <div className="flex items-center text-success">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Location detected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                  </div>
                  
                  {/* Show location check ONLY for in-office employees */}
                  {employee?.location === 'in-office' && OFFICE_CONFIG.enforceLocationCheck && locationCheck && (
                    <div className={`p-3 rounded-lg border ${
                      locationCheck.isWithinRange 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start space-x-2">
                        {locationCheck.isWithinRange ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${
                            locationCheck.isWithinRange ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {locationCheck.isWithinRange 
                              ? '✓ Within office range' 
                              : '✗ Outside office range'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            locationCheck.isWithinRange ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Distance from office: {locationCheck.distance}m
                            {!locationCheck.isWithinRange && ` (max: ${OFFICE_CONFIG.allowedRadius}m)`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center text-warning">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Getting location...
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Scanner */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2 text-primary" />
                QR Code Scanner (Recommended)
              </CardTitle>
              <CardDescription>
                Scan your employee ID QR code for quick and secure attendance marking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowScanner(!showScanner)}
                className="w-full gradient-primary text-white"
                size="lg"
                disabled={todayAttendance && todayAttendance.check_out_time}
              >
                <QrCode className="h-5 w-5 mr-2" />
                {showScanner ? "Close QR Scanner" : "Scan QR Code"}
              </Button>
              
              {showScanner && (
                <div className="animate-slide-up space-y-4">
                  <QRScanner onScan={handleQRScan} />
                </div>
              )}
              
              {/* QR Scanned Success Indicator */}
              {qrScanned && employeeId && !showScanner && (
                <Alert className="border-success bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    ✓ QR Code scanned: {employeeId} - Processing attendance...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry - Fallback Option */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                Manual Entry (Fallback)
              </CardTitle>
              <CardDescription>
                {checkingAttendance 
                  ? "Checking attendance status..." 
                  : "Use this only if QR scanner is not working"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showManualEntry ? (
                <Button 
                  onClick={() => setShowManualEntry(true)}
                  variant="outline"
                  className="w-full"
                  disabled={todayAttendance && todayAttendance.check_out_time}
                >
                  Use Manual Entry
                </Button>
              ) : (
                <div className="space-y-4 animate-slide-up">
                  <Alert className="border-warning bg-warning/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You can only enter your own Employee ID: <strong>{employee?.employee_id}</strong>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="manualEmployeeId">Your Employee ID</Label>
                    <Input
                      id="manualEmployeeId"
                      value={manualEmployeeId}
                      onChange={(e) => setManualEmployeeId(e.target.value)}
                      placeholder={`Enter ${employee?.employee_id || 'your employee ID'}`}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      For security, you can only mark your own attendance
                    </p>
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
                      !manualEmployeeId.trim() || 
                      !location || 
                      checkingAttendance ||
                      (todayAttendance && todayAttendance.check_out_time) ||
                      (employee?.location === 'in-office' && OFFICE_CONFIG.enforceLocationCheck && locationCheck && !locationCheck.isWithinRange)
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
                      : (employee?.location === 'in-office' && OFFICE_CONFIG.enforceLocationCheck && locationCheck && !locationCheck.isWithinRange)
                      ? "Too Far From Office"
                      : todayAttendance && !todayAttendance.check_out_time
                      ? "Check Out"
                      : todayAttendance && todayAttendance.check_out_time
                      ? "Already Checked Out"
                      : "Check In"}
                  </Button>

                  <Button 
                    onClick={() => setShowManualEntry(false)}
                    variant="ghost"
                    className="w-full"
                  >
                    Cancel Manual Entry
                  </Button>
                </div>
              )}
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