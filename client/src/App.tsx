import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PWAManager from "@/components/PWAManager";
import Home from "@/pages/home";
import CustomerApp from "@/pages/customer-app";
import BaristaApp from "@/pages/barista-app";
import AdminDashboard from "@/pages/admin-dashboard";
import QRDisplay from "@/pages/qr-display";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/customer" component={CustomerApp} />
      <Route path="/barista" component={BaristaApp} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/qr/:appType" component={QRDisplay} />
      <Route path="/qr" component={QRDisplay} />
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
