import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Site, User, WorkSchedule, BaristaAnnouncement } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { ArrowLeft, Search, UserPlus, CheckCircle2, LogOut, Lock, Clock, Timer, Calendar, Bell, Eye, EyeOff } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { TimeEntry } from "@shared/schema";

type Step = "search" | "verify" | "enter-amount" | "confirm" | "success";

// Login screen component
function BaristaLogin({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
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
        userId?: string;
        user?: User;
        message: string;
      };
    },
    onSuccess: (data) => {
      if (data.requires2FA && data.userId) {
        setRequires2FA(true);
        setUserId(data.userId);
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
    mutationFn: async ({ userId, token }: { userId: string; token: string }) => {
      const response: any = await apiRequest("POST", "/api/auth/login-2fa", { userId, token });
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
    if (!userId || !twoFactorToken) {
      toast({
        title: t('common.error'),
        description: t('users.enter2FACode'),
        variant: "destructive",
      });
      return;
    }
    verify2FAMutation.mutate({ userId, token: twoFactorToken });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chart-1 to-chart-2">
      <header className="bg-gradient-to-r from-chart-1 to-chart-2 text-white p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
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

      <main className="max-w-md mx-auto p-4 pt-12">
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
                    setUserId(null);
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

  // Fetch ALL sites (including inactive) so effect runs when activation status changes
  const { data: allSites = [], isLoading: sitesLoading, isError: sitesError } = useQuery<Site[]>({
    queryKey: ['/api/admin/sites'],
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
      <main className="max-w-md mx-auto p-4">
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

        {/* CLOCK IN/OUT SECTION */}
        {step === "search" && (
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-chart-1" />
                <div>
                  <p className="text-sm font-medium">
                    {currentTimeEntry ? t('barista.clockedIn') : t('barista.notClockedIn')}
                  </p>
                  {currentTimeEntry && currentTimeEntry.clockInTime && (
                    <p className="text-xs text-muted-foreground">
                      {t('barista.since')} {new Date(currentTimeEntry.clockInTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div>
                {currentTimeEntry ? (
                  <Button
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    variant="destructive"
                    size="sm"
                    data-testid="button-clock-out"
                  >
                    {clockOutMutation.isPending ? t('barista.clockOutting') : t('barista.clockOut')}
                  </Button>
                ) : (
                  <Button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending || activeSites.length === 0}
                    size="sm"
                    data-testid="button-clock-in"
                  >
                    {clockInMutation.isPending ? t('barista.clockingIn') : t('barista.clockIn')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* WORK SCHEDULE SECTION */}
        {step === "search" && (
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
                      <p className="text-xs text-muted-foreground">{sites.find(s => s.id === schedule.siteId)?.name || 'N/A'}</p>
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
        )}

        {/* ANNOUNCEMENTS SECTION */}
        {step === "search" && (
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
        )}

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
