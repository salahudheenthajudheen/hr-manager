import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: string) => void;
}

const QRScanner = ({ onScan }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const qrCodeRegionId = "qr-reader";

    const startScanner = async () => {
      try {
        // Create scanner instance
        scannerRef.current = new Html5Qrcode(qrCodeRegionId);

        // Start scanning
        await scannerRef.current.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10, // Frames per second
            qrbox: { width: 250, height: 250 }, // Scanning box size
          },
          (decodedText) => {
            // Success callback - QR code scanned
            console.log("QR Code scanned:", decodedText);
            onScan(decodedText);
            // Stop scanning after successful scan
            stopScanner();
          },
          (errorMessage) => {
            // Error callback - ignore continuous scanning errors
            // console.log("Scanning...", errorMessage);
          }
        );

        setIsScanning(true);
        setError(null);
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        setError(err?.message || "Could not access camera. Please ensure camera permissions are granted.");
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
          setIsScanning(false);
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      stopScanner();
    };
  }, [onScan]);

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
      <CardContent className="p-4">
        <div className="relative">
          {/* QR Scanner Container */}
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
          
          {/* Instructions */}
          <div className="mt-3 text-center">
            <p className="text-sm text-muted-foreground">
              {isScanning ? "📷 Position QR code within the frame" : "Starting camera..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;