import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PWAManager from "@/components/PWAManager";
import Home from "@/pages/home";
import CustomerApp from "@/pages/customer-app";
import CustomerAppV2 from "@/pages/customer-app-v2";
import CustomerAppV3 from "@/pages/customer-app-v3";
import CustomerMenu from "@/pages/customer-menu";
import BaristaApp from "@/pages/barista-app";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminDashboardOld from "@/pages/admin-dashboard-old-backup";
import CustomersComparison from "@/pages/customers-comparison";
import OverviewComparison from "@/pages/overview-comparison";
import InsightsOld from "@/pages/insights-old";
import AdminLogin from "@/pages/admin-login";

import MessageTest from "@/pages/message-test";
import MessagingTroubleshoot from "@/pages/messaging-troubleshoot";
import QRDisplay from "@/pages/qr-display";
import CameraTest from "@/pages/camera-test";
import VersionCheck from "@/pages/version-check";
import DesignPreview from "@/pages/design-preview";
import LineQRPoster from "@/pages/line-qr-poster";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/customer" component={CustomerAppV3} />
      <Route path="/customer-v2" component={CustomerAppV2} />
      <Route path="/customer-old" component={CustomerApp} />
      <Route path="/menu" component={CustomerMenu} />
      <Route path="/barista" component={BaristaApp} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin-old" component={AdminDashboardOld} />
      <Route path="/customers-old" component={CustomersComparison} />
      <Route path="/overview-old" component={OverviewComparison} />
      <Route path="/insights-old" component={InsightsOld} />
      <Route path="/admin/login" component={AdminLogin} />

      <Route path="/test-messages" component={MessageTest} />
      <Route path="/messaging-troubleshoot" component={MessagingTroubleshoot} />
      <Route path="/qr/:appType" component={QRDisplay} />
      <Route path="/qr" component={QRDisplay} />
      <Route path="/camera-test" component={CameraTest} />
      <Route path="/version-check" component={VersionCheck} />
      <Route path="/preview-designs" component={DesignPreview} />
      <Route path="/line-qr-poster" component={LineQRPoster} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PWAManager />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
