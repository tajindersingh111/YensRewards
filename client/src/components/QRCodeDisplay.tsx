import { QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  customerId: string;
  customerName: string;
}

export default function QRCodeDisplay({ customerId, customerName }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-xl" data-testid="qr-code-container">
      <h3 className="text-lg font-semibold text-foreground">Your QR Code</h3>
      <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border-4 border-primary">
        <QrCode className="w-40 h-40 text-foreground" data-testid="qr-code-icon" />
      </div>
      <p className="text-sm text-muted-foreground">Show this to the barista</p>
    </div>
  );
}
