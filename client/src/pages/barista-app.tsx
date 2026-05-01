import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Site, User, WorkSchedule, BaristaAnnouncement, WeeklySpecial, BaristaPerformance } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { ArrowLeft, Search, UserPlus, CheckCircle2, LogOut, Lock, Clock, Timer, Calendar, Bell, Eye, EyeOff, Sparkles, Trophy, Menu, Package, Star, Zap, Heart, Gift, TrendingUp, Target, Award, Rocket, Crown } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { TimeEntry, Product } from "@shared/schema";
import { ProductCard } from "@/components/ProductCard";

type Step = "search" | "verify" | "enter-amount" | "confirm" | "success";

// Icon options for weekly specials
const SPECIAL_ICONS = [
  { id: 'trophy', Icon: Trophy, color: 'text-yellow-500' },
  { id: 'star', Icon: Star, color: 'text-yellow-400' },
  { id: 'zap', Icon: Zap, color: 'text-blue-500' },
  { id: 'heart', Icon: Heart, color: 'text-red-500' },
  { id: 'gift', Icon: Gift, color: 'text-green-500' },
  { id: 'trending', Icon: TrendingUp, color: 'text-emerald-500' },
  { id: 'target', Icon: Target, color: 'text-orange-500' },
  { id: 'award', Icon: Award, color: 'text-purple-500' },
  { id: 'rocket', Icon: Rocket, color: 'text-indigo-500' },
  { id: 'crown', Icon: Crown, color: 'text-amber-500' },
];

const COLOR_THEMES = [
  { id: 'yellow', name: 'Sunshine', gradient: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-900' },
  { id: 'blue', name: 'Ocean', gradient: 'from-blue-400 to-cyan-500', textColor: 'text-blue-900' },
  { id: 'purple', name: 'Royal', gradient: 'from-purple-400 to-pink-500', textColor: 'text-purple-900' },
  { id: 'green', name: 'Fresh', gradient: 'from-green-400 to-emerald-500', textColor: 'text-green-900' },
  { id: 'red', name: 'Fire', gradient: 'from-red-400 to-rose-500', textColor: 'text-red-900' },
];

// Parse imageUrl to get icon and theme
const parseImageUrl = (imageUrl: string | null) => {
  const [iconId = 'trophy', themeId = 'yellow'] = (imageUrl || 'trophy:yellow').split(':');
  const iconData = SPECIAL_ICONS.find(i => i.id === iconId) || SPECIAL_ICONS[0];
  const themeData = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0];
  return { iconData, themeData };
};

// Login screen component
function BaristaLogin({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('🔐 Login attempt:', { email, passwordLength: password.length });
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await response.json();
      console.log('✅ Login response:', data);
      return data as { 
        success: boolean; 
        requires2FA: boolean; 
        pendingToken?: string;
        user?: User;
        message: string;
      };
    },
    onSuccess: (data) => {
      if (data.requires2FA && data.pendingToken) {
        setRequires2FA(true);
        setPendingToken(data.pendingToken);
        toast({
          title: t('common.success'),
          description: t('users.enter2FACode'),
        });
      } else if (data.user) {
        // Check if barista role
        if (data.user.role !== 'barista' && data.user.role !== 'manager' && data.user.role !== 'admin') {
          toast({
            title: t('common.error'),
            description: "Only baristas can access this app",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: t('common.success'),
          description: t('common.loginSuccess'),
        });
        onLoginSuccess(data.user);
      }
    },
    onError: (error: any) => {
      console.error('❌ Login error:', error);
      toast({
        title: t('common.error'),
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async ({ pendingToken, token }: { pendingToken: string; token: string }) => {
      const response: any = await apiRequest("POST", "/api/auth/login-2fa", { pendingToken, token });
      return response as { 
        success: boolean; 
        user?: User;
        message: string;
      };
    },
    onSuccess: (data) => {
      if (data.user) {
        toast({
          title: t('common.success'),
          description: t('common.loginSuccess'),
        });
        onLoginSuccess(data.user);
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "2FA verification failed",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleLogin called', { email, passwordLength: password.length });
    if (!email || !password) {
      console.log('❌ Missing credentials');
      toast({
        title: t('common.error'),
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }
    console.log('📤 Calling loginMutation.mutate');
    loginMutation.mutate({ email, password });
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingToken || !twoFactorToken) {
      toast({
        title: t('common.error'),
        description: t('users.enter2FACode'),
        variant: "destructive",
      });
      return;
    }
    verify2FAMutation.mutate({ pendingToken, token: twoFactorToken });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chart-1 to-chart-2">
      <header className="bg-gradient-to-r from-chart-1 to-chart-2 text-white p-4 shadow-lg">
        <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 object-cover rounded-full" />
            <div>
              <h1 className="text-sm font-bold">{t('barista.title')}</h1>
              <span className="text-xs opacity-70">{t('common.version')}</span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-md md:max-w-xl mx-auto p-4 pt-12">
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chart-1/10 mb-4">
              <Lock className="w-8 h-8 text-chart-1" />
            </div>
            <h2 className="text-2xl font-bold">
              {requires2FA ? t('users.enter2FACode') : t('common.login')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {requires2FA 
                ? "Enter the 6-digit code from your authenticator app"
                : "Sign in to access the barista app"}
            </p>
          </div>

          {!requires2FA ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  data-testid="input-email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    data-testid="input-password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? t('common.loading') : t('common.login')}
              </Button>

              <Alert className="mt-4">
                <AlertDescription className="text-xs text-muted-foreground text-center">
                  {t('barista.adminLoginHelp')}
                </AlertDescription>
              </Alert>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('users.verificationCode')}</label>
                <Input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  autoComplete="one-time-code"
                  data-testid="input-2fa-token"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  className="flex-1" 
                  onClick={() => {
                    setRequires2FA(false);
                    setPendingToken(null);
                    setTwoFactorToken("");
                  }}
                  data-testid="button-back-to-login"
                >
                  {t('common.back')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={verify2FAMutation.isPending}
                  data-testid="button-verify-2fa"
                >
                  {verify2FAMutation.isPending ? t('common.loading') : t('users.verify')}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}

// Product Menu Sheet Component
function ProductMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("all");

  const CATEGORIES = [
    { value: "all", label: t('customer.menu.allItems') },
    { value: "soft_serve", label: t('customer.menu.categories.soft_serve') },
    { value: "milk_tea", label: t('customer.menu.categories.milk_tea') },
    { value: "fruit_tea", label: t('customer.menu.categories.fruit_tea') },
    { value: "shakes", label: t('customer.menu.categories.shakes') },
    { value: "sundaes", label: t('customer.menu.categories.sundaes') },
    { value: "float_drinks", label: t('customer.menu.categories.float_drinks') },
  ];

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const filteredProducts = activeCategory === "all"
    ? allProducts.filter(p => p.available)
    : allProducts.filter(p => p.available && p.category === activeCategory);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl font-bold">{t('customer.productMenu')}</SheetTitle>
          <SheetDescription>
            {t('barista.productMenuDescription')}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto w-full">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="flex-1 min-w-[80px]"
                data-testid={`tab-category-${cat.value}`}
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="mt-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('customer.menu.noItems')}</h3>
                  <p className="text-muted-foreground">{t('customer.menu.checkBack')}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      variant="reference"
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function BaristaApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  // Auto-update detection
  useAutoUpdate();
  const { t } = useTranslation();
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Quick Register state
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);
  const [quickRegisterName, setQuickRegisterName] = useState("");
  const [quickRegisterEmail, setQuickRegisterEmail] = useState("");
  const [quickRegisterPhone, setQuickRegisterPhone] = useState("");
  
  // Track if barista is clocked in - determines which view to show
  const [isClockedIn, setIsClockedIn] = useState(false);

  // Fetch ALL sites (including inactive) so effect runs when activation status changes
  const { data: allSites = [], isLoading: sitesLoading, isError: sitesError } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
  });

  // Fetch current time entry for clock in/out status
  const { data: currentTimeEntry } = useQuery<TimeEntry | null>({
    queryKey: ['/api/barista/time-entry/current'],
  });

  // Fetch work schedules for logged-in barista
  const { data: workSchedules = [] } = useQuery<WorkSchedule[]>({
    queryKey: ['/api/work-schedules/me'],
  });

  // Fetch active barista announcements
  const { data: announcements = [] } = useQuery<BaristaAnnouncement[]>({
    queryKey: ['/api/barista-announcements'],
  });

  // Fetch active weekly special
  const { data: weeklySpecial } = useQuery<WeeklySpecial | null>({
    queryKey: ['/api/weekly-special/active'],
  });

  // Fetch my performance stats
  const { data: myPerformance } = useQuery<BaristaPerformance | null>({
    queryKey: ['/api/barista/performance/me'],
  });

  // Fetch weekly leaderboard
  const { data: leaderboard = [] } = useQuery<Array<BaristaPerformance & { user: User }>>({
    queryKey: ['/api/barista/leaderboard'],
  });

  // Derive transaction eligibility from live sites - filter active downstream
  const activeSites = allSites.filter(s => s.isActive);
  const locationIsValid = location ? activeSites.some(s => s.name === location) : false;
  const canTransact = activeSites.length > 0 && locationIsValid;

  // Keep location in sync with active sites
  useEffect(() => {
    if (activeSites.length > 0) {
      // If current location is not in the sites list, reset to first site
      if (!locationIsValid) {
        setLocation(activeSites[0].name);
      }
    } else {
      // No active sites - clear location
      setLocation("");
    }
  }, [allSites]);

  // Sync isClockedIn state with currentTimeEntry and reset step if needed
  useEffect(() => {
    const newClockedInStatus = !!currentTimeEntry && !!currentTimeEntry.clockInTime && !currentTimeEntry.clockOutTime;
    setIsClockedIn(newClockedInStatus);
    
    // Reset to search step if user is not clocked in
    if (!newClockedInStatus && step !== "search") {
      setStep("search");
    }
  }, [currentTimeEntry]);

  // Immediately reset workflow when all sites deactivate
  useEffect(() => {
    if (activeSites.length === 0 && step !== "search") {
      toast({
        title: t('common.warning'),
        description: t('barista.sitesDeactivated'),
        variant: "destructive",
      });
      handleReset();
    }
  }, [activeSites.length, step]);

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

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const site = activeSites.find(s => s.name === location);
      if (!site) {
        throw new Error("Please select a site");
      }
      const today = new Date().toISOString().split('T')[0];
      return await apiRequest('POST', '/api/barista/clock-in', {
        siteId: site.id,
        date: today,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/barista/time-entry/current'] });
      toast({
        title: t('barista.clockInSuccess'),
        description: t('barista.clockInSuccessDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('barista.clockInFailed'),
        description: error?.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!currentTimeEntry?.id) {
        throw new Error("No active clock-in entry");
      }
      return await apiRequest('POST', `/api/barista/clock-out/${currentTimeEntry.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/barista/time-entry/current'] });
      toast({
        title: t('barista.clockOutSuccess'),
        description: t('barista.clockOutSuccessDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('barista.clockOutFailed'),
        description: error?.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  // Quick Register mutation
  const quickRegisterMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const response = await apiRequest('POST', '/api/customers', data);
      const result = await response.json();
      
      // If 409 conflict (customer already exists), return the existing customer with a flag
      if (response.status === 409 && result.customer) {
        return { ...result.customer, isExisting: true };
      }
      
      return result;
    },
    onSuccess: (customerData: Customer & { isExisting?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers/search'] });
      setQuickRegisterOpen(false);
      setQuickRegisterName("");
      setQuickRegisterEmail("");
      setQuickRegisterPhone("");
      
      if (customerData.isExisting) {
        // Customer already existed - show different message
        toast({
          title: t('barista.customerExists'),
          description: t('barista.customerExistsDesc', { name: customerData.name }),
        });
      } else {
        // New customer registered
        toast({
          title: t('barista.customerRegistered'),
          description: t('barista.customerRegisteredDesc', { name: customerData.name }),
        });
      }
      
      // Auto-select the customer (whether new or existing)
      handleSelectCustomer(customerData);
    },
    onError: (error: any) => {
      toast({
        title: t('barista.registrationFailed'),
        description: error?.message || "Failed to register customer",
        variant: "destructive",
      });
    },
  });

  const handleQuickRegisterSubmit = () => {
    if (!quickRegisterName || !quickRegisterPhone) {
      toast({
        title: t('common.error'),
        description: t('barista.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }
    quickRegisterMutation.mutate({
      name: quickRegisterName,
      email: quickRegisterEmail,
      phone: quickRegisterPhone,
    });
  };

  const handleSelectCustomer = (customer: Customer) => {
    // Block if cannot transact
    if (!canTransact) {
      toast({
        title: t('common.error'),
        description: t('barista.noActiveSitesError'),
        variant: "destructive",
      });
      return;
    }
    setSelectedCustomer(customer);
    setStep("verify");
  };

  const handleVerifyConfirm = () => {
    // Block if cannot transact
    if (!canTransact) {
      toast({
        title: t('common.error'),
        description: t('barista.noActiveSitesError'),
        variant: "destructive",
      });
      handleReset();
      return;
    }
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
    // Block if cannot transact
    if (!canTransact) {
      toast({
        title: t('common.error'),
        description: t('barista.noActiveSitesError'),
        variant: "destructive",
      });
      handleReset();
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedCustomer) return;
    
    // Critical: Block transaction if cannot transact (no active sites or invalid location)
    if (!canTransact) {
      toast({
        title: t('common.error'),
        description: t('barista.noActiveSitesError'),
        variant: "destructive",
      });
      handleReset();
      return;
    }
    
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
        <div className="max-w-md md:max-w-3xl mx-auto flex items-center justify-between">
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
            {activeSites.length > 0 ? (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-transparent border-b border-white/30 outline-none text-xs py-0.5"
                data-testid="select-location"
              >
                {activeSites.map((site) => (
                  <option key={site.id} value={site.name} className="text-foreground">
                    {site.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs opacity-70">{t('barista.noActiveSites')}</span>
            )}
            <Button
              onClick={() => setMenuOpen(true)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
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
            <Button
              onClick={onLogout}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md md:max-w-3xl mx-auto p-4">
        {/* Sites Loading/Error States */}
        {sitesLoading && (
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">{t('common.loading')}</p>
          </Card>
        )}
        {sitesError && (
          <Card className="p-4 mb-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-800">{t('barista.sitesLoadError')}</p>
          </Card>
        )}
        {!sitesLoading && activeSites.length === 0 && (
          <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-800 font-semibold">{t('barista.noActiveSitesWarning')}</p>
            <p className="text-xs text-yellow-700 mt-1">{t('barista.contactAdmin')}</p>
          </Card>
        )}

        {/* CLOCK IN DASHBOARD - Show when NOT clocked in */}
        {!isClockedIn && (
          <>
            {/* CLOCK IN SECTION */}
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-chart-1" />
                  <div>
                    <p className="text-sm font-medium">{t('barista.notClockedIn')}</p>
                    <p className="text-xs text-muted-foreground">{t('barista.clockInToStart')}</p>
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending || activeSites.length === 0}
                    size="sm"
                    data-testid="button-clock-in"
                  >
                    {clockInMutation.isPending ? t('barista.clockingIn') : t('barista.clockIn')}
                  </Button>
                </div>
              </div>
            </Card>

            {/* WORK SCHEDULE SECTION */}
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-chart-2" />
                <h3 className="font-semibold">{t('barista.mySchedule')}</h3>
              </div>
              {workSchedules.length > 0 ? (
                <div className="space-y-2">
                  {workSchedules.slice(0, 3).map((schedule) => (
                    <div key={schedule.id} className="text-sm flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{new Date(schedule.scheduledDate).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{allSites.find((s: Site) => s.id === schedule.siteId)?.name || 'N/A'}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>{schedule.startTime} - {schedule.endTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('barista.noSchedules')}</p>
              )}
            </Card>

            {/* ANNOUNCEMENTS SECTION */}
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5 text-chart-3" />
                <h3 className="font-semibold">{t('barista.announcements')}</h3>
              </div>
              {announcements.length > 0 ? (
                <div className="space-y-2">
                  {announcements.slice(0, 2).map((announcement) => (
                    <div key={announcement.id} className="text-sm p-3 bg-muted rounded">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium">{announcement.title}</p>
                        <Badge variant={announcement.priority >= 5 ? 'destructive' : 'secondary'} className="text-xs">
                          {t(`admin.barista.types.${announcement.type}`)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{announcement.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('barista.noAnnouncements')}</p>
              )}
            </Card>

            {/* MY PERFORMANCE SECTION */}
            <Card className="p-4 mb-4" data-testid="performance-stats">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold">{t('barista.myPerformance')}</h3>
                <Badge variant="outline" className="ml-auto text-xs">{t('barista.thisWeek')}</Badge>
              </div>
              {myPerformance ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted rounded">
                    <p className="text-2xl font-bold text-chart-1">{myPerformance.transactionCount}</p>
                    <p className="text-xs text-muted-foreground">{t('barista.totalTransactions')}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <p className="text-2xl font-bold text-yellow-600">{myPerformance.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">{t('barista.totalPoints')}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <p className="text-2xl font-bold text-chart-3">{myPerformance.specialOffersSold}</p>
                    <p className="text-xs text-muted-foreground">{t('barista.specialsSold')}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <p className="text-2xl font-bold text-chart-4">{myPerformance.newCustomerSignups}</p>
                    <p className="text-xs text-muted-foreground">{t('barista.newSignups')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">{t('barista.noPerformanceData')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('barista.startSellingToEarnPoints')}</p>
                </div>
              )}
            </Card>

            {/* LEADERBOARD SECTION */}
            <Card className="p-4 mb-4" data-testid="leaderboard">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold">{t('barista.leaderboard')}</h3>
                <Badge variant="outline" className="ml-auto text-xs">{t('barista.top')} 5</Badge>
              </div>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry: any, index: number) => (
                    <div key={entry.id} className="flex items-center gap-3 p-2 bg-muted rounded" data-testid={`leaderboard-entry-${index}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.user?.firstName} {entry.user?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{entry.transactionCount} {t('barista.totalTransactions').toLowerCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-600">{entry.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">{t('barista.totalPoints').toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('barista.noPerformanceData')}</p>
              )}
            </Card>
          </>
        )}

        {/* CUSTOMER SEARCH & TRANSACTION WORKFLOW - Show ONLY when clocked in */}
        {isClockedIn && step === "search" && (
          <>
            {/* CLOCK OUT INFO CARD */}
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">{t('barista.clockedIn')}</p>
                    {currentTimeEntry && currentTimeEntry.clockInTime && (
                      <p className="text-xs text-muted-foreground">
                        {t('barista.since')} {new Date(currentTimeEntry.clockInTime).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    variant="destructive"
                    size="sm"
                    data-testid="button-clock-out"
                  >
                    {clockOutMutation.isPending ? t('barista.clockOutting') : t('barista.clockOut')}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* SEARCH STEP */}
        {isClockedIn && step === "search" && (
          <div className="pt-8 space-y-6">
            {/* Customer Search Card - Now at the top */}
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

            {/* Quick Register - Yellow Yens Button */}
            <Card className="p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-chart-1 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground mb-1">{t('barista.quickRegister')}</h3>
                  <p className="text-sm text-muted-foreground">{t('barista.quickRegisterDesc')}</p>
                </div>
                <Button 
                  className="bg-chart-1 hover:bg-chart-1/90 text-white"
                  onClick={() => setQuickRegisterOpen(true)}
                  data-testid="button-quick-register"
                >
                  {t('barista.register')}
                </Button>
              </div>
            </Card>

            {/* Weekly Special Banner - Now at the bottom for future expansion */}
            {weeklySpecial && (() => {
              const { iconData, themeData } = parseImageUrl(weeklySpecial.imageUrl);
              const SpecialIcon = iconData.Icon;
              return (
                <Card className={`bg-gradient-to-r ${themeData.gradient} border-0 p-6 shadow-lg`} data-testid="weekly-special-banner">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-20 h-20 bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <SpecialIcon className={`w-12 h-12 ${iconData.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={`w-5 h-5 ${themeData.textColor}`} />
                        <span className={`text-sm font-semibold ${themeData.textColor} uppercase`}>{t('barista.weeklySpecial')}</span>
                      </div>
                      <h3 className={`text-lg font-bold ${themeData.textColor} mb-1`}>{weeklySpecial.title}</h3>
                      <p className={`text-sm ${themeData.textColor} opacity-90 mb-2`}>{weeklySpecial.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`bg-white/20 ${themeData.textColor} hover:bg-white/30 backdrop-blur-sm border-white/30`}>
                          {t('barista.earnBonus', { points: weeklySpecial.bonusPoints })}
                        </Badge>
                        <span className={`text-xs ${themeData.textColor} opacity-75`}>{t('barista.promoteThis')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {/* VERIFY STEP */}
        {isClockedIn && step === "verify" && selectedCustomer && (
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
                  disabled={!canTransact}
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
        {isClockedIn && step === "enter-amount" && selectedCustomer && (
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
                  disabled={!amount || parseFloat(amount) <= 0 || !canTransact}
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
        {isClockedIn && step === "confirm" && selectedCustomer && (
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
                  disabled={createTransaction.isPending || !canTransact}
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
        {isClockedIn && step === "success" && (
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
      
      {/* Product Menu Sheet */}
      <ProductMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />

      {/* Quick Register Dialog */}
      <Dialog open={quickRegisterOpen} onOpenChange={setQuickRegisterOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-quick-register">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-chart-1" />
              {t('barista.quickRegister')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-name">{t('customer.name')} *</Label>
              <Input
                id="quick-name"
                placeholder={t('customer.enterName')}
                value={quickRegisterName}
                onChange={(e) => setQuickRegisterName(e.target.value)}
                data-testid="input-quick-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-phone">{t('customer.phone')} *</Label>
              <Input
                id="quick-phone"
                type="tel"
                placeholder={t('customer.enterPhone')}
                value={quickRegisterPhone}
                onChange={(e) => setQuickRegisterPhone(e.target.value)}
                data-testid="input-quick-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-email">{t('customer.email')} ({t('common.optional')})</Label>
              <Input
                id="quick-email"
                type="email"
                placeholder={t('customer.enterEmail')}
                value={quickRegisterEmail}
                onChange={(e) => setQuickRegisterEmail(e.target.value)}
                data-testid="input-quick-email"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setQuickRegisterOpen(false)}
              data-testid="button-cancel-register"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="bg-chart-1 hover:bg-chart-1/90 text-white"
              onClick={handleQuickRegisterSubmit}
              disabled={quickRegisterMutation.isPending}
              data-testid="button-submit-register"
            >
              {quickRegisterMutation.isPending ? t('common.saving') : t('barista.register')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Barista App Wrapper with Authentication
export default function BaristaAppWithAuth() {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  const handleLogout = () => {
    setLoggedInUser(null);
  };

  if (!loggedInUser) {
    return <BaristaLogin onLoginSuccess={setLoggedInUser} />;
  }

  return <BaristaApp user={loggedInUser} onLogout={handleLogout} />;
}
