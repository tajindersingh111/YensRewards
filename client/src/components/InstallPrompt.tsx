import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed/standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // For Android - use beforeinstallprompt and auto-trigger
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
      
      // Auto-trigger the install prompt after 1 second (gives page time to load)
      setTimeout(() => {
        (e as BeforeInstallPromptEvent).prompt();
      }, 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - do NOT show install banner (removed per user request)
    // iOS users will use the app in Safari browser without installing

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if already installed or on iOS
  if (isStandalone || !showPrompt || isIOS) return null;

  // Android Auto-Prompt (already triggered automatically)
  return (
    <Card className="fixed top-4 left-4 right-4 p-4 shadow-lg z-50 bg-[#FCD34D] border-2 border-[#F59E0B]" data-testid="card-install-prompt">
      <div className="flex items-start gap-3">
        <Download className="w-6 h-6 mt-0.5 text-gray-800" />
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1 text-gray-800">Install Yens App</h3>
          <p className="text-sm text-gray-700 mb-3">
            Get quick access - tap Install below!
          </p>
          <Button 
            onClick={handleInstall} 
            size="lg" 
            className="w-full bg-white text-gray-800 hover:bg-gray-100 font-semibold"
            data-testid="button-install-app"
          >
            <Download className="w-4 h-4 mr-2" />
            Install Now
          </Button>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-white/30"
          data-testid="button-close-install"
        >
          <X className="w-5 h-5 text-gray-800" />
        </button>
      </div>
    </Card>
  );
}
