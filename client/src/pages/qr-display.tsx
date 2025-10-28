import QRCode from "react-qr-code";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import logoUrl from "@assets/yens logo_1760702216221.png";

const APP_CONFIG = {
  customer: {
    title: "Customer App QR Codes",
    subtitle: "Display these QR codes for customers to scan and install the app",
    qrTitle: "Scan to Get the App!",
    qrSubtitle: "Join Yen's Rewards Program",
    posterTitle: "Join Yen's Rewards!",
    posterSubtitle: "Scan to Download Our App",
    posterDescription: "Earn points on every purchase! • Track your rewards • Get exclusive offers",
    route: "/customer",
    bgColor: "bg-[#FCD34D]",
    textColor: "text-gray-900",
    borderColor: "border-[#FCD34D]",
  },
  barista: {
    title: "Barista App QR Codes",
    subtitle: "Display these QR codes for staff to scan and install the barista app",
    qrTitle: "Scan to Get Barista App!",
    qrSubtitle: "Process Transactions & Award Points",
    posterTitle: "Barista App",
    posterSubtitle: "Scan to Download",
    posterDescription: "Process customer transactions • Scan QR codes • Award loyalty points",
    route: "/barista",
    bgColor: "bg-[#1E40AF]",
    textColor: "text-white",
    borderColor: "border-[#1E40AF]",
  },
  admin: {
    title: "Admin Dashboard QR Codes",
    subtitle: "Display these QR codes for managers to scan and install the admin dashboard",
    qrTitle: "Scan to Get Admin App!",
    qrSubtitle: "Manage Your Business",
    posterTitle: "Admin Dashboard",
    posterSubtitle: "Scan to Download",
    posterDescription: "View analytics • Manage customers • Send promotions • Export reports",
    route: "/admin",
    bgColor: "bg-[#059669]",
    textColor: "text-white",
    borderColor: "border-[#059669]",
  },
};

export default function QRDisplay() {
  const params = useParams();
  const appType = (params.appType || "customer") as keyof typeof APP_CONFIG;
  const config = APP_CONFIG[appType] || APP_CONFIG.customer;
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    const baseUrl = window.location.origin;
    setAppUrl(`${baseUrl}${config.route}`);
  }, [config.route]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Colored Banner - Hide on print */}
      <div className={`print:hidden ${config.bgColor} ${config.textColor} py-12 px-8`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <img src={logoUrl} alt="Yens Logo" className="w-16 h-16 rounded-full bg-white p-2" />
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold">
                      {config.title}
                    </h1>
                    <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                      v66
                    </span>
                  </div>
                  <p className="text-lg opacity-90 mt-1">{config.subtitle}</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handlePrint} 
              size="lg" 
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="button-print"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-8 space-y-8">

        {/* Main QR Code Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Large Display QR Code */}
          <Card className={`p-8 text-center space-y-6 border-4 ${config.borderColor}`}>
            <div className="space-y-2">
              <img src={logoUrl} alt="Yens Logo" className="w-20 h-20 rounded-full mx-auto" />
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{config.qrTitle}</h2>
                <span className="inline-block bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  v66
                </span>
              </div>
              <p className="text-muted-foreground">{config.qrSubtitle}</p>
            </div>
            
            <div className={`bg-white p-8 rounded-xl inline-block border-2 ${config.borderColor}`}>
              {appUrl && (
                <QRCode
                  value={appUrl}
                  size={300}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              )}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4" />
                Open your camera app and point at the QR code
              </p>
              <p>Tap the notification to install the app</p>
            </div>
          </Card>

          {/* Instructions Card */}
          <Card className="p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">How to Use This QR Code</h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-foreground">Display the QR Code</h4>
                    <p className="text-sm text-muted-foreground">Show this screen to customers on a tablet, phone, or printed poster</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-foreground">Customer Scans</h4>
                    <p className="text-sm text-muted-foreground">Customer opens their camera app and points at the QR code</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-foreground">Tap Notification</h4>
                    <p className="text-sm text-muted-foreground">A notification appears - tap it to open the app page</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold text-foreground">Install App</h4>
                    <p className="text-sm text-muted-foreground">Customer taps "Install" button and app is added to home screen</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-semibold text-foreground mb-2">💡 Pro Tips:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Print this page in color for best QR code scanning</li>
                <li>Display on a tablet at the counter for easy access</li>
                <li>Make sure the QR code is well-lit and not blurry</li>
                <li>Test the QR code yourself first before showing customers</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Print-Optimized Poster - Only shows when printing */}
        <div className="hidden print:block page-break-before">
          <div className="text-center space-y-8 p-12">
            <img src={logoUrl} alt="Yens Logo" className="w-32 h-32 rounded-full mx-auto" />
            
            <div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-6xl font-bold text-foreground">{config.posterTitle}</h1>
                <span className="inline-block bg-green-500 text-white px-4 py-2 rounded-full text-2xl font-bold">
                  v64
                </span>
              </div>
              <p className="text-3xl text-muted-foreground">{config.posterSubtitle}</p>
            </div>

            <div className={`bg-white p-12 rounded-xl inline-block border-4 ${config.borderColor}`}>
              {appUrl && (
                <QRCode
                  value={appUrl}
                  size={450}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              )}
            </div>

            <div className="space-y-4 text-2xl text-muted-foreground">
              <p className="font-semibold">📱 Open Camera → Point at QR Code → Tap Link → Install App</p>
              <p className="text-xl">{config.posterDescription}</p>
            </div>

            <div className="text-xl text-muted-foreground">
              <p>Yens Thai Ice Cream - Nakhon Sawan, Thailand</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
