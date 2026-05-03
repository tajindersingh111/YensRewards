import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, ScanLine, BarChart3, Download, CheckCircle2, QrCode, LogOut, AlertCircle, Globe } from "lucide-react";
import { useLocation } from "wouter";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useTranslation } from "react-i18next";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();

  const loginError = new URLSearchParams(window.location.search).get("error");

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'th' : 'en';
    i18n.changeLanguage(newLang);
  };

  const apps = [
    {
      id: "customer",
      title: t('home.customerApp'),
      description: t('home.customerDesc'),
      icon: Smartphone,
      color: "bg-blue-900",
      path: "/customer",
    },
    {
      id: "barista",
      title: t('home.baristaApp'),
      description: t('home.baristaDesc'),
      icon: ScanLine,
      color: "bg-yellow-400",
      iconColor: "text-blue-900",
      path: "/barista",
    },
    {
      id: "admin",
      title: t('home.adminApp'),
      description: t('home.adminDesc'),
      icon: BarChart3,
      color: "bg-blue-900",
      path: "/admin",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* PREMIER BLUE-900 HERO BANNER */}
      <div className="bg-blue-900 py-12 px-6 text-center relative overflow-hidden shadow-2xl">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-400 via-transparent to-transparent" />

        {/* Utility Row: Top Right */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-blue-200 hover:text-white hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest"
            data-testid="button-toggle-language"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            {i18n.language === 'en' ? 'TH' : 'EN'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-blue-200 hover:text-red-400 hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest"
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            {t('common.logout', 'Logout')}
          </Button>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 animate-in fade-in zoom-in duration-500">
          <img
            src={logoUrl}
            alt="Yen's Thai"
            className="w-24 h-24 mx-auto rounded-full mb-6 ring-4 ring-yellow-400 shadow-2xl border-4 border-blue-900 object-cover"
          />
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none">
            {t('home.title', "Yen's Thai Ice Cream")}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-yellow-400/50" />
            <p className="text-blue-300 text-[11px] font-black uppercase tracking-[0.3em]">
              {t('home.subtitle', "Nakhon Sawan · Premium Quality")}
            </p>
            <span className="h-px w-8 bg-yellow-400/50" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20 space-y-8">
        {/* Login error banner */}
        {loginError && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive mt-12" data-testid="banner-login-error">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Sign-in failed</p>
              <p className="text-sm">{loginError}</p>
            </div>
          </div>
        )}

        {/* App Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {apps.map((app) => (
            <Card
              key={app.id}
              className="p-6 hover-elevate cursor-pointer bg-white"
              onClick={() => setLocation(app.path)}
              data-testid={`card-${app.id}`}
            >
              <div className="space-y-4">
                <div className={`w-16 h-16 rounded-xl ${app.color} flex items-center justify-center`}>
                  <app.icon className={`w-8 h-8 ${app.iconColor ?? "text-white"}`} />
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

        {/* QR Code Banners */}
        <div className="space-y-4">
          {/* Customer QR Code */}
          <Card className="p-6 bg-blue-900 text-white border-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 rounded-lg p-2.5 flex-shrink-0">
                  <QrCode className="w-8 h-8 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Customer App QR Code</h2>
                  <p className="text-blue-300 text-sm">Show customers this QR code — they scan, tap, and it's installed!</p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 font-bold flex-shrink-0"
                onClick={() => setLocation('/qr/customer')}
                data-testid="button-show-qr-customer"
              >
                Show QR Code
              </Button>
            </div>
          </Card>

          {/* Barista QR Code */}
          <Card className="p-6 bg-blue-900 text-white border-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 rounded-lg p-2.5 flex-shrink-0">
                  <QrCode className="w-8 h-8 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Barista App QR Code</h2>
                  <p className="text-blue-300 text-sm">Scan QR codes and process transactions</p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 font-bold flex-shrink-0"
                onClick={() => setLocation('/qr/barista')}
                data-testid="button-show-qr-barista"
              >
                Show QR Code
              </Button>
            </div>
          </Card>

          {/* Admin QR Code */}
          <Card className="p-6 bg-blue-900 text-white border-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 rounded-lg p-2.5 flex-shrink-0">
                  <QrCode className="w-8 h-8 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Admin Dashboard QR Code</h2>
                  <p className="text-blue-300 text-sm">For managers to access analytics, reports, and promotions</p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 font-bold flex-shrink-0"
                onClick={() => setLocation('/qr/admin')}
                data-testid="button-show-qr-admin"
              >
                Show QR Code
              </Button>
            </div>
          </Card>
        </div>

        {/* Installation Instructions */}
        <Card className="p-6 bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-900" />
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
                  <li>Tap the Share button</li>
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
                  <li>Tap the menu or install banner</li>
                  <li>Tap "Add to Home screen" or "Install"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-900/5 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-900 mt-0.5" />
              <p className="text-sm text-foreground">
                Once installed, each app will open like a native app with its own icon on your home screen!
              </p>
            </div>
          </div>
        </Card>

        {/* Admin Tools */}
        <Card className="p-6 bg-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Test Messaging</h3>
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

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Yens Thai Ice Cream — Nakhon Sawan, Thailand</p>
        </div>
      </div>
    </div>
  );
}
