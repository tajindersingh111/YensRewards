import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";

interface QRCodeDisplayProps {
  customerId: string;
  customerName: string;
}

export default function QRCodeDisplay({ customerId, customerName }: QRCodeDisplayProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center gap-2 p-2 bg-background rounded-xl" data-testid="qr-code-container">
      <h3 className="text-base font-semibold text-foreground">{t('customer.yourQRCode')}</h3>
      <div className="w-[85%] aspect-square bg-white rounded-2xl flex items-center justify-center p-3 border-[3px] border-primary">
        <QRCode value={customerId} size={217} style={{ height: "auto", maxWidth: "100%", width: "100%" }} data-testid="qr-code" />
      </div>
      <p className="text-sm text-muted-foreground">{t('customer.scanAtCounter')}</p>
    </div>
  );
}
