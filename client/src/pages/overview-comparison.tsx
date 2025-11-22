import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import YensOverviewOld from "@/components/YensOverviewOld";

export default function OverviewComparison() {
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
            <p className="text-sm text-muted-foreground">Weekly stats, charts, and performance metrics from yesterday</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <YensOverviewOld />
      </main>
    </div>
  );
}
