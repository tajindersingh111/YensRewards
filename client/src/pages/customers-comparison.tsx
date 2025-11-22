import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerInsightsOld from "@/components/CustomerInsightsOld";

export default function CustomersComparison() {
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
            <h1 className="text-2xl font-bold">Original Dashboard (Old Version)</h1>
            <p className="text-sm text-muted-foreground">Smaller circles (40px) - Original design</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <CustomerInsightsOld />
      </main>
    </div>
  );
}
