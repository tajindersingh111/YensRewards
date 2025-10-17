import { useState } from "react";
import QRScanner from "@/components/QRScanner";
import CustomerVerification from "@/components/CustomerVerification";
import ReceiptCapture from "@/components/ReceiptCapture";
import TransactionConfirm from "@/components/TransactionConfirm";
import InstallPrompt from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

type Step = "scan" | "verify" | "capture" | "confirm" | "success";

export default function BaristaApp() {
  //todo: remove mock functionality
  const [step, setStep] = useState<Step>("scan");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerTier, setCustomerTier] = useState<"bronze" | "silver" | "gold">("bronze");
  const [amount, setAmount] = useState(0);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [location, setLocation] = useState("Main Store");

  const handleScan = (id: string) => {
    setCustomerId(id);
    setCustomerName("Somchai Prasert");
    setCustomerPoints(1250);
    setCustomerTier("gold");
    setStep("verify");
  };

  const handleVerifyConfirm = () => {
    setStep("capture");
  };

  const handleVerifyReject = () => {
    setStep("scan");
    setCustomerId("");
    setCustomerName("");
    setCustomerPoints(0);
    setCustomerTier("bronze");
  };

  const handleReceiptSubmit = (amt: number, url: string) => {
    setAmount(amt);
    setReceiptUrl(url);
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("success");
    setTimeout(() => {
      setStep("scan");
      setCustomerId("");
      setCustomerName("");
      setAmount(0);
      setReceiptUrl("");
    }, 2000);
  };

  const handleCancel = () => {
    setStep("scan");
    setCustomerId("");
    setCustomerName("");
    setCustomerPoints(0);
    setCustomerTier("bronze");
    setAmount(0);
    setReceiptUrl("");
  };

  const points = Math.floor(amount / 10);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-chart-1 text-white p-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
              <h1 className="text-xl font-bold">Barista App</h1>
            </div>
            {step !== "scan" && (
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent border-b border-white/30 outline-none"
              data-testid="select-location"
            >
              <option value="Main Store" className="text-foreground">Main Store</option>
              <option value="Night Bazaar" className="text-foreground">Night Bazaar</option>
              <option value="Weekend Market" className="text-foreground">Weekend Market</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-6">
        {step === "scan" && (
          <div className="max-w-md mx-auto">
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {step === "verify" && (
          <div className="max-w-md mx-auto">
            <CustomerVerification
              customerName={customerName}
              points={customerPoints}
              tier={customerTier}
              onConfirm={handleVerifyConfirm}
              onReject={handleVerifyReject}
            />
          </div>
        )}

        {step === "capture" && (
          <div className="max-w-md mx-auto">
            <ReceiptCapture customerName={customerName} onSubmit={handleReceiptSubmit} />
          </div>
        )}

        {step === "confirm" && (
          <div className="max-w-md mx-auto">
            <TransactionConfirm
              customerName={customerName}
              amount={amount}
              points={points}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>
        )}

        {step === "success" && (
          <div className="max-w-md mx-auto text-center space-y-4 p-8">
            <div className="w-20 h-20 rounded-full bg-chart-3 text-white flex items-center justify-center mx-auto text-4xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-foreground">Success!</h2>
            <p className="text-muted-foreground">
              {customerName} earned {points} points
            </p>
          </div>
        )}
      </main>

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
