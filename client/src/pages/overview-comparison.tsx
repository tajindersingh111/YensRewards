import { Link } from "wouter";
import { ArrowLeft, Home, UserPlus, Upload, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

export default function OverviewComparison() {
  const { t } = useTranslation();
  
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
  });

  // Get top 10 spenders by totalSpent (original behavior)
  const topSpenders = [...customers]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4 flex items-center gap-4">
          <Link href="/admin?tab=salesTracker">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Original Overview Dashboard (Old Version)</h1>
            <p className="text-sm text-muted-foreground">Simple layout without weekly stats charts - ranked by total spent</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Branch Selector */}
        <div className="bg-card rounded-lg p-4 border">
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-64" data-testid="select-branch">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.overview.allBranches')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Member Count and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-member-count">
            {t('admin.overview.memberCount', { count: customers.length })}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              className="gap-2" 
              data-testid="button-add-member"
            >
              <UserPlus className="w-4 h-4" />
              {t('admin.overview.addMember')}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              data-testid="button-upload-member"
            >
              <Upload className="w-4 h-4" />
              {t('admin.overview.uploadMember')}
            </Button>
          </div>
        </div>

        {/* Top Spenders - OLD STYLE */}
        <div className="bg-card rounded-lg border-2 border-[#FCD34D] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-lg">{t('admin.overview.topSpenders')}</h3>
          </div>
          <div className="space-y-3">
            {topSpenders.map((customer, index) => (
              <div 
                key={customer.id} 
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                data-testid={`customer-${customer.id}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FCD34D] text-black font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">฿{(customer.totalSpent || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground capitalize">{customer.tier}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-muted-foreground italic">
            This was the original simple overview before weekly stats and charts were added
          </p>
        </div>
      </main>
    </div>
  );
}
