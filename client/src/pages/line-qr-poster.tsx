import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { SiLine } from "react-icons/si";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import logoUrl from "@assets/yens logo_1760702216221.png";

const LINE_ID = "@752afsdq";
const LINE_URL = "https://line.me/R/ti/p/@752afsdq";

export default function LineQRPoster() {
  const [, setLocation] = useLocation();
  const posterRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = 'yens-line-qr-poster.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download poster:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload} variant="outline" className="gap-2" data-testid="button-download">
              <Download className="w-4 h-4" />
              Download PNG
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-[#06C755] hover:bg-[#05a648]" data-testid="button-print">
              <Printer className="w-4 h-4" />
              Print Poster
            </Button>
          </div>
        </div>

        <Card 
          ref={posterRef}
          className="p-8 bg-white max-w-md mx-auto shadow-lg print:shadow-none print:border-none"
          data-testid="card-qr-poster"
        >
          <div className="text-center space-y-6">
            <img 
              src={logoUrl} 
              alt="Yens Thai Ice Cream" 
              className="h-16 mx-auto object-contain"
            />
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Get FREE Birthday Rewards!
              </h1>
              <p className="text-gray-600">
                รับของขวัญวันเกิดฟรี!
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center">
                <SiLine className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[#06C755]">Add us on LINE</span>
            </div>

            <div className="bg-white p-4 rounded-xl border-4 border-[#06C755] inline-block">
              <QRCode 
                value={LINE_URL}
                size={180}
                level="H"
                data-testid="qr-code-line"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Or search for this ID in LINE:</p>
              <div className="inline-block px-6 py-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                <span className="text-2xl font-mono font-bold text-gray-900">{LINE_ID}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-yellow-800">How to link your account:</h3>
              <ol className="text-sm text-yellow-700 text-left space-y-1">
                <li>1. Scan QR code or search @752afsdq</li>
                <li>2. Add Yens Thai as friend</li>
                <li>3. Send your phone number (same as loyalty card)</li>
                <li>4. Done! Receive updates & birthday rewards</li>
              </ol>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400">
                Yens Thai Ice Cream &bull; yensthai.com
              </p>
            </div>
          </div>
        </Card>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            [data-testid="card-qr-poster"],
            [data-testid="card-qr-poster"] * {
              visibility: visible;
            }
            [data-testid="card-qr-poster"] {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              box-shadow: none;
              border: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
