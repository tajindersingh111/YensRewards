import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Promotion, Product } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import Celebration from "@/components/Celebration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Home, User, RefreshCw, Gift, ChevronRight, IceCream } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoUrl from "@assets/Yens_logo_high_res_1766925576641.png";
import heroPromoUrl from "@assets/Screenshot_2026-01-27_at_22.41.34_1769521341373.png";

export default function CustomerAppV3() {
  useAutoUpdate();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    birthday: "",
    photo: "",
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"points" | "tier-upgrade">("points");
  const previousDataRef = useRef<{ points: number; tier: string } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const { toast } = useToast();

  const enableAudio = () => {
    if (!audioEnabled) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.001;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(0.001);
      setAudioEnabled(true);
    }
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem("customer_phone");
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery<Customer>({
    queryKey: ['/api/customers/phone', phone],
    enabled: !!phone,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!customer) {
      previousDataRef.current = null;
      return;
    }

    const currentPoints = customer.points || 0;
    const currentTier = customer.tier || "bronze";

    if (previousDataRef.current) {
      const previousPoints = previousDataRef.current.points;
      const previousTier = previousDataRef.current.tier;

      if (currentTier !== previousTier) {
        setCelebrationType("tier-upgrade");
        setShowCelebration(true);
        toast({
          title: t('customer.tierUpgrade', { tier: t(`customer.tiers.${currentTier}`) }),
          description: t('customer.tierUpgradeDesc'),
        });
      } else if (currentPoints > previousPoints) {
        const earnedPoints = currentPoints - previousPoints;
        setCelebrationType("points");
        setShowCelebration(true);
        toast({
          title: t('customer.pointsEarned', { points: earnedPoints }),
          description: t('customer.totalPoints', { points: currentPoints }),
        });
      }
    }

    previousDataRef.current = {
      points: currentPoints,
      tier: currentTier,
    };
  }, [customer?.points, customer?.tier, toast, t]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!customer,
  });

  const { data: promotions } = useQuery<Array<Promotion & { isRead: boolean }>>({
    queryKey: ['/api/customers', customer?.id, 'promotions'],
    enabled: !!customer?.id,
  });

  const loginMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("GET", `/api/customers/phone/${phoneNumber}`);
      return res.json();
    },
    onSuccess: (data: Customer | { notFound: boolean }) => {
      if ('notFound' in data) {
        setShowSignup(true);
      } else {
        localStorage.setItem("customer_phone", phoneInput);
        setPhone(phoneInput);
        setShowSignup(false);
      }
    },
    onError: () => {
      setShowSignup(true);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; email: string; birthday: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: (data: Customer) => {
      localStorage.setItem("customer_phone", phoneInput);
      setPhone(phoneInput);
      setShowSignup(false);
      toast({
        title: t('customer.welcomeTitle'),
        description: t('customer.accountCreated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('customer.accountCreateFailed'),
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneInput.trim()) {
      loginMutation.mutate(phoneInput.trim());
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.name && phoneInput) {
      signupMutation.mutate({
        phone: phoneInput,
        name: signupData.name,
        email: signupData.email || "",
        birthday: signupData.birthday || "",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_phone");
    setPhone(null);
    setPhoneInput("");
    setShowSignup(false);
    setSignupData({ name: "", email: "", birthday: "", photo: "" });
    queryClient.clear();
  };

  const handleRefresh = () => {
    refetchCustomer();
    toast({
      title: t('common.refreshed'),
      description: t('customer.dataUpdated'),
    });
  };

  const currentPoints = customer?.points || 0;
  const pointsToNextReward = 50 - (currentPoints % 50);
  const progressPercent = ((currentPoints % 50) / 50) * 100;

  const featuredPromotion = promotions?.[0];

  const rewardProducts = products.filter(p => p.available).slice(0, 4);

  if (!phone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yens-yellow/30 to-background flex flex-col">
        <header className="bg-yens-yellow p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Yens" className="w-10 h-10 rounded-full" />
            <span className="text-xl font-bold text-foreground">Yen's</span>
          </div>
          <LanguageSwitcher />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <img src={logoUrl} alt="Yens Logo" className="w-28 h-28 rounded-full mb-6 shadow-lg" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('customer.yensRewards')}</h1>
          <p className="text-muted-foreground mb-6 text-center">{t('customer.enterPhone')}</p>

          {!showSignup ? (
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <div>
                <Label htmlFor="phone">{t('customer.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0812345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="text-lg"
                  data-testid="input-phone"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-yens-yellow hover:bg-yens-yellow/90 text-foreground font-semibold"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? t('common.loading') : t('customer.accessRewards')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                {t('customer.newCustomer')}
              </p>
              <div>
                <Label htmlFor="name">{t('customer.name')} *</Label>
                <Input
                  id="name"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('customer.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="birthday">{t('customer.birthday')}</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={signupData.birthday}
                  onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })}
                  data-testid="input-birthday"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-yens-yellow hover:bg-yens-yellow/90 text-foreground font-semibold"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? t('common.loading') : t('customer.createAccount')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowSignup(false)}
                data-testid="button-back-to-login"
              >
                {t('common.back')}
              </Button>
            </form>
          )}
        </main>
        <InstallPrompt />
      </div>
    );
  }

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={logoUrl} alt="Yens" className="w-20 h-20 rounded-full mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100/50 pb-20">
      {/* Header */}
      <header className="bg-yens-yellow px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Yens" className="w-10 h-10 rounded-full" />
          <div>
            <span className="text-lg font-bold text-foreground">Yen's</span>
            <p className="text-xs text-muted-foreground">{t('common.version')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            className="hover-elevate"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 space-y-4" style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Hero Banner - Full promotional image (clickable) */}
        <Card 
          className="relative overflow-hidden rounded-2xl border-0 shadow-lg cursor-pointer hover-elevate"
          onClick={() => setLocation("/menu")}
          data-testid="button-order-now"
        >
          <img 
            src={heroPromoUrl} 
            alt="Yen's Ice Cream Promotion" 
            className="w-full h-auto object-cover"
          />
        </Card>

        {/* Points Progress Card */}
        <Card className="p-4 rounded-2xl border-0 shadow-md bg-white">
          <div className="flex items-center gap-4">
            {/* Points Badge Icon */}
            <div className="relative w-14 h-14 flex-shrink-0 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-orange-500">50</span>
              <div className="absolute -top-1 -left-1 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">$</span>
              </div>
            </div>
            
            {/* Points Text */}
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                {t('customer.pointsAway', { points: pointsToNextReward })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('customer.pointsUntilReward', { points: 50 })}
              </p>
            </div>
          </div>
        </Card>

        {/* Rewards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {t('customer.availableRewards')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("rewards")}
              className="text-primary"
              data-testid="button-view-all-rewards"
            >
              {t('common.viewAll')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {rewardProducts.map((product) => (
            <Card
              key={product.id}
              className="p-3 rounded-xl border-0 shadow-sm bg-white flex items-center gap-3 hover-elevate cursor-pointer"
              data-testid={`card-reward-${product.id}`}
            >
              {/* Product Image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-orange-100 flex-shrink-0">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IceCream className="w-8 h-8 text-orange-300" />
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{product.name}</h4>
                <p className="text-sm text-muted-foreground">50 Points</p>
              </div>

              {/* Points indicator dots */}
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < Math.min(3, Math.floor(currentPoints / 17))
                        ? "bg-orange-400"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border bottom-nav-safe" style={{ zIndex: 9999 }}>
        <div className="mx-auto w-full grid grid-cols-4 py-2" style={{ maxWidth: "480px" }}>
          <button
            onClick={() => { enableAudio(); setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center gap-1 py-2 hover-elevate active-elevate-2 ${
              activeTab === "home" ? "text-yens-yellow" : "text-muted-foreground"
            }`}
            aria-label={t('customer.home')}
            data-testid="button-nav-home"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">{t('customer.home')}</span>
          </button>
          <button
            onClick={() => setLocation("/menu")}
            className="flex flex-col items-center justify-center gap-1 py-2 hover-elevate active-elevate-2 text-muted-foreground"
            aria-label={t('customer.menuNav')}
            data-testid="button-nav-menu"
          >
            <IceCream className="w-6 h-6" />
            <span className="text-xs font-medium">{t('customer.menuNav')}</span>
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`flex flex-col items-center justify-center gap-1 py-2 hover-elevate active-elevate-2 ${
              activeTab === "rewards" ? "text-yens-yellow" : "text-muted-foreground"
            }`}
            aria-label={t('customer.rewards')}
            data-testid="button-nav-rewards"
          >
            <Gift className="w-6 h-6" />
            <span className="text-xs font-medium">{t('customer.rewards')}</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 py-2 hover-elevate active-elevate-2 ${
              activeTab === "profile" ? "text-yens-yellow" : "text-muted-foreground"
            }`}
            aria-label={t('customer.profileNav')}
            data-testid="button-nav-profile"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">{t('customer.profileNav')}</span>
          </button>
        </div>
      </nav>

      <InstallPrompt />

      {showCelebration && (
        <Celebration
          type={celebrationType}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
