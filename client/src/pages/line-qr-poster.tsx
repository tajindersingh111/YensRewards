import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { SiLine } from "react-icons/si";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import logoUrl from "@assets/Yens_logo_high_res_1766925576641.png";

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
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
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
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="max-w-2xl mx-auto p-4 flex items-center justify-between print:hidden">
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
          <Button onClick={handlePrint} className="gap-2 bg-[#06C755]" data-testid="button-print">
            <Printer className="w-4 h-4" />
            Print Poster
          </Button>
        </div>
      </div>

      {/* Poster — A5-ish size, good for counter display */}
      <div
        ref={posterRef}
        className="bg-white max-w-sm mx-auto shadow-xl print:shadow-none"
        style={{ fontFamily: "'Inter', sans-serif" }}
        data-testid="card-qr-poster"
      >
        {/* Top yellow band */}
        <div className="bg-[#FCD34D] px-6 pt-6 pb-4 text-center">
          <img
            src={logoUrl}
            alt="Yen's Thai Ice Cream"
            className="h-20 mx-auto object-contain mb-3"
            crossOrigin="anonymous"
          />
          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            Yen's Thai Ice Cream
          </h1>
          <p className="text-gray-700 font-medium text-sm mt-0.5">เย็นไทยไอศกรีม</p>
        </div>

        {/* Bonus points callout */}
        <div className="bg-[#06C755] px-6 py-4 text-center">
          <p className="text-white font-black text-2xl leading-tight">
            GET 50 BONUS POINTS
          </p>
          <p className="text-white/90 font-bold text-lg">
            รับ 50 คะแนนโบนัส
          </p>
          <p className="text-white/80 text-sm mt-1">
            when you follow us on LINE! • เมื่อติดตามเราบน LINE!
          </p>
        </div>

        {/* QR and instructions */}
        <div className="px-6 py-6 text-center space-y-5">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center">
              <SiLine className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Add Friend on LINE</span>
          </div>

          {/* Step 1 — Scan */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Step 1 — Scan QR Code • สแกน QR Code
            </p>
            <div className="flex justify-center">
              <div className="p-4 border-4 border-[#06C755] rounded-2xl inline-block bg-white">
                <QRCode
                  value={LINE_URL}
                  size={200}
                  level="H"
                  data-testid="qr-code-line"
                />
              </div>
            </div>
          </div>

          {/* Step 2 — Or search */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Or Search • หรือค้นหา
            </p>
            <div className="inline-block px-6 py-3 bg-[#FCD34D]/30 rounded-xl border-2 border-[#FCD34D]">
              <span className="text-3xl font-mono font-black text-gray-900 tracking-wide">{LINE_ID}</span>
            </div>
          </div>

          {/* Step 3 — Connect */}
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-2">
              How to get your 50 points • วิธีรับคะแนน
            </p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#06C755] flex-shrink-0">1.</span>
                <span>Scan QR code &amp; add Yen's as friend • สแกน QR &amp; เพิ่มเพื่อน</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#06C755] flex-shrink-0">2.</span>
                <span>Send your loyalty app phone number • ส่งเบอร์โทรของคุณ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#06C755] flex-shrink-0">3.</span>
                <span>Receive 50 bonus points automatically! • รับ 50 คะแนนทันที!</span>
              </div>
            </div>
          </div>

          {/* Birthday bonus mention */}
          <div className="border-t pt-4 space-y-1">
            <p className="text-sm font-bold text-gray-800">
              Also get FREE Birthday Rewards! 🎂
            </p>
            <p className="text-xs text-gray-500">รับของขวัญวันเกิดฟรีด้วย!</p>
          </div>

          {/* Footer */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-400">yensthai.com &bull; Yen's Thai Ice Cream</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [data-testid="card-qr-poster"],
          [data-testid="card-qr-poster"] * { visibility: visible; }
          [data-testid="card-qr-poster"] {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            box-shadow: none;
            margin: 0;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
