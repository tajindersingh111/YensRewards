import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { ArrowLeft, Search, UserPlus, CheckCircle2 } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

type Step = "search" | "verify" | "enter-amount" | "confirm" | "success";

export default function BaristaApp() {
  // Auto-update detection
  useAutoUpdate();
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("Main Store");

  // Search customers by phone number
  const { data: searchResults = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers/search', searchQuery],
    enabled: searchQuery.length >= 3,
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async (data: { customerId: string; amount: string; points: number; location: string; type: string }) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      if (selectedCustomer) {
        queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer.id] });
      }
      setStep("success");
      toast({
        title: "Success!",
        description: "Transaction processed successfully",
      });
      setTimeout(() => {
        handleReset();
      }, 2500);
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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep("verify");
  };

  const handleVerifyConfirm = () => {
    setStep("enter-amount");
  };

  const handleVerifyReject = () => {
    setSelectedCustomer(null);
    setStep("search");
  };

  const handleAmountSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid spend amount",
        variant: "destructive",
      });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedCustomer) return;
    
    const amountNum = parseFloat(amount);
    const points = Math.floor(amountNum / 10);
    
    console.log("Submitting transaction:", {
      customerId: selectedCustomer.id,
      amount: amount,
      points,
      location,
    });
    
    createTransaction.mutate({
      customerId: selectedCustomer.id,
      amount: amount,
      points,
      location,
      type: "purchase",
    });
  };

  const handleReset = () => {
    setStep("search");
    setSelectedCustomer(null);
    setAmount("");
    setSearchQuery("");
  };

  const handleCancel = () => {
    handleReset();
  };

  const points = amount ? Math.floor(parseFloat(amount) / 10) : 0;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "gold": return "bg-yellow-400 text-yellow-900";
      case "silver": return "bg-gray-400 text-gray-900";
      case "bronze": return "bg-amber-600 text-amber-50";
      default: return "bg-gray-300 text-gray-900";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <span className="text-xs opacity-70" data-testid="text-version">v91</span>
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
            {step !== "search" && (
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
        {/* SEARCH STEP */}
        {step === "search" && (
          <div className="pt-8 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <Search className="w-12 h-12 mx-auto text-chart-1" />
                <h2 className="text-2xl font-bold text-foreground">Find Customer</h2>
                <p className="text-sm text-muted-foreground">Search by phone number</p>
              </div>
              
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Enter phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                  data-testid="input-search-phone"
                />
                <p className="text-xs text-muted-foreground">Type at least 3 characters to search</p>
              </div>

              {/* Search Results */}
              {searchQuery.length >= 3 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((customer: Customer) => (
                      <Card
                        key={customer.id}
                        className="p-4 hover-elevate cursor-pointer"
                        onClick={() => handleSelectCustomer(customer)}
                        data-testid={`customer-result-${customer.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            {customer.photo ? (
                              <AvatarImage src={customer.photo} alt={customer.name} />
                            ) : (
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                                {customer.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getTierColor(customer.tier)}>
                              {customer.tier}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{customer.points} pts</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">No customers found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try a different phone number
                      </p>
                    </Card>
                  )}
                </div>
              )}
            </Card>

            {/* New Customer Registration */}
            <Card className="p-6 text-center space-y-4">
              <UserPlus className="w-10 h-10 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg text-foreground">New Customer?</h3>
                <p className="text-sm text-muted-foreground">They can register on the Customer App</p>
              </div>
            </Card>
          </div>
        )}

        {/* VERIFY STEP */}
        {step === "verify" && selectedCustomer && (
          <div className="pt-8">
            <Card className="p-6 space-y-6">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  {selectedCustomer.photo ? (
                    <AvatarImage src={selectedCustomer.photo} alt={selectedCustomer.name} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                      {selectedCustomer.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedCustomer.name}</h2>
                  <p className="text-lg text-muted-foreground mt-1">{selectedCustomer.phone}</p>
                  
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Points</p>
                      <p className="text-2xl font-bold text-chart-1">{selectedCustomer.points}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Tier</p>
                      <Badge className={getTierColor(selectedCustomer.tier)}>
                        {selectedCustomer.tier}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyConfirm}
                  className="w-full"
                  size="lg"
                  data-testid="button-confirm-customer"
                >
                  Confirm Customer
                </Button>
                <Button
                  variant="outline"
                  onClick={handleVerifyReject}
                  className="w-full"
                  data-testid="button-wrong-customer"
                >
                  Wrong Customer
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ENTER AMOUNT STEP */}
        {step === "enter-amount" && selectedCustomer && (
          <div className="pt-8">
            <Card className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Enter Spend Amount</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Customer: {selectedCustomer.name}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Spend Amount (฿)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl h-16 text-center"
                    autoFocus
                    step="0.01"
                    min="0"
                    data-testid="input-amount"
                  />
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <Card className="p-4 bg-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Points to Earn:</span>
                      <span className="text-2xl font-bold text-chart-1">
                        +{Math.floor(parseFloat(amount) / 10)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ฿10 = 1 point
                    </p>
                  </Card>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleAmountSubmit}
                  className="w-full"
                  size="lg"
                  disabled={!amount || parseFloat(amount) <= 0}
                  data-testid="button-continue-amount"
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("verify")}
                  className="w-full"
                  data-testid="button-back-to-verify"
                >
                  Back
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === "confirm" && selectedCustomer && (
          <div className="pt-8">
            <Card className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Confirm Transaction</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="w-12 h-12">
                    {selectedCustomer.photo ? (
                      <AvatarImage src={selectedCustomer.photo} alt={selectedCustomer.name} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                        {selectedCustomer.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Spend Amount:</span>
                    <span className="text-xl font-bold text-foreground">฿{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Points Earned:</span>
                    <span className="text-xl font-bold text-chart-1">+{points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium text-foreground">{location}</span>
                  </div>
                </div>

                <div className="p-3 bg-chart-1/10 rounded-lg border border-chart-1/20">
                  <p className="text-sm text-center text-muted-foreground">
                    New Total: <span className="font-bold text-foreground">{selectedCustomer.points + points} points</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleConfirm}
                  className="w-full"
                  size="lg"
                  disabled={createTransaction.isPending}
                  data-testid="button-confirm-transaction"
                >
                  {createTransaction.isPending ? "Processing..." : "Confirm Transaction"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("enter-amount")}
                  className="w-full"
                  disabled={createTransaction.isPending}
                  data-testid="button-edit-amount"
                >
                  Edit Amount
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === "success" && (
          <div className="pt-8">
            <Card className="p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Success!</h2>
              <p className="text-lg text-muted-foreground">
                {points} points added
              </p>
              <p className="text-sm text-muted-foreground">
                Starting new transaction...
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
