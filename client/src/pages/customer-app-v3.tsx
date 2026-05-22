import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Promotion, Product } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import Celebration from "@/components/Celebration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Home, User, RefreshCw, Gift, ChevronRight, IceCream, Check, Copy, ExternalLink, Star, LogOut, X, QrCode, Smartphone, ShieldCheck, Cake, Coins } from "lucide-react";
import { SiLine } from "react-icons/si";
import TransactionList from "@/components/TransactionList";
import CustomerReviewPage from "@/components/CustomerReviewPage";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoUrl from "@assets/Yens_logo_high_res_1766925576641.png";
import heroPromoUrl from "@assets/Screenshot_2026-01-27_at_22.41.34_1769521341373.png";
import { initializeSeamlessSignup, isRunningInLine } from "@/pages/customer/EnrollmentLogic";

const LINE_FOLLOW_URL = "https://line.me/R/ti/p/@752afsdq";
const LINE_ID = "@752afsdq";

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
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [linkCodeCopied, setLinkCodeCopied] = useState(false);
  const [showLinePrompt, setShowLinePrompt] = useState(false);
  const [liffLinking, setLiffLinking] = useState(false);
  const inLineApp = isRunningInLine();
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

  const [otpStep, setOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem("customer_phone");
    if (!savedPhone) {
      setSessionCheckDone(true);
      return;
    }
    apiRequest('GET', '/api/customers/auth/status')
      .then((res) => {
        if (res.ok) {
          setPhone(savedPhone);
        } else {
          localStorage.removeItem("customer_phone");
        }
      })
      .catch(() => { localStorage.removeItem("customer_phone"); })
      .finally(() => setSessionCheckDone(true));
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

  // Transactions for profile
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ['/api/customers', customer?.id, 'transactions'],
    enabled: !!customer?.id,
  });

  // LINE link code
  const { data: linkCodeData } = useQuery<{ linkCode: string }>({
    queryKey: ['/api/customers', customer?.id, 'link-code'],
    enabled: !!customer?.id,
  });

  // Format transactions for display
  const formattedTransactions = transactions.map((tx: any) => ({
    ...tx,
    date: tx.createdAt || tx.date,
  }));

  // Show LINE follow prompt once per phone if not yet connected
  useEffect(() => {
    if (!customer || customer.lineUid) return;
    const dismissedKey = `line_prompt_dismissed_${customer.phone}`;
    if (!localStorage.getItem(dismissedKey)) {
      const timer = setTimeout(() => setShowLinePrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [customer?.id, customer?.lineUid]);

  const dismissLinePrompt = (permanent = false) => {
    setShowLinePrompt(false);
    if (permanent && customer?.phone) {
      localStorage.setItem(`line_prompt_dismissed_${customer.phone}`, "1");
    }
  };

  const handleCopyLinkCode = () => {
    if (linkCodeData?.linkCode) {
      navigator.clipboard.writeText(linkCodeData.linkCode);
      setLinkCodeCopied(true);
      toast({
        title: t('customer.linkCodeCopied'),
        description: linkCodeData.linkCode,
      });
      setTimeout(() => setLinkCodeCopied(false), 2000);
    }
  };

  // LIFF seamless connect — used when the customer opens the app inside LINE browser
  const handleLiffConnect = useCallback(async () => {
    setLiffLinking(true);
    try {
      const token = await initializeSeamlessSignup();
      if (!token) return; // redirect in progress or LIFF not configured

      // Send the signed ID token — backend verifies it with LINE's API (prevents UID spoofing)
      const res = await apiRequest('POST', '/api/customers/liff-link', {
        idToken: token.idToken,
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: 'Could not link LINE', description: data.message, variant: 'destructive' });
        return;
      }

      toast({
        title: 'LINE Connected',
        description: data.bonusAwarded > 0
          ? `+${data.bonusAwarded} bonus points added to your account!`
          : 'Your LINE account is now linked.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/phone', phone] });
    } catch (err) {
      toast({ title: 'Connection failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLiffLinking(false);
    }
  }, [phone, toast]);

  const signupMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; email: string; birthday: string }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || t('customer.accountCreateFailed'));
      }
      return res.json();
    },
    onSuccess: async () => {
      setShowSignup(false);
      toast({
        title: t('customer.welcomeTitle'),
        description: t('customer.accountCreated'),
      });
      // OTP request after signup to verify phone ownership
      try {
        await apiRequest('POST', '/api/customers/auth/request', { phone: phoneInput.trim() });
        setOtpStep(true);
      } catch {
        setOtpError(t('customer.loginError'));
      }
    },
    onError: (error: any) => {
      if (error.message?.includes('already exists')) {
        setOtpError(t('customer.loginError'));
        setShowSignup(false);
        handleLogin(undefined as any);
      } else {
        toast({
          title: t('common.error'),
          description: error.message || t('customer.accountCreateFailed'),
          variant: "destructive",
        });
      }
    },
  });

  const handleOtpVerify = async () => {
    if (!otpInput.trim()) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await apiRequest('POST', '/api/customers/auth/verify', { phone: phoneInput.trim(), code: otpInput.trim() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOtpError(body.message || t('customer.invalidOtp'));
        return;
      }
      const customerData = await res.json();
      queryClient.setQueryData(['/api/customers/phone', phoneInput.trim()], customerData);
      localStorage.setItem("customer_phone", phoneInput.trim());
      setPhone(phoneInput.trim());
      setOtpStep(false);
      setOtpInput("");
    } catch {
      setOtpError(t('customer.invalidOtp'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneInput.trim()) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      // OTP request is non-enumerable — always returns 200
      await apiRequest('POST', '/api/customers/auth/request', { phone: phoneInput.trim() });
      setOtpStep(true);
    } catch {
      setOtpError(t('customer.loginError'));
    } finally {
      setOtpLoading(false);
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

  // Session check in progress
  if (!sessionCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yens-yellow/30 to-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yens-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* PREMIER BLUE-900 HERO */}
        <div className="bg-blue-900 pt-16 pb-24 text-center px-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,_#FCD34D_0%,_transparent_40%)]" />
          {/* Language switcher - top right */}
          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>
          <div className="relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <img
              src={logoUrl}
              alt="Yen's Thai"
              className="w-24 h-24 rounded-full mx-auto ring-4 ring-yellow-400 border-4 border-blue-900 mb-6 shadow-2xl object-cover"
            />
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
              {t('customer.yensRewards', "Yen's Rewards")}
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="h-px w-6 bg-yellow-400/30" />
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em]">
                Loyalty &amp; Membership
              </p>
              <span className="h-px w-6 bg-yellow-400/30" />
            </div>
          </div>
        </div>

        {/* OVERLAPPING ENTRY CARD */}
        <div className="-mt-12 px-5 max-w-md mx-auto pb-12 relative z-20">
          <Card className="p-8 shadow-2xl border-none rounded-[2rem] bg-white animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Adaptive Subtitle Header */}
            <div className="space-y-2 mb-6">
              <p className="text-base font-bold text-slate-800 text-center">
                {otpStep
                  ? t('auth.verifyPhone', "Verify Your Identity")
                  : showSignup
                    ? t('auth.joinFamily', "Join the Yen's Family")
                    : t('auth.welcomeBack', "Welcome Back")}
              </p>
              <p className="text-xs text-slate-400 text-center leading-relaxed px-4 font-medium">
                {otpStep
                  ? t('auth.otpSent', "We've sent a 6-digit code to your handset.")
                  : t('auth.loginDesc', "Experience the finest Thai Soft Serve with exclusive member benefits.")}
              </p>
            </div>

            {otpStep ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t('customer.otpSentTo', { phone: phoneInput })}
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleOtpVerify()}
                  className="text-lg tracking-widest text-center"
                  maxLength={6}
                  data-testid="input-otp"
                />
                {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
                <Button
                  onClick={handleOtpVerify}
                  className="w-full bg-yens-yellow text-foreground font-semibold"
                  disabled={otpLoading}
                  data-testid="button-verify-otp"
                >
                  {otpLoading ? t('common.loading') : t('customer.verifyCode')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setShowSignup(true); setOtpStep(false); setOtpError(null); setOtpInput(""); }}
                  data-testid="button-signup-instead"
                >
                  {t('customer.newCustomer')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setOtpStep(false); setOtpError(null); setOtpInput(""); setShowSignup(false); }}
                  data-testid="button-back-to-phone"
                >
                  {t('common.back')}
                </Button>
              </div>
            ) : !showSignup ? (
              <form onSubmit={handleLogin} className="space-y-4">
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
                {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
                <Button
                  type="submit"
                  className="w-full bg-yens-yellow text-foreground font-semibold"
                  disabled={otpLoading}
                  data-testid="button-login"
                >
                  {otpLoading ? t('common.loading') : t('customer.accessRewards')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setShowSignup(true); setOtpError(null); }}
                  data-testid="button-show-signup"
                >
                  {t('customer.newCustomer')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
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
                  className="w-full bg-yens-yellow text-foreground font-semibold"
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
          </Card>

          {/* Footer Support Line */}
          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Nakhon Sawan · Established 2024
          </p>
        </div>
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header - Compact yellow banner same width as content */}
      <header className="bg-blue-900 text-white py-3 px-4 flex items-center justify-between gap-1 sticky top-0 z-50 shadow-lg border-b border-white/5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={logoUrl}
            alt="Yens Logo"
            className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-yellow-400 border-2 border-blue-900 object-cover shadow-md"
          />
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">
              {t('customer.yensRewards')}
            </h1>
            <span
              className="text-[8px] font-black text-blue-300 uppercase tracking-[0.2em] mt-1 opacity-70"
              data-testid="text-version"
            >
              {t('common.version')} v2.4
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <LanguageSwitcher />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            className="text-white hover:bg-white/10 w-9 h-9 rounded-xl"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 text-blue-300" />
          </Button>
        </div>
      </header>

      {/* Hero Banner - Only show on Home tab */}
      {activeTab === "home" && (
        <div 
          className="overflow-hidden cursor-pointer px-4 max-w-[480px] md:max-w-[680px] mx-auto"
          onClick={() => window.open("https://r.grab.com/g/6-20260118_164808_8EB3D56733EB46359E49369E57E74885_MEXMPS-3-C6UCJBMJGYDXA2", "_blank")}
          data-testid="button-order-now"
        >
          <img 
            src={heroPromoUrl} 
            alt="Yen's Ice Cream Promotion" 
            className="w-full h-auto object-cover rounded-2xl shadow-lg"
            style={{ marginTop: "-85px" }}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 pt-4 space-y-4 pb-4 max-w-[480px] md:max-w-[680px] mx-auto">

        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            {/* Points Progress Card */}
        <Card className="p-6 rounded-[2rem] border-none shadow-xl bg-white relative overflow-hidden group" data-testid="card-reward-milestone">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Gift className="w-16 h-16 text-blue-900" />
          </div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="relative w-16 h-16 flex-shrink-0 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg -rotate-2">
              <span className="text-3xl font-black text-yellow-400 tracking-tighter">
                {pointsToNextReward}
              </span>
              <div className="absolute -bottom-2 -right-2 bg-white text-blue-900 text-[8px] font-black px-2 py-1 rounded-lg shadow-md border border-slate-100 uppercase tracking-tighter">
                to go
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Next Milestone
                </p>
              </div>
              <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight leading-tight">
                {t('customer.pointsAway', { points: pointsToNextReward })}
                <span className="text-yellow-500 ml-1">to a Free Treat</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest opacity-80">
                {t('customer.pointsUntilReward', { points: 50 })}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
            <div
              className="h-full bg-yellow-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, ((50 - pointsToNextReward) / 50) * 100)}%` }}
            />
          </div>
        </Card>

        {/* QR Code Card */}
        <Card className="p-6 rounded-[2rem] border-none shadow-2xl bg-white relative overflow-hidden group" data-testid="card-membership-pass">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <QrCode className="w-20 h-20 text-blue-900" />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="relative w-24 h-24 flex-shrink-0 bg-white rounded-2xl ring-4 ring-yellow-400 border-4 border-blue-900 p-2 shadow-xl overflow-hidden flex items-center justify-center">
              {customer?.id ? (
                <QRCode value={customer.id} size={80} level="H" />
              ) : (
                <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg" />
              )}
              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-900 rounded-bl-lg flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-yellow-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-900/10 text-blue-900 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                  Verified Member
                </Badge>
              </div>

              <h4 className="font-black text-xl text-blue-900 uppercase tracking-tighter truncate">
                {customer?.name || "Premium Guest"}
              </h4>

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-1">
                ID: {customer?.id?.substring(0, 12).toUpperCase()}
              </p>

              <button
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mt-4 hover:text-blue-900 transition-colors"
                data-testid="button-show-barista"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {t('customer.showToBarista')}
              </button>
            </div>
          </div>
        </Card>

        {/* Rewards List */}
        <div className="space-y-4">
          {rewardProducts.map((product) => (
            <Card
              key={product.id}
              className="p-4 rounded-[2rem] border-none shadow-xl bg-white flex items-center gap-4 hover:scale-[1.02] transition-all cursor-pointer group"
              data-testid={`card-reward-${product.id}`}
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-900/5 border border-blue-900/10 flex-shrink-0 relative">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IceCream className="w-8 h-8 text-blue-900 opacity-20" />
                  </div>
                )}
                <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-br-md" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-yellow-400 text-blue-900 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm">
                    50 {t('customer.points', 'Points')}
                  </Badge>
                </div>
                <h4 className="font-black text-blue-900 uppercase tracking-tighter truncate leading-tight">
                  {product.name}
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70">
                  Premium Selection
                </p>
              </div>

              <div className="flex flex-col gap-1.5 pr-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      i < Math.min(3, Math.floor(currentPoints / 17))
                        ? "bg-yellow-400 scale-110"
                        : "bg-blue-900/10"
                    }`}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
          </>
        )}

        {/* REWARDS TAB */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="bg-blue-900 rounded-[1.5rem] px-5 py-4">
              <h2 className="text-base font-black text-white uppercase tracking-tighter">{t('customer.rewards')}</h2>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mt-0.5">Redeem with your points</p>
            </div>
            <div className="space-y-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="p-4 rounded-[2rem] border-none shadow-xl bg-white flex items-center gap-4 group cursor-pointer hover:scale-[1.02] transition-all"
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-900/5 border border-blue-900/10 flex-shrink-0 relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IceCream className="w-8 h-8 text-blue-900 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-br-md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-yellow-400 text-blue-900 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm">
                        50 {t('customer.points', 'Points')}
                      </Badge>
                    </div>
                    <h4 className="font-black text-blue-900 uppercase tracking-tighter truncate leading-tight">{product.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70">Premium Selection</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            {/* VIP Portrait & Identity */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl animate-pulse" />
                <Avatar className="w-28 h-28 rounded-full ring-4 ring-yellow-400 border-4 border-white shadow-2xl relative z-10">
                  <AvatarImage src={customer?.photo ?? undefined} alt={customer?.name} className="object-cover" />
                  <AvatarFallback className="bg-blue-900 text-white text-3xl font-black">
                    {customer?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-blue-900 p-2 rounded-xl border-2 border-white shadow-lg z-20">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                </div>
              </div>

              <div className="text-center mt-6">
                <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">
                  {customer?.name}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                  {customer?.phone}
                </p>
                {customer?.birthday && (
                  <Badge variant="outline" className="mt-3 border-blue-900/10 text-blue-900/50 text-[8px] font-black uppercase tracking-widest px-3 py-1">
                    <Cake className="w-3 h-3 mr-1.5 opacity-50" />
                    {t('customer.birthday')}: {customer.birthday}
                  </Badge>
                )}
              </div>
            </div>

            {/* Balance Vault */}
            <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-blue-900 relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Coins className="w-12 h-12 text-yellow-400" />
              </div>
              <div className="p-8 text-center relative z-10">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">
                  Current Points Vault
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-5xl font-black text-yellow-400 tracking-tighter">
                    {currentPoints}
                  </span>
                  <span className="text-lg font-black text-white uppercase mt-2">Pts</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/10">
                <div className="h-full bg-yellow-400 opacity-50" style={{ width: `${Math.min(100, (currentPoints / 50) * 100)}%` }} />
              </div>
            </Card>

            {/* Golden Review CTA */}
            <Card
              className="p-6 border-none bg-yellow-400 shadow-xl rounded-[2rem] hover:scale-[1.02] transition-all cursor-pointer group overflow-hidden relative"
              onClick={() => setShowReviewPage(true)}
              data-testid="card-rate-us"
            >
              <div className="absolute -right-4 -top-4 p-8 opacity-10 pointer-events-none">
                <Star className="w-16 h-16 text-blue-900" />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-900 flex items-center justify-center shadow-lg">
                  <Star className="w-7 h-7 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-blue-900 uppercase tracking-tight">
                    {t('review.title')}
                  </h3>
                  <p className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest mt-1">
                    {t('review.rateExperience')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-900 opacity-30" />
              </div>
            </Card>

            {/* LINE Connection Card */}
            {customer?.lineUid ? (
              <Card className="p-6 border-none bg-white shadow-lg rounded-[2rem] relative overflow-hidden" data-testid="card-line-connected">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#06C755] flex items-center justify-center shadow-md flex-shrink-0">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
                      <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">
                        {t('customer.lineConnected')}
                      </h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('customer.lineConnectedDesc')}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 border-none bg-white shadow-lg rounded-[2rem]" data-testid="card-connect-line">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#06C755] flex items-center justify-center shadow-md flex-shrink-0">
                    <SiLine className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">{t('customer.connectLine')}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('customer.lineGetBonusPoints')}</p>
                  </div>
                </div>

                {/* LIFF one-tap connect — shown only when opened inside LINE browser */}
                {inLineApp ? (
                  <Button
                    className="w-full bg-[#06C755] text-white font-black uppercase tracking-tight"
                    onClick={handleLiffConnect}
                    disabled={liffLinking}
                    data-testid="button-liff-connect"
                  >
                    <SiLine className="w-5 h-5 mr-2" />
                    {liffLinking ? 'Connecting...' : 'One-tap LINE Connect'}
                  </Button>
                ) : (
                  /* Manual LINK code flow — shown in all other browsers */
                  linkCodeData?.linkCode && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('customer.lineLinkingCode')}</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="px-4 py-2 bg-[#06C755]/5 border-2 border-[#06C755] rounded-xl">
                            <span className="text-xl font-mono font-black text-[#06C755] tracking-wider">
                              {linkCodeData.linkCode}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-[#06C755] text-[#06C755]"
                            onClick={handleCopyLinkCode}
                            data-testid="button-copy-link-code"
                          >
                            {linkCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-[#06C755] text-white font-black uppercase tracking-tight"
                        onClick={() => window.open('https://line.me/R/oaMessage/@752afsdq', '_blank')}
                        data-testid="button-open-line-chat"
                      >
                        <SiLine className="w-5 h-5 mr-2" />
                        {t('customer.lineOpenChat')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )
                )}
              </Card>
            )}
            
            {/* Transaction History */}
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
            
            {/* Logout Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('customer.logout')}
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-blue-900 border-t border-white/5 bottom-nav-safe shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.3)]" style={{ zIndex: 9999 }}>
        <div className="mx-auto w-full grid grid-cols-4 py-3 max-w-[480px] md:max-w-[680px]">
          <button
            onClick={() => { enableAudio(); setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
              activeTab === "home" ? "text-yellow-400 scale-110" : "text-blue-300/40 hover:text-blue-200"
            }`}
            data-testid="button-nav-home"
          >
            <Home className={`w-5 h-5 ${activeTab === "home" ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : ""}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('customer.home')}</span>
            {activeTab === "home" && <div className="w-1 h-1 bg-yellow-400 rounded-full mt-0.5 animate-pulse" />}
          </button>
          <button
            onClick={() => setLocation("/menu")}
            className="flex flex-col items-center justify-center gap-1.5 text-blue-300/40 hover:text-blue-200 transition-all duration-300"
            data-testid="button-nav-menu"
          >
            <IceCream className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('customer.menuNav')}</span>
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
              activeTab === "rewards" ? "text-yellow-400 scale-110" : "text-blue-300/40 hover:text-blue-200"
            }`}
            data-testid="button-nav-rewards"
          >
            <Gift className={`w-5 h-5 ${activeTab === "rewards" ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : ""}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('customer.rewards')}</span>
            {activeTab === "rewards" && <div className="w-1 h-1 bg-yellow-400 rounded-full mt-0.5 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
              activeTab === "profile" ? "text-yellow-400 scale-110" : "text-blue-300/40 hover:text-blue-200"
            }`}
            data-testid="button-nav-profile"
          >
            <User className={`w-5 h-5 ${activeTab === "profile" ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : ""}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('customer.profileNav')}</span>
            {activeTab === "profile" && <div className="w-1 h-1 bg-yellow-400 rounded-full mt-0.5 animate-pulse" />}
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

      {/* LINE Follow Prompt */}
      <Dialog open={showLinePrompt} onOpenChange={() => dismissLinePrompt(false)}>
        <DialogContent className="max-w-sm mx-auto p-0 overflow-hidden rounded-2xl" data-testid="dialog-line-prompt">
          {/* Green header */}
          <div className="bg-[#06C755] px-6 pt-6 pb-8 text-center relative">
            <button
              className="absolute top-3 right-3 text-white/70 hover:text-white"
              onClick={() => dismissLinePrompt(false)}
              data-testid="button-close-line-prompt"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
              <SiLine className="w-10 h-10 text-[#06C755]" />
            </div>
            <h2 className="text-white text-xl font-bold mb-1">Follow us on LINE!</h2>
            <p className="text-white/90 text-sm">ติดตามเราบน LINE</p>
          </div>

          {/* Bonus points badge overlapping */}
          <div className="flex justify-center -mt-5 mb-4">
            <div className="bg-yens-yellow text-foreground font-bold px-5 py-2 rounded-full shadow-md text-sm">
              🎁 รับ 50 คะแนนโบนัส / Get 50 Bonus Points!
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              Scan the QR code or tap below to follow Yen's on LINE and receive exclusive deals, birthday rewards & updates.
            </p>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-3 border-2 border-[#06C755] rounded-xl inline-block bg-white">
                <QRCode value={LINE_FOLLOW_URL} size={130} level="H" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">หรือค้นหา / Search: <span className="font-mono font-bold text-foreground">{LINE_ID}</span></p>

            <Button
              className="w-full bg-[#06C755] text-white font-semibold"
              onClick={() => { window.open(LINE_FOLLOW_URL, '_blank'); dismissLinePrompt(false); }}
              data-testid="button-follow-line-prompt"
            >
              <SiLine className="w-5 h-5 mr-2" />
              {t('customer.addLineFriend')}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>

            <button
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={() => dismissLinePrompt(true)}
              data-testid="button-dismiss-line-prompt"
            >
              Maybe later / ไว้ทีหลัง
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showReviewPage && customer && (
        <CustomerReviewPage
          customerId={customer.id}
          onBack={() => setShowReviewPage(false)}
        />
      )}
    </div>
  );
}
