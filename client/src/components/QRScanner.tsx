import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Phone, X, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (customerId: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannedRef = useRef(false);

  const lookupCustomer = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch(`/api/customers/phone/${phoneNumber}`);
      if (!res.ok) throw new Error("Customer not found");
      return await res.json();
    },
    onSuccess: (customer) => {
      onScan(customer.id);
      setPhone("");
      setPhoneMode(false);
    },
    onError: () => {
      alert("Customer not found. Please check the phone number.");
    },
  });

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleStartScan = async () => {
    setError(null);
    setIsScanning(true);
    isScannedRef.current = false;

    try {
      // Request camera permissions first
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (!isScannedRef.current) {
            isScannedRef.current = true;
            handleScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          console.log("QR scan error:", errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      let errorMsg = "Camera not available. Please use phone lookup below.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Camera access denied. Please enable camera permissions in your browser settings, then try again. Use phone lookup as backup.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No camera found. Please use phone lookup below.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Camera is in use by another app. Close other apps and try again, or use phone lookup.";
      }
      
      setError(errorMsg);
      setIsScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    console.log("Scanned QR code:", decodedText);
    
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    onScan(decodedText);
  };

  const handleStopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  };

  const handlePhoneLookup = () => {
    if (phone) {
      lookupCustomer.mutate(phone);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && phone) {
      handlePhoneLookup();
    }
  };

  return (
    <Card className="p-4 w-full" data-testid="card-qr-scanner">
      <div className="flex flex-col items-center gap-6">
        {phoneMode ? (
          // Phone Lookup Mode (Backup Option)
          <div className="w-full space-y-3">
            <div className="text-center space-y-1">
              <Phone className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-foreground">
                Customer Lookup
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter customer's phone number
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                className="h-12"
                data-testid="input-phone-lookup"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handlePhoneLookup}
                disabled={!phone || lookupCustomer.isPending}
                className="flex-1"
                size="lg"
                data-testid="button-lookup-submit"
              >
                {lookupCustomer.isPending ? "Looking up..." : "Find Customer"}
              </Button>
              <Button
                onClick={() => {
                  setPhoneMode(false);
                  setPhone("");
                }}
                variant="outline"
                size="lg"
                data-testid="button-lookup-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : isScanning ? (
          // Scanning Mode
          <div className="w-full space-y-4">
            <div id="qr-reader" className="rounded-xl overflow-hidden"></div>
            {error && (
              <p className="text-base text-destructive text-center font-medium">{error}</p>
            )}
            <Button
              onClick={handleStopScan}
              variant="outline"
              size="lg"
              className="w-full"
              data-testid="button-stop-scan"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel Scan
            </Button>
          </div>
        ) : (
          // QR Scanner Mode (Primary Option)
          <div className="w-full space-y-4">
            <div className="space-y-3">
              <div className="w-full aspect-square max-w-sm mx-auto border-4 border-dashed border-primary rounded-xl flex items-center justify-center bg-muted/30">
                <Camera className="w-24 h-24 text-primary" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-foreground">
                  Scan Customer QR
                </h3>
                <p className="text-sm text-muted-foreground">
                  Point camera at customer's QR code
                </p>
              </div>

              <Button
                onClick={handleStartScan}
                size="lg"
                className="w-full"
                data-testid="button-scan"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Start Camera
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center font-medium">{error}</p>
              )}
            </div>

            {/* Phone Lookup - Backup Method */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={() => setPhoneMode(true)}
              variant="outline"
              size="lg"
              className="w-full"
              data-testid="button-phone-lookup"
            >
              <Phone className="w-4 h-4 mr-2" />
              Lookup by Phone
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
