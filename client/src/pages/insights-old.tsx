import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerInsightsMorning from "@/components/CustomerInsightsMorning";

export default function InsightsOld() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4 flex items-center gap-4">
          <Link href="/admin?tab=customers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Customer Insights (This Morning's Version)</h1>
            <p className="text-sm text-muted-foreground">Horizontal Top 10 (40px circles) + Birthday sections with yellow borders</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <CustomerInsightsMorning />
      </main>
    </div>
  );
}
