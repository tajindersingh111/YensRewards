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

    // For iOS - show manual instructions after 1 second if not already installed
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 1000);
    }

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

  // Don't show if already installed
  if (isStandalone || !showPrompt) return null;

  // iOS Instructions
  if (isIOS && !deferredPrompt) {
    return (
      <Card className="fixed top-4 left-4 right-4 p-4 shadow-lg z-50 bg-[#FCD34D] border-2 border-[#F59E0B]" data-testid="card-install-prompt-ios">
        <div className="flex items-start gap-3">
          <Download className="w-6 h-6 mt-0.5 text-gray-800" />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2 text-gray-800">Install Yens App on iPhone</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded">
                <span className="font-semibold text-gray-800">1.</span>
                <Share className="w-4 h-4" />
                <span>Tap the <strong>Share button</strong> at the bottom</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded">
                <span className="font-semibold text-gray-800">2.</span>
                <Plus className="w-4 h-4" />
                <span>Tap <strong>"Add to Home Screen"</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded">
                <span className="font-semibold text-gray-800">3.</span>
                <Download className="w-4 h-4" />
                <span>Tap <strong>"Add"</strong> - Done! ✓</span>
              </div>
            </div>
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
