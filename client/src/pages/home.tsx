import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, ScanLine, BarChart3, Download, CheckCircle2, QrCode, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const apps = [
    {
      id: "customer",
      title: t('home.customerApp'),
      description: t('home.customerDesc'),
      icon: Smartphone,
      color: "bg-primary",
      path: "/customer",
    },
    {
      id: "barista",
      title: t('home.baristaApp'),
      description: t('home.baristaDesc'),
      icon: ScanLine,
      color: "bg-chart-1",
      path: "/barista",
    },
    {
      id: "admin",
      title: t('home.adminApp'),
      description: t('home.adminDesc'),
      icon: BarChart3,
      color: "bg-chart-3",
      path: "/admin",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-chart-1/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Language Switcher & Logout - Top Right */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
          <LanguageSwitcher />
        </div>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <img src={logoUrl} alt="Yens Logo" className="w-24 h-24 mx-auto rounded-full" />
          <h1 className="text-4xl font-bold text-foreground">
            {t('home.title')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('home.subtitle')}
          </p>
        </div>

        {/* App Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card
              key={app.id}
              className="p-6 hover-elevate cursor-pointer"
              onClick={() => setLocation(app.path)}
              data-testid={`card-${app.id}`}
            >
              <div className="space-y-4">
                <div className={`w-16 h-16 rounded-xl ${app.color} flex items-center justify-center`}>
                  <app.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{app.title}</h3>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </div>
                <Button className="w-full" variant="outline" data-testid={`button-open-${app.id}`}>
                  {t('home.openApp')}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* QR Code Banners for Easy Installation */}
        <div className="space-y-4">
          {/* Customer QR Code */}
          <Card className="p-6 bg-primary text-primary-foreground">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <QrCode className="w-12 h-12" />
                <div>
                  <h2 className="text-2xl font-bold">Customer App QR Code</h2>
                  <p className="opacity-90">Show customers this QR code - they scan, tap, and it's installed!</p>
                </div>
              </div>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setLocation('/qr/customer')}
                data-testid="button-show-qr-customer"
              >
                Show QR Code
              </Button>
            </div>
          </Card>

          {/* Barista QR Code */}
          <Card className="p-6 bg-chart-1 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <QrCode className="w-12 h-12" />
                <div>
                  <h2 className="text-2xl font-bold">Barista App QR Code</h2>
                  <p className="opacity-90">Scan QR codes and process transactions</p>
                </div>
              </div>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setLocation('/qr/barista')}
                data-testid="button-show-qr-barista"
              >
                Show QR Code
              </Button>
            </div>
          </Card>

          {/* Admin QR Code */}
          <Card className="p-6 bg-chart-3 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <QrCode className="w-12 h-12" />
                <div>
                  <h2 className="text-2xl font-bold">Admin Dashboard QR Code</h2>
                  <p className="opacity-90">For managers to access analytics, reports, and promotions</p>
                </div>
              </div>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setLocation('/qr/admin')}
                data-testid="button-show-qr-admin"
              >
                Show QR Code
              </Button>
            </div>
          </Card>
        </div>

        {/* Installation Instructions */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Or Install Manually</h2>
            </div>
            <p className="text-muted-foreground">
              For the best experience, install each app on your phone like a native app:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  iOS (iPhone/iPad)
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open the app page in Safari</li>
                  <li>Tap the Share button <span className="inline-block">📤</span></li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open the app page in Chrome</li>
                  <li>Tap the menu (⋮) or install banner</li>
                  <li>Tap "Add to Home screen" or "Install"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <p className="text-sm text-foreground">
                Once installed, each app will open like a native app with its own icon on your home screen!
              </p>
            </div>
          </div>
        </Card>

        {/* Admin Tools */}
        <div className="space-y-4">
          <Card className="p-6 border-2 border-primary">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">🔐 First Time Admin Setup</h3>
                <p className="text-muted-foreground">
                  Click here to promote yourself to admin (one-time setup required)
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={() => setLocation('/promote-admin')}
                data-testid="button-promote-admin"
              >
                Setup Admin Access
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">📨 Test Messaging</h3>
                <p className="text-muted-foreground">
                  Test your Twilio SMS and Resend Email integrations
                </p>
              </div>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setLocation('/test-messages')}
                data-testid="button-test-messages"
              >
                Test Messages
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Yens Thai Ice Cream - Nakhon Sawan, Thailand</p>
        </div>
      </div>
    </div>
  );
}
