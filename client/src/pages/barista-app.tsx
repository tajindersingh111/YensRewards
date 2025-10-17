import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Transaction } from "@shared/schema";
import QRScanner from "@/components/QRScanner";
import CustomerVerification from "@/components/CustomerVerification";
import ReceiptCapture from "@/components/ReceiptCapture";
import TransactionConfirm from "@/components/TransactionConfirm";
import InstallPrompt from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

type Step = "scan" | "verify" | "capture" | "confirm" | "success";

export default function BaristaApp() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("scan");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState(0);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [location, setLocation] = useState("Main Store");

  // Fetch customer data when scanned
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId && step === "verify",
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async (data: { customerId: string; amount: string; points: number; location: string; receiptUrl?: string; type?: string }) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      setStep("success");
      toast({
        title: "Success!",
        description: "Transaction processed successfully",
      });
      setTimeout(() => {
        handleReset();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive",
      });
      console.error("Transaction error:", error);
    },
  });

  const handleScan = (id: string) => {
    setCustomerId(id);
    setStep("verify");
  };

  const handleVerifyConfirm = () => {
    setStep("capture");
  };

  const handleVerifyReject = () => {
    setCustomerId("");
    setStep("scan");
  };

  const handleReceiptSubmit = (amt: number, url: string) => {
    setAmount(amt);
    setReceiptUrl(url);
    setStep("confirm");
  };

  const handleConfirm = () => {
    const points = Math.floor(amount / 10);
    createTransaction.mutate({
      customerId,
      amount: amount.toString(),
      points,
      location,
      type: "purchase",
      receiptUrl: receiptUrl || undefined,
    });
  };

  const handleReset = () => {
    setStep("scan");
    setCustomerId("");
    setAmount(0);
    setReceiptUrl("");
  };

  const handleCancel = () => {
    handleReset();
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
              <option value="Central Plaza Expo" className="text-foreground">Central Plaza Expo</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4">
        {step === "scan" && (
          <div className="flex flex-col items-center gap-6 pt-8">
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {step === "verify" && (
          <div className="pt-8">
            {customerLoading ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-chart-1 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading customer...</p>
              </Card>
            ) : customer ? (
              <CustomerVerification
                customerName={customer.name}
                customerPhoto={customer.photo || undefined}
                points={customer.points}
                tier={customer.tier as "bronze" | "silver" | "gold"}
                onConfirm={handleVerifyConfirm}
                onReject={handleVerifyReject}
              />
            ) : (
              <Card className="p-8 text-center space-y-4">
                <h3 className="text-xl font-bold text-foreground">Customer Not Found</h3>
                <p className="text-muted-foreground">Customer ID: {customerId}</p>
                <Button onClick={handleVerifyReject} data-testid="button-try-again">
                  Try Again
                </Button>
              </Card>
            )}
          </div>
        )}

        {step === "capture" && (
          <div className="pt-8">
            <ReceiptCapture onSubmit={handleReceiptSubmit} />
          </div>
        )}

        {step === "confirm" && customer && (
          <div className="pt-8">
            <TransactionConfirm
              customer={{
                id: customer.id,
                name: customer.name,
                photo: customer.photo || undefined,
              }}
              amount={amount}
              points={points}
              location={location}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>
        )}

        {step === "success" && (
          <div className="pt-8">
            <Card className="p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Success!</h2>
              <p className="text-muted-foreground">
                {points} points added
              </p>
            </Card>
          </div>
        )}
      </main>

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
