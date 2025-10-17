import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Customer, Transaction } from "@shared/schema";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PointsCard from "@/components/PointsCard";
import TransactionList from "@/components/TransactionList";
import ReferralCard from "@/components/ReferralCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import PromotionCard from "@/components/PromotionCard";
import InstallPrompt from "@/components/InstallPrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Home, Award, Users, User, LogOut } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function CustomerApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");

  // Load phone from localStorage on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem("customer_phone");
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers/phone', phone],
    enabled: !!phone,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/customers', customer?.id, 'transactions'],
    enabled: !!customer?.id,
  });

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
  };

  // Login screen
  if (!phone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={logoUrl} alt="Yens Logo" className="w-20 h-20 rounded-full mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Yen's Rewards</h1>
            <p className="text-muted-foreground">Enter your phone number to access your rewards</p>
          </div>
          
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="+66 81 234 5678"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              data-testid="input-phone"
            />
            <Button 
              onClick={handleLogin} 
              className="w-full"
              data-testid="button-login"
            >
              Access My Rewards
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p>Test accounts:</p>
            <p>+66812345678 (Somchai - Gold)</p>
            <p>+66898765432 (Jaruwan - Bronze)</p>
            <p>+66823456789 (Orapan - Silver)</p>
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

  // Customer not found
  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 text-center">
          <h2 className="text-xl font-bold text-foreground">Customer Not Found</h2>
          <p className="text-muted-foreground">No account found with phone: {phone}</p>
          <Button onClick={handleLogout} data-testid="button-back">
            Try Different Number
          </Button>
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
    type: t.type as "purchase" | "reward" | "birthday_bonus" | "referral",
  })) || [];

  const mockLeaderboard = [
    { id: "1", name: "Somchai", points: 1250, rank: 1 },
    { id: "2", name: "Jaruwan", points: 450, rank: 2 },
    { id: "3", name: "Orapan", points: 750, rank: 3 },
  ];

  // Determine next tier points
  const nextTierPoints = customer.tier === "bronze" ? 500 : customer.tier === "silver" ? 1000 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <h1 className="text-xl font-bold">Yen's Rewards</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="p-4 space-y-6 mt-0">
            <QRCodeDisplay customerId={customer.id} customerName={customer.name} />
            <PointsCard 
              points={customer.points} 
              tier={customer.tier as "bronze" | "silver" | "gold"} 
              nextTierPoints={nextTierPoints} 
            />
            {transactionsLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">Loading transactions...</p>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} />
            )}
          </TabsContent>

          <TabsContent value="rewards" className="p-4 space-y-6 mt-0">
            <PromotionCard
              title="Birthday Bonus!"
              description="Get 100 extra points on your birthday month"
              validUntil={new Date(2025, 2, 31)}
              isNew={true}
            />
            <PromotionCard
              title="Double Points Weekend"
              description="Earn 2x points on all purchases this Saturday & Sunday"
              validUntil={new Date(2025, 1, 20)}
            />
            <PromotionCard
              title="New Flavor Alert!"
              description="Try our new Mango Sticky Rice ice cream - only 30 points"
              validUntil={new Date(2025, 1, 28)}
            />
          </TabsContent>

          <TabsContent value="referrals" className="p-4 space-y-6 mt-0">
            <ReferralCard referralCode={customer.referralCode} referralCount={0} />
            <LeaderboardCard entries={mockLeaderboard} currentUserId={customer.id} />
          </TabsContent>

          <TabsContent value="profile" className="p-4 space-y-6 mt-0">
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
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-home"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 hover-elevate active-elevate-2 ${
              activeTab === "rewards" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="button-nav-rewards"
          >
            <Award className="w-6 h-6" />
            <span className="text-xs">Rewards</span>
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
    </div>
  );
}
