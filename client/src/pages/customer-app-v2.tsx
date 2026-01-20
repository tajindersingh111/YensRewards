import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Transaction, Promotion, Product } from "@shared/schema";
import InstallPrompt from "@/components/InstallPrompt";
import Celebration from "@/components/Celebration";
import CustomerReviewPage from "@/components/CustomerReviewPage";
import ProfilePhotoCapture from "@/components/ProfilePhotoCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Home, Award, User, LogOut, UserPlus, RefreshCw, IceCream, Gift, Star, Check, Copy, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { SiLine } from "react-icons/si";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function CustomerAppV2() {
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
  const [showQR, setShowQR] = useState(false);
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

  const { data: customer, isLoading: customerLoading, refetch } = useQuery<Customer>({
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
  }, [customer?.points, customer?.tier, toast]);

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/customers', customer?.id, 'transactions'],
    enabled: !!customer?.id,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!customer?.id,
  });

  const { data: promotions } = useQuery<Array<Promotion & { isRead: boolean }>>({
    queryKey: ['/api/customers', customer?.id, 'promotions'],
    enabled: !!customer?.id,
  });

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

  const handleLogin = () => {
    if (phoneInput.trim()) {
      localStorage.setItem("customer_phone", phoneInput.trim());
      setPhone(phoneInput.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_phone");
    setPhone(null);
    setPhoneInput("");
    setShowSignup(false);
    setSignupData({ name: "", email: "", birthday: "", photo: "" });
  };

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

  // Calculate points to next reward
  const REWARD_THRESHOLD = 50;
  const pointsToNextReward = customer ? REWARD_THRESHOLD - (customer.points % REWARD_THRESHOLD) : REWARD_THRESHOLD;
  const pointsProgress = customer ? ((customer.points % REWARD_THRESHOLD) / REWARD_THRESHOLD) * 100 : 0;

  // Get tier colors
  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'gold': return 'from-yellow-400 to-amber-500';
      case 'silver': return 'from-gray-300 to-gray-400';
      case 'platinum': return 'from-purple-400 to-purple-600';
      default: return 'from-amber-600 to-amber-700';
    }
  };

  // Featured rewards from products
  const rewardProducts = products?.filter(p => p.available && p.featured)?.slice(0, 4) || [];

  // Login screen
  if (!phone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yens-yellow/30 to-background flex items-center justify-center p-6">
        <Card className="w-full lg:max-w-md p-6 sm:p-8 space-y-8">
          <div className="text-center space-y-4">
            <img src={logoUrl} alt="Yens Logo" className="w-24 h-24 rounded-full mx-auto shadow-lg" />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{t('customer.yensRewards')}</h1>
              <p className="text-base text-muted-foreground">{t('customer.enterPhone')}</p>
            </div>
          </div>
          
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
            <Button 
              onClick={() => { enableAudio(); handleLogin(); }} 
              className="w-full text-lg bg-yens-yellow text-yens-blue"
              size="lg"
              data-testid="button-login"
            >
              {t('customer.accessRewards')}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p>{t('customer.newCustomer')}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Loading screen
  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yens-yellow/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yens-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Customer not found - Show signup form
  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yens-yellow/30 to-background flex items-center justify-center p-4">
        <Card className="w-full lg:max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-yens-yellow/20 flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-yens-yellow" />
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
              className="w-full bg-yens-yellow text-yens-blue"
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
        </Card>
      </div>
    );
  }

  // Show Review Page
  if (showReviewPage) {
    return (
      <CustomerReviewPage 
        customerId={customer.id}
        onBack={() => setShowReviewPage(false)}
      />
    );
  }

  // Format customer ID display
  const customerIdDisplay = customer.id.toString().slice(-4).padStart(4, '0');

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col">
      {/* Header - Yellow bar with logo and customer ID */}
      <header className="bg-yens-yellow py-3 px-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Yen's" className="w-10 h-10 rounded-full shadow-md" />
            <div>
              <h1 className="text-lg font-bold text-yens-blue">Yen's</h1>
              <span className="text-xs text-yens-blue/70" data-testid="text-customer-id">{customerIdDisplay}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              className="text-yens-blue"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto px-4">
          
          {/* Home Tab Content */}
          {activeTab === "home" && (
            <div className="space-y-4">
              {/* Hero Promotional Banner - Large visual like mockup */}
              <div className="relative rounded-b-3xl overflow-hidden shadow-xl -mx-4" data-testid="hero-banner">
                {/* Background with warm gradient and decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-orange-100 to-amber-300" />
                
                {/* Decorative blur circles for depth */}
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl" />
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-200/40 rounded-full blur-3xl" />
                
                {/* Content */}
                <div className="relative px-6 pt-6 pb-8 min-h-[280px] flex flex-col justify-between">
                  {/* Top section with badge and text */}
                  <div>
                    {/* Today at Yen's Badge */}
                    <div className="inline-block mb-3">
                      <Badge className="bg-yens-blue text-white px-4 py-1.5 text-sm font-semibold rounded-full shadow-lg">
                        {t('customer.todayAtYens') || "Today at Yen's"}
                      </Badge>
                    </div>
                    
                    {/* Main Promo Text - Large and bold */}
                    <h2 className="text-4xl font-extrabold text-yens-blue mb-3 leading-tight drop-shadow-sm">
                      {promotions?.[0]?.title || t('customer.doublePoints') || "Double Points Today!"}
                    </h2>
                    
                    {/* Time indicator */}
                    <div className="flex items-center gap-2 text-yens-blue/80 mb-5">
                      <Clock className="w-5 h-5" />
                      <span className="text-base font-medium">4:00 pm – 6:00 pm</span>
                    </div>
                  </div>
                  
                  {/* Order Now Button - Prominent at bottom */}
                  <Button 
                    className="bg-yens-yellow text-yens-blue font-bold px-8 py-3 rounded-full shadow-lg text-lg w-fit"
                    onClick={() => setLocation("/menu")}
                    data-testid="button-order-now"
                  >
                    {t('customer.orderNow') || "Order Now"}
                  </Button>
                </div>
                
                {/* Large decorative ice cream - positioned to the right */}
                <div className="absolute right-0 top-4 w-36 h-52 opacity-95 pointer-events-none">
                  <div className="relative w-full h-full">
                    <IceCream className="w-full h-full text-pink-400/70 drop-shadow-xl" strokeWidth={1} />
                    {/* Small decorative ice cream bowls */}
                    <div className="absolute -left-8 top-8 opacity-60">
                      <IceCream className="w-12 h-12 text-orange-300 rotate-12" />
                    </div>
                    <div className="absolute -left-4 bottom-12 opacity-50">
                      <IceCream className="w-10 h-10 text-amber-400 -rotate-12" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Points Progress Section - More compact like mockup */}
              <div className="bg-white rounded-2xl p-4 shadow-sm mx-0" data-testid="points-progress">
                <div className="flex items-center gap-4">
                  {/* Circular Progress - Amber/Orange color scheme */}
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke="#fef3c7"
                        strokeWidth="5"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${pointsProgress * 1.51} 151`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-bold text-amber-600" data-testid="text-current-points">
                        {customer.points % REWARD_THRESHOLD}
                      </span>
                    </div>
                  </div>
                  
                  {/* Points Text */}
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">
                      You're <span className="text-amber-600">{pointsToNextReward} points</span> away!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {REWARD_THRESHOLD} {t('customer.pointsUntilReward') || "Points until your next reward"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rewards List - Clean cards like mockup */}
              <div className="space-y-3" data-testid="rewards-list">
                {rewardProducts.length > 0 ? (
                  rewardProducts.slice(0, 3).map((product) => (
                    <div 
                      key={product.id}
                      className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-4 hover-elevate"
                      data-testid={`reward-item-${product.id}`}
                    >
                      {/* Product Image - Larger like mockup */}
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center">
                            <IceCream className="w-10 h-10 text-pink-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-base">{product.name}</p>
                        <p className="text-sm text-amber-600 font-medium">{REWARD_THRESHOLD} {t('customer.pointsLabel') || "Points"}</p>
                      </div>
                      
                      {/* Progress dots - Orange like mockup */}
                      <div className="flex gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-2.5 h-2.5 rounded-full ${i < Math.min(3, Math.floor(customer.points / (REWARD_THRESHOLD / 3))) ? 'bg-amber-500' : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Placeholder reward items when no products */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center">
                        <IceCream className="w-10 h-10 text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Thai Tea Ice Cream</p>
                        <p className="text-sm text-amber-600 font-medium">{REWARD_THRESHOLD} Points</p>
                      </div>
                      <div className="flex gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < Math.min(3, Math.floor(customer.points / (REWARD_THRESHOLD / 3))) ? 'bg-amber-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <IceCream className="w-10 h-10 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Chocolate Fudge Sundae</p>
                        <p className="text-sm text-amber-600 font-medium">{REWARD_THRESHOLD} Points</p>
                      </div>
                      <div className="flex gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < Math.min(3, Math.floor(customer.points / (REWARD_THRESHOLD / 3))) ? 'bg-amber-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Rewards Tab Content */}
          {activeTab === "rewards" && (
            <div className="space-y-4 py-4">
              <div className="text-center py-6">
                <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-br ${getTierColor(customer.tier)}`}>
                  <span className="text-3xl font-bold text-white">{customer.points}</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground capitalize">{t(`customer.tiers.${customer.tier}`)}</h2>
                <p className="text-muted-foreground">{t('customer.totalPointsLabel') || "Total Points"}</p>
              </div>
              
              {/* Tier Progress */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t('customer.tierProgress') || "Tier Progress"}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('customer.tiers.bronze')}</span>
                    <span>{t('customer.tiers.silver')}</span>
                    <span>{t('customer.tiers.gold')}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getTierColor(customer.tier)} transition-all duration-500`}
                      style={{ width: `${Math.min(100, (customer.points / 1000) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {customer.tier === 'gold' 
                      ? t('customer.maxTier') || "You've reached the highest tier!" 
                      : `${customer.tier === 'bronze' ? 500 - customer.points : 1000 - customer.points} ${t('customer.pointsToNextTier') || "points to next tier"}`
                    }
                  </p>
                </div>
              </Card>
              
              {/* Recent Transactions */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t('customer.recentActivity') || "Recent Activity"}</h3>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{tx.location || "Yen's"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          +{tx.points} {t('customer.pointsAbbr') || "pts"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">{t('customer.noTransactions') || "No transactions yet"}</p>
                )}
              </Card>
            </div>
          )}

          {/* Profile Tab Content */}
          {activeTab === "profile" && (
            <div className="space-y-4 py-4">
              {/* QR Code - Prominent at top of profile */}
              <Card className="p-6 text-center shadow-lg" data-testid="profile-qr-section">
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border-2 border-gray-100">
                  <QRCode 
                    value={`YENS-${customer.id}`} 
                    size={160} 
                    level="M"
                  />
                </div>
                <p className="font-bold text-foreground text-lg mt-4">{customer.name}</p>
                <p className="text-muted-foreground text-sm">ID: {customer.id}</p>
                <p className="text-xs text-muted-foreground mt-2">{t('customer.showToBarista') || "Show this to the barista"}</p>
              </Card>
              
              {/* Profile Info */}
              <div className="text-center">
                {customer.photo ? (
                  <img src={customer.photo} alt={customer.name} className="w-20 h-20 rounded-full mx-auto object-cover shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yens-yellow to-amber-500 text-white flex items-center justify-center mx-auto text-3xl font-bold shadow-lg">
                    {customer.name.charAt(0)}
                  </div>
                )}
                <h2 className="text-xl font-bold text-foreground mt-2">{customer.name}</h2>
                <p className="text-muted-foreground text-sm">{customer.phone}</p>
              </div>
              
              {/* LINE Connection */}
              {customer.lineUid ? (
                <Card className="p-4 border-2 border-[#06C755] bg-[#06C755]/10">
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
                <Card className="p-4 border-2 border-[#06C755] bg-[#06C755]/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center">
                      <SiLine className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t('customer.connectLine')}</h3>
                      <p className="text-xs text-muted-foreground">{t('customer.lineGetBonusPoints')}</p>
                    </div>
                  </div>
                  {linkCodeData?.linkCode && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-4 py-2 bg-white border-2 border-[#06C755] rounded-lg">
                          <span className="text-xl font-mono font-bold text-[#06C755] tracking-wider">
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
                      <Button
                        className="w-full bg-[#06C755] text-white"
                        onClick={() => window.open('https://line.me/R/oaMessage/@752afsdq', '_blank')}
                        data-testid="button-line-chat"
                      >
                        <SiLine className="w-5 h-5 mr-2" />
                        {t('customer.lineOpenChat')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </Card>
              )}
              
              {/* Rate Us */}
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
              
              {/* Logout */}
              <Button 
                variant="outline"
                onClick={handleLogout}
                className="w-full"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('customer.logout') || "Log Out"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - 4 tabs matching mockup */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 bottom-nav-safe shadow-lg" style={{zIndex: 9999}}>
        <div className="max-w-md mx-auto grid grid-cols-4 py-2">
          <button
            onClick={() => { enableAudio(); setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center gap-1 py-2 ${
              activeTab === "home" ? "text-yens-blue" : "text-gray-400"
            }`}
            data-testid="button-nav-home"
          >
            <Home className={`w-6 h-6 ${activeTab === "home" ? "fill-yens-yellow stroke-yens-blue" : ""}`} />
            <span className="text-xs font-medium">{t('customer.home') || "Home"}</span>
          </button>
          <button
            onClick={() => setLocation("/menu")}
            className="flex flex-col items-center justify-center gap-1 py-2 text-gray-400"
            data-testid="button-nav-menu"
          >
            <IceCream className="w-6 h-6" />
            <span className="text-xs font-medium">{t('customer.menuNav') || "Menu"}</span>
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`flex flex-col items-center justify-center gap-1 py-2 ${
              activeTab === "rewards" ? "text-yens-blue" : "text-gray-400"
            }`}
            data-testid="button-nav-rewards"
          >
            <Gift className={`w-6 h-6 ${activeTab === "rewards" ? "fill-yens-yellow stroke-yens-blue" : ""}`} />
            <span className="text-xs font-medium">{t('customer.rewardsNav') || "Rewards"}</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 py-2 ${
              activeTab === "profile" ? "text-yens-blue" : "text-gray-400"
            }`}
            data-testid="button-nav-profile"
          >
            <User className={`w-6 h-6 ${activeTab === "profile" ? "fill-yens-yellow stroke-yens-blue" : ""}`} />
            <span className="text-xs font-medium">{t('customer.profileNav') || "Profile"}</span>
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
