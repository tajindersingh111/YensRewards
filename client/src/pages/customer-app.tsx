import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Transaction, Promotion } from "@shared/schema";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PointsCard from "@/components/PointsCard";
import TransactionList from "@/components/TransactionList";
import ReferralCard from "@/components/ReferralCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import PromotionCard from "@/components/PromotionCard";
import MessageCard from "@/components/MessageCard";
import InstallPrompt from "@/components/InstallPrompt";
import ProfilePhotoCapture from "@/components/ProfilePhotoCapture";
import Celebration from "@/components/Celebration";
import CustomerReviewPage from "@/components/CustomerReviewPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Home, Award, Users, User, LogOut, UserPlus, ArrowLeft, UtensilsCrossed, IceCream, MessageSquare, ExternalLink, Copy, Check, Search, Star, Gift } from "lucide-react";
import { SiLine } from "react-icons/si";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function CustomerApp() {
  // Auto-update detection
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
  const [linkCodeCopied, setLinkCodeCopied] = useState(false);
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [confirmRedeem, setConfirmRedeem] = useState<{ id: string; name: string; pointCost: number } | null>(null);
  const { toast } = useToast();

  // Enable audio on first user interaction (iOS requirement)
  const enableAudio = () => {
    if (!audioEnabled) {
      // Initialize audio context by playing silence
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.001; // Nearly silent
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(0.001);
      
      setAudioEnabled(true);
      console.log("🔊 Audio enabled for celebrations!");
    }
  };

  const [otpStep, setOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  // On mount: check if a valid server session already exists (returning user).
  // If so, restore the phone identity without re-verifying OTP.
  useEffect(() => {
    const savedPhone = localStorage.getItem("customer_phone");
    if (!savedPhone) {
      setSessionCheckDone(true);
      return;
    }
    apiRequest('GET', '/api/customers/auth/status')
      .then(async (res) => {
        if (res.ok) {
          setPhone(savedPhone);
        } else {
          // Session expired — clear stored phone, user must re-verify
          localStorage.removeItem("customer_phone");
        }
      })
      .catch(() => { localStorage.removeItem("customer_phone"); })
      .finally(() => setSessionCheckDone(true));
  }, []);

  // Fetch customer data - NO POLLING to prevent refresh issues
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers/phone', phone],
    enabled: !!phone,
    refetchInterval: false, // DISABLED - was causing refresh issues
  });

  // Celebration effect - Trigger when points or tier changes
  useEffect(() => {
    console.log("🔍 Celebration check - Customer data:", customer);
    
    if (!customer) {
      previousDataRef.current = null;
      return;
    }

    const currentPoints = customer.points || 0;
    const currentTier = customer.tier || "bronze";

    console.log("📊 Current state:", { currentPoints, currentTier, previous: previousDataRef.current });

    // Check if this is an update (not initial load)
    if (previousDataRef.current) {
      const previousPoints = previousDataRef.current.points;
      const previousTier = previousDataRef.current.tier;

      // Check for tier upgrade (BIG celebration!)
      if (currentTier !== previousTier) {
        console.log("🎆 TIER UPGRADE DETECTED!", previousTier, "→", currentTier);
        setCelebrationType("tier-upgrade");
        setShowCelebration(true);
        toast({
          title: t('customer.tierUpgrade', { tier: t(`customer.tiers.${currentTier}`) }),
          description: t('customer.tierUpgradeDesc'),
        });
      }
      // Check for points increase (regular celebration)
      else if (currentPoints > previousPoints) {
        const earnedPoints = currentPoints - previousPoints;
        console.log("⭐ POINTS EARNED DETECTED!", earnedPoints, "points -", previousPoints, "→", currentPoints);
        console.log("🎉 TRIGGERING CELEBRATION!");
        setCelebrationType("points");
        setShowCelebration(true);
        toast({
          title: t('customer.pointsEarned', { points: earnedPoints }),
          description: t('customer.totalPoints', { points: currentPoints }),
        });
      } else {
        console.log("✅ No changes detected");
      }
    } else {
      console.log("📝 Initial load - setting previous data");
    }

    // Update previous data
    previousDataRef.current = {
      points: currentPoints,
      tier: currentTier,
    };
  }, [customer?.points, customer?.tier, toast]);

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/customers', customer?.id, 'transactions'],
    enabled: !!customer?.id,
  });

  // Fetch promotions with read status
  const { data: promotions } = useQuery<Array<Promotion & { isRead: boolean }>>({
    queryKey: ['/api/customers', customer?.id, 'promotions'],
    enabled: !!customer?.id,
  });

  // Debug: Log promotions data
  useEffect(() => {
    if (customer?.id) {
      console.log("🔔 Customer ID:", customer.id);
      console.log("🔔 Customer Tier:", customer.tier);
      console.log("🔔 Promotions data:", promotions);
      console.log("🔔 Promotions length:", promotions?.length);
      console.log("🔔 First promotion:", promotions?.[0]);
      console.log("🔔 Should show MessageCard:", !!(promotions && promotions.length > 0 && promotions[0]));
    }
  }, [customer?.id, customer?.tier, promotions]);

  // Fetch unread notification count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/customers', customer?.id, 'notifications', 'unread-count'],
    enabled: !!customer?.id,
    refetchInterval: false, // DISABLED - was causing refresh issues
  });

  const unreadCount = unreadData?.count || 0;

  // Fetch LINE linking code (only if not already linked)
  const { data: linkCodeData } = useQuery<{ alreadyLinked: boolean; linkCode: string | null }>({
    queryKey: ['/api/customers/phone', phone, 'line-link-code'],
    enabled: !!phone && !customer?.lineUid,
  });

  const handleCopyLinkCode = async () => {
    if (linkCodeData?.linkCode) {
      try {
        await navigator.clipboard.writeText(linkCodeData.linkCode);
        setLinkCodeCopied(true);
        toast({
          title: t('customer.lineCopied'),
          description: linkCodeData.linkCode,
        });
        setTimeout(() => setLinkCodeCopied(false), 3000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Update PWA badge when unread count changes
  useEffect(() => {
    if ('setAppBadge' in navigator && customer) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch((err: Error) => {
          console.log('Failed to set app badge:', err);
        });
      } else {
        (navigator as any).clearAppBadge().catch((err: Error) => {
          console.log('Failed to clear app badge:', err);
        });
      }
    }
  }, [unreadCount, customer]);

  // Mark all promotions as read mutation
  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      return await apiRequest('POST', `/api/customers/${customer.id}/promotions/read-all`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id, 'promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id, 'notifications', 'unread-count'] });
    },
  });

  // Mark all as read when user views Messages tab
  useEffect(() => {
    if (activeTab === "messages" && customer && unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [activeTab, customer?.id]);

  const handleLogin = async () => {
    if (!phoneInput.trim()) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      // OTP request always returns 200 (non-enumerable) — show OTP step regardless
      await apiRequest('POST', '/api/customers/auth/request', { phone: phoneInput.trim() });
      setOtpStep(true);
    } catch {
      setOtpError(t('customer.loginError'));
    } finally {
      setOtpLoading(false);
    }
  };

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
      // Seed the query cache so the now-gated phone endpoint isn't needed immediately
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

  const handleLogout = () => {
    localStorage.removeItem("customer_phone");
    setPhone(null);
    setPhoneInput("");
    setShowSignup(false);
    setSignupData({ name: "", email: "", birthday: "", photo: "" });
  };

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string; birthday?: string; photo?: string }) => {
      return await apiRequest('POST', '/api/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers/phone', phone] });
      toast({
        title: t('customer.welcomeTitle'),
        description: t('customer.accountCreated'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('customer.accountCreateFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSignup = () => {
    if (!signupData.name.trim()) {
      toast({
        title: t('customer.nameRequired'),
        description: t('customer.nameRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    createCustomer.mutate({
      name: signupData.name,
      phone: phone!,
      email: signupData.email || undefined,
      birthday: signupData.birthday || undefined,
      photo: signupData.photo || undefined,
    });
  };

  // Session check in progress
  if (!sessionCheckDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen (phone entry or OTP verification)
  if (!phone) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* PREMIER BLUE-900 HERO */}
        <div className="bg-blue-900 pt-16 pb-24 text-center px-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,_#FCD34D_0%,_transparent_40%)]" />
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
        <Card className="p-8 space-y-8 shadow-2xl border-none rounded-[2rem] bg-white animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Adaptive Subtitle Header */}
          <div className="space-y-2">
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

          {!otpStep && !showSignup ? (
            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="+66 81 234 5678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="text-lg h-12"
                data-testid="input-phone"
              />
              {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
              <Button
                onClick={() => { enableAudio(); handleLogin(); }}
                className="w-full text-lg"
                size="lg"
                disabled={otpLoading}
                data-testid="button-login"
              >
                {otpLoading ? t('common.loading') : t('customer.accessRewards')}
              </Button>
              <p className="text-sm text-muted-foreground text-center">{t('customer.newCustomer')}</p>
            </div>
          ) : showSignup ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('customer.phone')}: <span className="font-semibold text-foreground">{phoneInput}</span>
              </p>
              <Input
                type="text"
                placeholder={t('customer.yourName')}
                value={signupData.name}
                onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                data-testid="input-name"
              />
              <Input
                type="email"
                placeholder={t('customer.emailPlaceholder')}
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                data-testid="input-email"
              />
              <Input
                type="date"
                value={signupData.birthday}
                onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })}
                data-testid="input-birthday"
              />
              <Button
                onClick={async () => {
                  if (!signupData.name.trim()) return;
                  try {
                    const res = await apiRequest('POST', '/api/customers', {
                      name: signupData.name,
                      phone: phoneInput.trim(),
                      email: signupData.email || undefined,
                      birthday: signupData.birthday || undefined,
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      setOtpError(body.message || t('customer.loginError'));
                      if (res.status === 409) {
                        setShowSignup(false);
                        setOtpStep(true);
                      }
                      return;
                    }
                    setShowSignup(false);
                    await handleLogin();
                  } catch {
                    setOtpError(t('customer.loginError'));
                  }
                }}
                className="w-full text-lg"
                size="lg"
                data-testid="button-signup"
              >
                {t('customer.createAccount')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setShowSignup(false); setOtpError(null); }}>
                {t('common.back')}
              </Button>
            </div>
          ) : (
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
                className="text-lg h-12 tracking-widest text-center"
                maxLength={6}
                data-testid="input-otp"
              />
              {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
              <Button
                onClick={handleOtpVerify}
                className="w-full text-lg"
                size="lg"
                disabled={otpLoading}
                data-testid="button-verify-otp"
              >
                {otpLoading ? t('common.loading') : t('customer.verifyCode')}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setShowSignup(true); setOtpError(null); setOtpStep(false); setOtpInput(""); }}
                data-testid="button-signup-instead"
              >
                {t('customer.newCustomer')}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setOtpStep(false); setOtpError(null); setOtpInput(""); }}
                data-testid="button-back-to-phone"
              >
                {t('common.back')}
              </Button>
            </div>
          )}
        </Card>

        {/* Footer Support Line */}
        <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Nakhon Sawan · Established 2024
        </p>
        </div>
      </div>
    );
  }

  // Loading screen
  if (customerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Customer not found - Show signup form
  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full lg:max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('customer.createAccount')}</h2>
            <p className="text-muted-foreground">
              {t('customer.setupAccount')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('customer.phone')}: <span className="font-semibold text-foreground">{phone}</span>
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Photo */}
            <ProfilePhotoCapture
              currentPhoto={signupData.photo}
              onPhotoCapture={(photoData) => setSignupData({ ...signupData, photo: photoData })}
              userName={signupData.name}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  {t('customer.yourName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('customer.enterName')}
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  {t('customer.emailOptional')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('customer.emailPlaceholder')}
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-foreground">
                  {t('customer.birthdayOptional')}
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={signupData.birthday}
                  onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })}
                  data-testid="input-birthday"
                />
                <p className="text-xs text-muted-foreground">{t('customer.birthdayBonus')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleSignup} 
              className="w-full"
              disabled={createCustomer.isPending}
              data-testid="button-create-account"
            >
              {createCustomer.isPending ? t('customer.creatingAccount') : t('customer.createAccount')}
            </Button>
            <Button 
              variant="outline"
              onClick={handleLogout} 
              className="w-full"
              data-testid="button-back"
            >
              {t('customer.useDifferentNumber')}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {t('customer.startEarning')}
          </p>
        </Card>
      </div>
    );
  }

  const formattedTransactions = transactions?.map(t => ({
    id: t.id,
    amount: parseFloat(t.amount),
    points: t.points,
    location: t.location,
    date: new Date(t.createdAt),
    type: t.type,
  })) || [];

  // Real leaderboard from API
  const { data: leaderboardData } = useQuery<Array<{ rank: number; name: string; points: number; tier: string }>>({
    queryKey: ['/api/customers/leaderboard'],
  });
  const leaderboardEntries = (leaderboardData || []).map(e => ({
    id: String(e.rank),
    name: e.name,
    points: e.points,
    rank: e.rank,
    tier: e.tier,
  }));

  // Redeemable products
  const { data: redeemableProducts } = useQuery<Array<{ id: string; name: string; pointCost: number; category: string; imageUrl?: string }>>({
    queryKey: ['/api/customers/redeemable-products'],
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: (productId: string) => apiRequest('POST', '/api/customers/redeem', { productId }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: t('customer.redeemSuccess', 'Redeemed!'), description: `${data.productName} — ${data.pointsDeducted} pts used. ${data.remainingPoints} pts remaining.` });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/leaderboard'] });
    },
    onError: async (err: any) => {
      let msg = t('customer.redeemError', 'Could not redeem');
      try { const d = await err.json?.(); if (d?.message) msg = d.message; } catch {}
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    },
  });

  // Determine next tier points
  const nextTierPoints = customer.tier === "bronze" ? 500 : customer.tier === "silver" ? 1000 : 0;

  // Show Review Page
  if (showReviewPage) {
    return (
      <CustomerReviewPage 
        customerId={customer.id}
        onBack={() => setShowReviewPage(false)}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - Compact for narrow Android screens */}
      <header className="bg-primary text-primary-foreground py-2 px-2 sticky top-0 z-50 flex-shrink-0">
        <div className="mx-auto w-full flex items-center justify-between gap-1" style={{maxWidth: "min(100vw, 400px)"}}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/")}
            className="text-primary-foreground hover:bg-primary-foreground/20 flex-shrink-0 w-8 h-8"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            <img src={logoUrl} alt="Yens Logo" className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-bold truncate">{t('customer.yensRewards')}</h1>
              <span className="text-[10px] opacity-70" data-testid="text-version">
                {t('common.version')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <LanguageSwitcher />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20 w-8 h-8"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full px-4" style={{maxWidth: "min(100vw, 400px)"}}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="py-3 space-y-3 mt-0">
            <QRCodeDisplay customerId={customer.id} customerName={customer.name} />
            
            {/* Customer Phone Number - Prominent Display */}
            <div className="flex flex-col items-center gap-1 py-3 px-4 bg-card rounded-xl border-2 border-border min-w-0 max-w-full" data-testid="phone-display">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('customer.customerPhone')}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-full" data-testid="text-customer-phone">{customer.phone}</p>
            </div>
            
            {/* LINE Connection Card - Show different states */}
            {customer.lineUid ? (
              <div 
                className="flex items-center gap-3 p-3 bg-[#06C755]/10 border border-[#06C755]/30 rounded-xl"
                data-testid="banner-line-connected"
              >
                <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{t('customer.lineConnected')}</p>
                  <p className="text-xs text-muted-foreground">{t('customer.lineConnectedDesc')}</p>
                </div>
                <SiLine className="w-5 h-5 text-[#06C755] flex-shrink-0" />
              </div>
            ) : (
              <Card className="p-4 border-2 border-[#06C755] bg-[#06C755]/5" data-testid="banner-connect-line">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center">
                    <SiLine className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{t('customer.connectLine')}</p>
                    <p className="text-xs text-muted-foreground">{t('customer.lineGetBonusPoints')}</p>
                  </div>
                </div>
                
                {/* One-tap linking code section */}
                {linkCodeData?.linkCode && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">{t('customer.lineLinkingCode')}</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-4 py-2 bg-white border-2 border-[#06C755] rounded-lg">
                          <span className="text-xl font-mono font-bold text-[#06C755] tracking-wider" data-testid="text-link-code">
                            {linkCodeData.linkCode}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10"
                          onClick={handleCopyLinkCode}
                          data-testid="button-copy-link-code"
                        >
                          {linkCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span>{t('customer.lineStep1')}</span>
                      <span>{t('customer.lineStep2')}</span>
                      <span>{t('customer.lineStep3')}</span>
                    </div>
                    
                    <Button
                      className="w-full bg-[#06C755] hover:bg-[#05a648] text-white"
                      onClick={() => window.open('https://line.me/R/oaMessage/@752afsdq', '_blank')}
                      data-testid="button-open-line-chat"
                    >
                      <SiLine className="w-5 h-5 mr-2" />
                      {t('customer.lineOpenChat')}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
                
                {/* Fallback if link code not loaded yet */}
                {!linkCodeData?.linkCode && (
                  <div className="flex gap-3">
                    <div className="bg-white p-2 rounded-lg border-2 border-[#06C755] flex-shrink-0">
                      <QRCode value="https://line.me/R/ti/p/@752afsdq" size={80} level="L" />
                    </div>
                    <div className="flex flex-col justify-center gap-2 flex-1">
                      <p className="text-xs text-foreground">{t('customer.lineScanOrSearch')}</p>
                      <div className="inline-block px-2 py-1 bg-card border rounded text-sm font-mono font-medium text-foreground">@752afsdq</div>
                      <Button
                        size="sm"
                        className="bg-[#06C755] hover:bg-[#05a648] text-white"
                        onClick={() => window.open('https://line.me/R/ti/p/@752afsdq', '_blank')}
                        data-testid="button-add-line-home"
                      >
                        <SiLine className="w-4 h-4 mr-1" />
                        {t('customer.addLineFriend')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
            
            <PointsCard 
              points={customer.points} 
              tier={customer.tier as "bronze" | "silver" | "gold"} 
              nextTierPoints={nextTierPoints} 
            />
            
            {/* Message/Announcement Area - ALWAYS SHOW */}
            <MessageCard
              title={promotions && promotions[0] ? promotions[0].title : "Welcome to Yen's!"}
              message={promotions && promotions[0] ? promotions[0].message : "Check the Messages tab for special offers and promotions!"}
              isNew={promotions && promotions[0] ? !promotions[0].isRead : true}
            />
            
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
          </TabsContent>

          <TabsContent value="messages" className="py-4 space-y-6 mt-0">
            {promotions && promotions.length > 0 ? (
              promotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  title={promo.title}
                  description={promo.message}
                  validUntil={new Date(promo.sentAt)}
                  isNew={!promo.isRead}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">{t('customer.noPromotions')}</p>
                <p className="text-sm text-muted-foreground mt-2">{t('customer.checkBackSoon')}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="py-4 space-y-6 mt-0">
            {/* Redeem Rewards Section */}
            {redeemableProducts && redeemableProducts.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  {t('customer.redeemRewards', 'Redeem Rewards')}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('customer.yourPoints', 'Your points')}: <span className="font-bold text-primary">{customer.points}</span>
                </p>
                <div className="space-y-2">
                  {redeemableProducts.map(p => {
                    const canAfford = customer.points >= p.pointCost;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className={`text-xs ${canAfford ? 'text-primary' : 'text-muted-foreground'}`}>
                            {p.pointCost} {t('customer.points', 'pts')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={canAfford ? "default" : "outline"}
                          disabled={!canAfford || redeemMutation.isPending}
                          onClick={() => setConfirmRedeem({ id: p.id, name: p.name, pointCost: p.pointCost })}
                          data-testid={`button-redeem-${p.id}`}
                        >
                          {t('customer.redeem', 'Redeem')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Redemption confirmation dialog */}
            <AlertDialog open={!!confirmRedeem} onOpenChange={(open) => { if (!open) setConfirmRedeem(null); }}>
              <AlertDialogContent data-testid="dialog-redeem-confirm">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('customer.confirmRedeem', 'Confirm Redemption')}</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 pt-1">
                      <p className="text-sm text-foreground font-medium">{confirmRedeem?.name}</p>
                      <div className="rounded-md bg-muted px-4 py-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('customer.cost', 'Cost')}</span>
                          <span className="font-bold text-destructive">−{confirmRedeem?.pointCost} {t('customer.points', 'pts')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('customer.balance', 'Balance')}</span>
                          <span className="font-bold">{customer.points} {t('customer.points', 'pts')}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                          <span className="text-muted-foreground">{t('customer.remaining', 'Remaining')}</span>
                          <span className="font-bold text-primary">{customer.points - (confirmRedeem?.pointCost ?? 0)} {t('customer.points', 'pts')}</span>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-redeem-cancel" disabled={redeemMutation.isPending}>
                    {t('common.cancel', 'Cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-redeem-confirm"
                    disabled={redeemMutation.isPending}
                    onClick={() => {
                      if (confirmRedeem) {
                        redeemMutation.mutate(confirmRedeem.id, {
                          onSettled: () => setConfirmRedeem(null),
                        });
                      }
                    }}
                  >
                    {redeemMutation.isPending ? t('common.processing', 'Processing…') : t('customer.confirmRedeem', 'Confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <ReferralCard referralCode={customer.referralCode} referralCount={0} />
            <LeaderboardCard entries={leaderboardEntries} currentUserId={customer.id} />
          </TabsContent>

          <TabsContent value="profile" className="py-4 space-y-6 mt-0">
            <div className="text-center space-y-4">
              {customer.photo ? (
                <img src={customer.photo} alt={customer.name} className="w-24 h-24 rounded-full mx-auto object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-4xl font-bold">
                  {customer.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-foreground">{customer.name}</h2>
                <p className="text-muted-foreground">{customer.phone}</p>
                {customer.birthday && (
                  <p className="text-sm text-muted-foreground mt-2">{t('customer.birthday')}: {customer.birthday}</p>
                )}
              </div>
            </div>
            
            {/* LINE Connection Card - Show different states */}
            {customer.lineUid ? (
              <Card className="p-4 border-2 border-[#06C755] bg-[#06C755]/10" data-testid="card-line-connected">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <SiLine className="w-5 h-5 text-[#06C755]" />
                      {t('customer.lineConnected')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('customer.lineConnectedDesc')}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 border-2 border-[#06C755] bg-[#06C755]/5" data-testid="card-connect-line">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center">
                    <SiLine className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t('customer.connectLine')}</h3>
                    <p className="text-xs text-muted-foreground">{t('customer.lineGetBonusPoints')}</p>
                  </div>
                </div>
                
                {/* One-tap linking code section */}
                {linkCodeData?.linkCode && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">{t('customer.lineLinkingCode')}</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-4 py-2 bg-white border-2 border-[#06C755] rounded-lg">
                          <span className="text-xl font-mono font-bold text-[#06C755] tracking-wider">
                            {linkCodeData.linkCode}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10"
                          onClick={handleCopyLinkCode}
                          data-testid="button-copy-link-code-profile"
                        >
                          {linkCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span>{t('customer.lineStep1')}</span>
                      <span>{t('customer.lineStep2')}</span>
                      <span>{t('customer.lineStep3')}</span>
                    </div>
                    
                    <Button
                      className="w-full bg-[#06C755] hover:bg-[#05a648] text-white font-medium"
                      onClick={() => window.open('https://line.me/R/oaMessage/@752afsdq', '_blank')}
                      data-testid="button-open-line-chat-profile"
                    >
                      <SiLine className="w-5 h-5 mr-2" />
                      {t('customer.lineOpenChat')}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
                
                {/* Fallback if link code not loaded yet */}
                {!linkCodeData?.linkCode && (
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-[#06C755] hover:bg-[#05a648] text-white font-medium"
                      onClick={() => window.open('https://line.me/R/ti/p/@752afsdq', '_blank')}
                      data-testid="button-add-line"
                    >
                      <SiLine className="w-5 h-5 mr-2" />
                      {t('customer.addLineFriend')}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">{t('customer.lineInstructions')}</p>
                      <div className="inline-block px-3 py-1 bg-card border rounded-md">
                        <span className="text-sm font-mono font-medium text-foreground">@752afsdq</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
            
            {/* Rate Us Card */}
            <Card 
              className="p-4 border-2 border-yens-yellow bg-yens-yellow/10 hover-elevate cursor-pointer"
              onClick={() => setShowReviewPage(true)}
              data-testid="card-rate-us"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yens-yellow flex items-center justify-center">
                  <Star className="w-7 h-7 text-yens-blue fill-yens-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{t('review.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('review.rateExperience')}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Bottom Navigation - Responsive grid with icon-only on narrow screens */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border bottom-nav-safe" style={{zIndex: 9999}}>
        <div className="mx-auto w-full grid grid-cols-5 py-2" style={{maxWidth: "min(100vw, 480px)"}}>
          <button
            onClick={() => { enableAudio(); setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 hover-elevate active-elevate-2 ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label={t('customer.home')}
            data-testid="button-nav-home"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] hidden xs:block">{t('customer.home')}</span>
          </button>
          <button
            onClick={() => setLocation("/menu")}
            className="flex flex-col items-center justify-center gap-0.5 py-2 hover-elevate active-elevate-2 text-muted-foreground"
            aria-label={t('customer.menuNav')}
            data-testid="button-nav-menu"
          >
            <IceCream className="w-5 h-5" />
            <span className="text-[10px] hidden xs:block">{t('customer.menuNav')}</span>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 hover-elevate active-elevate-2 relative ${
              activeTab === "messages" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label={t('customer.messages')}
            data-testid="button-nav-messages"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] hidden xs:block">{t('customer.messages')}</span>
            {unreadCount > 0 && (
              <Badge 
                className="absolute top-0 right-1/4 h-4 w-4 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] font-bold rounded-full"
                data-testid="badge-unread-count"
              >
                {unreadCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 hover-elevate active-elevate-2 ${
              activeTab === "referrals" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label={t('customer.rewards', 'Rewards')}
            data-testid="button-nav-referrals"
          >
            <Gift className="w-5 h-5" />
            <span className="text-[10px] hidden xs:block">{t('customer.rewards', 'Rewards')}</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 hover-elevate active-elevate-2 ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-label={t('customer.profileNav')}
            data-testid="button-nav-profile"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] hidden xs:block">{t('customer.profileNav')}</span>
          </button>
        </div>
      </nav>

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Celebration Animation */}
      {showCelebration && (
        <Celebration
          type={celebrationType}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
