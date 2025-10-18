import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  customerId: string;
  customerName: string;
}

export default function QRCodeDisplay({ customerId, customerName }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-xl" data-testid="qr-code-container">
      <h3 className="text-lg font-semibold text-foreground">Your QR Code</h3>
      <div className="w-[264px] h-[264px] bg-white rounded-lg flex items-center justify-center p-3 border-4 border-primary">
        <QRCode value={customerId} size={240} data-testid="qr-code" />
      </div>
      <p className="text-sm text-muted-foreground">Show this to the barista</p>
      <p className="text-xs text-muted-foreground">ID: {customerId}</p>
    </div>
  );
}
