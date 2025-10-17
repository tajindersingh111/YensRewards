import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Camera } from "lucide-react";
import { useState } from "react";

interface QRScannerProps {
  onScan: (customerId: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    //todo: remove mock functionality
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onScan("customer-123");
      console.log("QR scanned: customer-123");
    }, 1500);
  };

  return (
    <Card className="p-8" data-testid="card-qr-scanner">
      <div className="flex flex-col items-center gap-6">
        <div className="w-64 h-64 border-4 border-dashed border-primary rounded-xl flex items-center justify-center bg-muted/30 relative">
          {isScanning ? (
            <ScanLine className="w-32 h-32 text-primary animate-pulse" />
          ) : (
            <Camera className="w-32 h-32 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            {isScanning ? "Scanning..." : "Scan Customer QR"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Position the QR code within the frame
          </p>
        </div>

        <Button
          onClick={handleScan}
          disabled={isScanning}
          size="lg"
          className="w-full max-w-xs"
          data-testid="button-scan"
        >
          <ScanLine className="w-5 h-5 mr-2" />
          {isScanning ? "Scanning..." : "Start Scan"}
        </Button>
      </div>
    </Card>
  );
}
