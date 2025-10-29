import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  customerId: string;
  customerName: string;
}

export default function QRCodeDisplay({ customerId, customerName }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 bg-background rounded-xl" data-testid="qr-code-container">
      <h3 className="text-base font-semibold text-foreground">Your QR Code</h3>
      <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center p-3 border-[3px] border-primary">
        <QRCode value={customerId} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} data-testid="qr-code" />
      </div>
      <p className="text-sm text-muted-foreground">Show this to the barista</p>
      <p className="text-xs text-muted-foreground">ID: {customerId}</p>
    </div>
  );
}
