import { useState } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PointsCard from "@/components/PointsCard";
import TransactionList from "@/components/TransactionList";
import ReferralCard from "@/components/ReferralCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import PromotionCard from "@/components/PromotionCard";
import InstallPrompt from "@/components/InstallPrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Award, Users, User } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function CustomerApp() {
  //todo: remove mock functionality
  const [activeTab, setActiveTab] = useState("home");

  const mockTransactions = [
    {
      id: "1",
      amount: 45,
      points: 4,
      location: "Yens Main Store",
      date: new Date(2025, 0, 15),
      type: "purchase" as const,
    },
    {
      id: "2",
      amount: 80,
      points: 8,
      location: "Market Stall - Night Bazaar",
      date: new Date(2025, 0, 12),
      type: "purchase" as const,
    },
    {
      id: "3",
      amount: 120,
      points: 12,
      location: "Yens Main Store",
      date: new Date(2025, 0, 10),
      type: "purchase" as const,
    },
  ];

  const mockLeaderboard = [
    { id: "1", name: "Somchai", points: 1250, rank: 1 },
    { id: "2", name: "Jaruwan", points: 980, rank: 2 },
    { id: "3", name: "Orapan", points: 875, rank: 3 },
    { id: "current", name: "You", points: 123, rank: 24 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <h1 className="text-xl font-bold">Yen's Rewards</h1>
          </div>
          <p className="text-sm opacity-90">Simulated Customer</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="p-4 space-y-6 mt-0">
            <QRCodeDisplay customerId="123456" customerName="Simulated Customer" />
            <PointsCard points={123} tier="bronze" nextTierPoints={500} />
            <TransactionList transactions={mockTransactions} />
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
            <ReferralCard referralCode="YENS123" referralCount={3} />
            <LeaderboardCard entries={mockLeaderboard} currentUserId="current" />
          </TabsContent>

          <TabsContent value="profile" className="p-4 space-y-6 mt-0">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-4xl font-bold">
                SC
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Simulated Customer</h2>
                <p className="text-muted-foreground">+66 81 234 5678</p>
                <p className="text-sm text-muted-foreground mt-2">Birthday: March 15</p>
              </div>
            </div>
            <TransactionList transactions={mockTransactions} />
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
