import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, Phone } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface QRScannerProps {
  onScan: (customerId: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");

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

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // Use mock customer ID for QR scanning (to be replaced with real QR scanner)
      onScan("cust-001");
    }, 1500);
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

            <Button
              onClick={() => setPhoneMode(true)}
              variant="outline"
              size="sm"
              data-testid="button-phone-lookup"
            >
              <Phone className="w-4 h-4 mr-2" />
              Lookup by Phone
            </Button>
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
