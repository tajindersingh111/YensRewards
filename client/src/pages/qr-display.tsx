import QRCode from "react-qr-code";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function QRDisplay() {
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    // Get the current app URL
    const baseUrl = window.location.origin;
    setAppUrl(`${baseUrl}/customer`);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header - Hide on print */}
        <div className="print:hidden space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Customer App QR Codes</h1>
              <p className="text-muted-foreground">Display these QR codes for customers to scan and install the app</p>
            </div>
            <Button onClick={handlePrint} size="lg" data-testid="button-print">
              <Printer className="w-5 h-5 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Main QR Code Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Large Display QR Code */}
          <Card className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <img src={logoUrl} alt="Yens Logo" className="w-20 h-20 rounded-full mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Scan to Get the App!</h2>
              <p className="text-muted-foreground">Join Yen's Rewards Program</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl inline-block">
              {appUrl && (
                <QRCode
                  value={appUrl}
                  size={256}
                  level="H"
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
              <h1 className="text-6xl font-bold text-foreground mb-4">Join Yen's Rewards!</h1>
              <p className="text-3xl text-muted-foreground">Scan to Download Our App</p>
            </div>

            <div className="bg-white p-12 rounded-xl inline-block border-4 border-primary">
              {appUrl && (
                <QRCode
                  value={appUrl}
                  size={400}
                  level="H"
                />
              )}
            </div>

            <div className="space-y-4 text-2xl text-muted-foreground">
              <p className="font-semibold">📱 Open Camera → Point at QR Code → Tap Link → Install App</p>
              <p className="text-xl">Earn points on every purchase! • Track your rewards • Get exclusive offers</p>
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
