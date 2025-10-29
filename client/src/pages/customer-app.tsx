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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Home, Award, Users, User, LogOut, UserPlus, ArrowLeft, UtensilsCrossed, IceCream } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function CustomerApp() {
  // Auto-update detection
  useAutoUpdate();
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

  // Load phone from localStorage on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem("customer_phone");
    console.log("📱 Checking saved phone on mount:", savedPhone);
    if (savedPhone) {
      console.log("✅ Auto-logging in with saved phone:", savedPhone);
      setPhone(savedPhone);
    } else {
      console.log("❌ No saved phone found - showing login");
    }
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
          title: `🎉 Tier Upgraded to ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}!`,
          description: "Congratulations! You've reached a new level!",
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
          title: `+${earnedPoints} Points Earned! 🎊`,
          description: `You now have ${currentPoints} points!`,
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

  // Mark all as read when user views Rewards tab
  useEffect(() => {
    if (activeTab === "rewards" && customer && unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [activeTab, customer?.id]);

  const handleLogin = () => {
    if (phoneInput.trim()) {
      console.log("💾 Saving phone to localStorage:", phoneInput.trim());
      localStorage.setItem("customer_phone", phoneInput.trim());
      setPhone(phoneInput.trim());
      
      // Double-check it saved
      const saved = localStorage.getItem("customer_phone");
      console.log("✅ Verified saved phone:", saved);
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
        title: "Welcome to Yen's Rewards! 🎉",
        description: "Your account has been created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSignup = () => {
    if (!signupData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue",
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

  // Login screen
  if (!phone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full lg:max-w-md p-6 sm:p-8 space-y-8">
          <div className="text-center space-y-4">
            <img src={logoUrl} alt="Yens Logo" className="w-24 h-24 rounded-full mx-auto" />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Yen's Rewards</h1>
              <p className="text-base text-muted-foreground">Enter your phone number to access your rewards</p>
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
              className="w-full text-lg"
              size="lg"
              data-testid="button-login"
            >
              Access My Rewards
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p>New customer? Enter your phone number and we'll set up your account!</p>
          </div>
        </Card>
      </div>
    );
  }

  // Loading screen
  if (customerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your rewards...</p>
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
            <h2 className="text-2xl font-bold text-foreground">Create Your Account</h2>
            <p className="text-muted-foreground">
              Welcome! Let's set up your Yen's Rewards account
            </p>
            <p className="text-sm text-muted-foreground">
              Phone: <span className="font-semibold text-foreground">{phone}</span>
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
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-foreground">
                  Birthday (Optional)
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={signupData.birthday}
                  onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })}
                  data-testid="input-birthday"
                />
                <p className="text-xs text-muted-foreground">Get bonus points on your birthday!</p>
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
              {createCustomer.isPending ? "Creating Account..." : "Create Account"}
            </Button>
            <Button 
              variant="outline"
              onClick={handleLogout} 
              className="w-full"
              data-testid="button-back"
            >
              Use Different Number
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you'll start earning points on every purchase!
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

  const mockLeaderboard = [
    { id: "1", name: "Somchai", points: 1250, rank: 1 },
    { id: "2", name: "Jaruwan", points: 450, rank: 2 },
    { id: "3", name: "Orapan", points: 750, rank: 3 },
  ];

  // Determine next tier points
  const nextTierPoints = customer.tier === "bronze" ? 500 : customer.tier === "silver" ? 1000 : 0;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50 flex-shrink-0">
        <div className="mx-auto w-full px-6 flex items-center justify-between" style={{maxWidth: "min(100vw, 480px)"}}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold">Yen's Rewards</h1>
              <span className="text-xs opacity-70" data-testid="text-version">v77 | {typeof window !== 'undefined' ? Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize)) : '?'}px</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/menu")}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-menu"
            >
              <IceCream className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full px-6" style={{maxWidth: "min(100vw, 480px)"}}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="py-3 space-y-3 mt-0">
            <QRCodeDisplay customerId={customer.id} customerName={customer.name} />
            
            <PointsCard 
              points={customer.points} 
              tier={customer.tier as "bronze" | "silver" | "gold"} 
              nextTierPoints={nextTierPoints} 
            />
            
            {/* Message/Announcement Area - ALWAYS SHOW */}
            <MessageCard
              title={promotions && promotions[0] ? promotions[0].title : "Welcome to Yen's!"}
              message={promotions && promotions[0] ? promotions[0].message : "Check the Rewards tab for special offers and promotions!"}
              isNew={promotions && promotions[0] ? !promotions[0].isRead : true}
            />
            
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">Loading transactions...</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
          </TabsContent>

          <TabsContent value="rewards" className="py-4 space-y-6 mt-0">
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
                <p className="text-muted-foreground">No promotions available yet</p>
                <p className="text-sm text-muted-foreground mt-2">Check back soon for special offers!</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="py-4 space-y-6 mt-0">
            <ReferralCard referralCode={customer.referralCode} referralCount={0} />
            <LeaderboardCard entries={mockLeaderboard} currentUserId={customer.id} />
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
                  <p className="text-sm text-muted-foreground mt-2">Birthday: {customer.birthday}</p>
                )}
              </div>
            </div>
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">Loading transactions...</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border bottom-nav-safe" style={{zIndex: 9999}}>
        <div className="mx-auto w-full px-6 flex justify-around p-3" style={{maxWidth: "min(100vw, 480px)"}}>
          <button
            onClick={() => { enableAudio(); setActiveTab("home"); }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-home"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setLocation("/menu")}
            className="flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 text-muted-foreground"
            data-testid="button-nav-menu"
          >
            <IceCream className="w-6 h-6" />
            <span className="text-xs">Menu</span>
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 relative ${
              activeTab === "rewards" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-rewards"
          >
            <Award className="w-6 h-6" />
            <span className="text-xs">Rewards</span>
            {unreadCount > 0 && (
              <Badge 
                className="absolute top-1 right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-bold rounded-full"
                data-testid="badge-unread-count"
              >
                {unreadCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 ${
              activeTab === "referrals" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-referrals"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Referrals</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-profile"
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
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
