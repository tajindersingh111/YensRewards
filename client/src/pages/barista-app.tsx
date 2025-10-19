import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { ArrowLeft, MapPin, Home } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

type Step = "scan" | "verify" | "capture" | "confirm" | "success" | "register";

export default function BaristaApp() {
  const [, setLocationPath] = useLocation();
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

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: { phone: string; name: string; email?: string; birthdate?: string }): Promise<Customer> => {
      const response = await apiRequest('POST', '/api/customers', data);
      return await response.json();
    },
    onSuccess: (data: Customer) => {
      toast({
        title: "Customer Created!",
        description: `${data.name} has been registered successfully`,
      });
      // Auto-select the new customer for transaction
      setCustomerId(data.id.toString());
      setStep("verify");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
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
    onError: (error: any) => {
      console.error("Transaction error:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to process transaction";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
    
    console.log("Submitting transaction:", {
      customerId,
      amount: amount.toString(),
      points,
      location,
      receiptUrl,
    });
    
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
      {/* Header - EXACTLY matches Customer App v41 dimensions */}
      <header className="bg-chart-1 text-white p-4 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Button
            onClick={() => setLocationPath("/")}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            data-testid="button-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold">Barista</h1>
              <span className="text-xs opacity-70" data-testid="text-version">v49</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent border-b border-white/30 outline-none text-xs py-0.5"
              data-testid="select-location"
            >
              <option value="Main Store" className="text-foreground">Main</option>
              <option value="Night Bazaar" className="text-foreground">Bazaar</option>
              <option value="Central Plaza Expo" className="text-foreground">Expo</option>
            </select>
            {step !== "scan" && (
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4">
        {step === "scan" && (
          <div className="flex flex-col items-center gap-6 pt-4">
            <QRScanner onScan={handleScan} />
            <div className="w-full">
              <Card className="p-6 text-center space-y-4">
                <h3 className="font-semibold text-lg text-foreground">New Customer?</h3>
                <p className="text-base text-muted-foreground">Register them manually if they need help</p>
                <Button 
                  onClick={() => setStep("register")} 
                  variant="outline" 
                  className="w-full"
                  size="lg"
                  data-testid="button-register-customer"
                >
                  Register New Customer
                </Button>
              </Card>
            </div>
          </div>
        )}

        {step === "register" && (
          <div className="pt-8">
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Register New Customer</h2>
                <p className="text-sm text-muted-foreground">Help customers create their account</p>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const phone = formData.get('phone') as string;
                  const name = formData.get('name') as string;
                  const email = formData.get('email') as string;
                  const birthdate = formData.get('birthdate') as string;
                  
                  createCustomer.mutate({
                    phone,
                    name,
                    email: email || undefined,
                    birthdate: birthdate || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+66 81 234 5678"
                    required
                    className="w-full px-4 py-2 rounded-md border border-input bg-background"
                    data-testid="input-register-phone"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Customer name"
                    required
                    className="w-full px-4 py-2 rounded-md border border-input bg-background"
                    data-testid="input-register-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="customer@example.com"
                    className="w-full px-4 py-2 rounded-md border border-input bg-background"
                    data-testid="input-register-email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Birthday (Optional)</label>
                  <input
                    type="date"
                    name="birthdate"
                    className="w-full px-4 py-2 rounded-md border border-input bg-background"
                    data-testid="input-register-birthdate"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("scan")}
                    className="flex-1"
                    data-testid="button-cancel-register"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createCustomer.isPending}
                    data-testid="button-submit-register"
                  >
                    {createCustomer.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </Card>
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

        {step === "capture" && customer && (
          <div className="pt-8">
            <ReceiptCapture 
              customerName={customer.name}
              onSubmit={handleReceiptSubmit} 
            />
          </div>
        )}

        {step === "confirm" && customer && (
          <div className="pt-8">
            <TransactionConfirm
              customerName={customer.name}
              amount={amount}
              points={points}
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
