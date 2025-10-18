import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Phone, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (customerId: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
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
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Camera not available. Please use phone lookup instead.");
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
    <Card className="p-8" data-testid="card-qr-scanner">
      <div className="flex flex-col items-center gap-6">
        {isScanning ? (
          <div className="w-full max-w-md space-y-4">
            <div id="qr-reader" className="rounded-xl overflow-hidden"></div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
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
          <div className="w-full max-w-sm space-y-6">
            {/* Phone Lookup - Primary Method */}
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Phone className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-xl font-bold text-foreground">
                  Find Customer
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter customer's phone number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  data-testid="input-phone-lookup"
                />
              </div>

              <Button
                onClick={handlePhoneLookup}
                disabled={!phone || lookupCustomer.isPending}
                className="w-full"
                size="lg"
                data-testid="button-lookup-submit"
              >
                {lookupCustomer.isPending ? "Looking up..." : "Find Customer"}
              </Button>
            </div>

            {/* QR Scan - Alternative Method */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={handleStartScan}
              variant="outline"
              size="lg"
              className="w-full"
              data-testid="button-scan"
            >
              <ScanLine className="w-5 h-5 mr-2" />
              Scan QR Code
            </Button>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
