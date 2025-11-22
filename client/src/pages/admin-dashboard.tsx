import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import SalesTrackerDashboard from "@/components/SalesTrackerDashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminDashboard() {
  useAutoUpdate();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Check if we're showing analytics view
  const params = new URLSearchParams(location.split('?')[1] || '');
  const view = params.get('tab') || 'sales';

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t('admin.toasts.authRequired'),
        description: t('admin.toasts.authRequiredDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/admin/login");
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: t('admin.toasts.accessDenied'),
        description: t('admin.toasts.accessDeniedDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation, t]);

  // Show loading state
  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Show Analytics Dashboard */}
      {view === 'analytics' && (
        <div>
          <div className="bg-background border-b px-6 py-4">
            <Button
              onClick={() => setLocation('/admin')}
              variant="ghost"
              size="sm"
              data-testid="button-back-to-sales"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sales Tracker
            </Button>
          </div>
          <div className="p-6">
            <AnalyticsDashboard />
          </div>
        </div>
      )}

      {/* Show Sales Tracker Dashboard (default) */}
      {view !== 'analytics' && <SalesTrackerDashboard />}
    </div>
  );
}
