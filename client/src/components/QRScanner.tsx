import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, Phone, X } from "lucide-react";
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
      setError("Unable to access camera. Please check permissions.");
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

  return (
    <Card className="p-8" data-testid="card-qr-scanner">
      <div className="flex flex-col items-center gap-6">
        {!phoneMode ? (
          <>
            <div className="w-full max-w-md">
              {isScanning ? (
                <div className="space-y-4">
                  <div id="qr-reader" className="rounded-xl overflow-hidden"></div>
                  <Button
                    onClick={handleStopScan}
                    variant="outline"
                    size="lg"
                    className="w-full"
                    data-testid="button-stop-scan"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Stop Scanning
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-full aspect-square border-4 border-dashed border-primary rounded-xl flex items-center justify-center bg-muted/30 relative">
                    <Camera className="w-32 h-32 text-muted-foreground" />
                  </div>

                  <div className="text-center space-y-2 mt-6">
                    <h3 className="text-xl font-bold text-foreground">
                      Scan Customer QR
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Position the QR code within the camera frame
                    </p>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleStartScan}
                    size="lg"
                    className="w-full mt-4"
                    data-testid="button-scan"
                  >
                    <ScanLine className="w-5 h-5 mr-2" />
                    Start Scan
                  </Button>

                  <Button
                    onClick={() => setPhoneMode(true)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    data-testid="button-phone-lookup"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Lookup by Phone
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-full max-w-xs space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  Customer Lookup
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter customer phone number
                </p>
              </div>

              <Input
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-phone-lookup"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handlePhoneLookup}
                  disabled={!phone || lookupCustomer.isPending}
                  className="flex-1"
                  data-testid="button-lookup-submit"
                >
                  {lookupCustomer.isPending ? "Looking up..." : "Lookup"}
                </Button>
                <Button
                  onClick={() => {
                    setPhoneMode(false);
                    setPhone("");
                  }}
                  variant="outline"
                  data-testid="button-lookup-cancel"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
