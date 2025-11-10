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
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Step = "search" | "verify" | "enter-amount" | "confirm" | "success";

export default function BaristaApp() {
  // Auto-update detection
  useAutoUpdate();
  const { t } = useTranslation();
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("Main Store");

  // Search customers by phone number
  const { data: searchResults = [], isError, error } = useQuery<Customer[]>({
    queryKey: ['/api/customers/search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(t('barista.searchError'));
      }
      return response.json();
    },
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
        title: t('barista.transactionSuccess'),
        description: t('barista.transactionSuccessDesc'),
      });
      setTimeout(() => {
        handleReset();
      }, 2500);
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      const errorMessage = error?.message || error?.toString() || t('barista.transactionError');
      toast({
        title: t('common.error'),
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
        title: t('barista.invalidAmount'),
        description: t('barista.invalidAmountDesc'),
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
              <h1 className="text-sm font-bold">{t('barista.title')}</h1>
              <span className="text-xs opacity-70" data-testid="text-version">{t('common.version')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent border-b border-white/30 outline-none text-xs py-0.5"
              data-testid="select-location"
            >
              <option value="Main Store" className="text-foreground">{t('barista.locations.main')}</option>
              <option value="Night Bazaar" className="text-foreground">{t('barista.locations.bazaar')}</option>
              <option value="Central Plaza Expo" className="text-foreground">{t('barista.locations.expo')}</option>
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
                <h2 className="text-2xl font-bold text-foreground">{t('barista.findCustomer')}</h2>
                <p className="text-sm text-muted-foreground">{t('barista.searchByPhone')}</p>
              </div>
              
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder={t('barista.enterPhone')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                  data-testid="input-search-phone"
                />
                <p className="text-xs text-muted-foreground">{t('barista.searchHint')}</p>
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
                            <p className="text-2xl font-bold text-foreground">{customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getTierColor(customer.tier)}>
                              {t(`customer.tiers.${customer.tier}`)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{customer.points} {t('customer.pointsAbbr')}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">{t('barista.noCustomers')}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('barista.tryDifferentPhone')}
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
                <h3 className="font-semibold text-lg text-foreground">{t('barista.newCustomer')}</h3>
                <p className="text-sm text-muted-foreground">{t('barista.registerOnApp')}</p>
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
                  <p className="text-3xl font-bold text-foreground mt-2">{selectedCustomer.phone}</p>
                  
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{t('customer.points')}</p>
                      <p className="text-2xl font-bold text-chart-1">{selectedCustomer.points}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{t('customer.tier')}</p>
                      <Badge className={getTierColor(selectedCustomer.tier)}>
                        {t(`customer.tiers.${selectedCustomer.tier}`)}
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
                  {t('barista.confirmCustomer')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleVerifyReject}
                  className="w-full"
                  data-testid="button-wrong-customer"
                >
                  {t('barista.wrongCustomer')}
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
                <h2 className="text-2xl font-bold text-foreground">{t('barista.enterAmount')}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('barista.customer')}: {selectedCustomer.name}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('barista.spendAmount')}</label>
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
                      <span className="text-sm text-muted-foreground">{t('barista.pointsToEarn')}:</span>
                      <span className="text-2xl font-bold text-chart-1">
                        +{Math.floor(parseFloat(amount) / 10)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('barista.pointsFormula')}
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
                  {t('common.next')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("verify")}
                  className="w-full"
                  data-testid="button-back-to-verify"
                >
                  {t('common.back')}
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
                <h2 className="text-2xl font-bold text-foreground">{t('barista.confirmTransaction')}</h2>
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
                    <p className="text-xl font-bold text-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base text-muted-foreground">{t('barista.spendAmountLabel')}:</span>
                    <span className="text-3xl font-bold text-foreground">฿{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base text-muted-foreground">{t('barista.pointsEarnedLabel')}:</span>
                    <span className="text-3xl font-bold text-chart-1">+{points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('barista.location')}:</span>
                    <span className="font-medium text-foreground">{location}</span>
                  </div>
                </div>

                <div className="p-3 bg-chart-1/10 rounded-lg border border-chart-1/20">
                  <p className="text-sm text-center text-muted-foreground">
                    {t('barista.newTotal')}: <span className="font-bold text-foreground">{selectedCustomer.points + points} {t('customer.points')}</span>
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
                  {createTransaction.isPending ? t('barista.processing') : t('barista.confirmTransaction')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("enter-amount")}
                  className="w-full"
                  disabled={createTransaction.isPending}
                  data-testid="button-edit-amount"
                >
                  {t('barista.editAmount')}
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
              <h2 className="text-2xl font-bold text-foreground">{t('common.success')}!</h2>
              <p className="text-lg text-muted-foreground">
                {points} {t('barista.pointsAdded')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('barista.startingNew')}
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
