import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  customerId: string;
  customerName: string;
}

export default function QRCodeDisplay({ customerId, customerName }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-background rounded-xl" data-testid="qr-code-container">
      <h3 className="text-xl font-semibold text-foreground">Your QR Code</h3>
      <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center p-16 border-4 border-primary">
        <QRCode value={customerId} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} data-testid="qr-code" />
      </div>
      <p className="text-lg text-muted-foreground">Show this to the barista</p>
      <p className="text-base text-muted-foreground">ID: {customerId}</p>
    </div>
  );
}
