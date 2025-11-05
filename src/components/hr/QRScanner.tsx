import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
}

const QRScanner = ({ onScan }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
          setError(null);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure camera permissions are granted.");
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate QR scanning - in a real app you'd use a QR scanning library
  const handleVideoClick = () => {
    // For demo purposes, we'll simulate a successful scan
    const demoEmployeeId = `EMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    onScan(demoEmployeeId);
  };

  if (error) {
    return (
      <Alert className="border-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-destructive">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="qr-scanner">
      <CardContent className="p-0">
        <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleVideoClick}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 border-2 border-primary/30 rounded-xl">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white bg-black/50 px-3 py-1 rounded-full text-sm">
              {isActive ? "Click to simulate QR scan" : "Starting camera..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;