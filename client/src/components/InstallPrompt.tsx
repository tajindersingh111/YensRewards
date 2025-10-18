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
      <Card className="fixed top-4 left-4 right-4 p-5 shadow-lg z-50 bg-[#FCD34D] border-4 border-[#F59E0B]" data-testid="card-install-prompt-ios">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8 text-gray-800" />
              <h3 className="font-bold text-xl text-gray-800">Install Yens App</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-white/30"
              data-testid="button-close-install"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-white/80 p-4 rounded-lg border-2 border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-lg">1</div>
                <p className="font-bold text-lg text-gray-800">Look at the BOTTOM of screen</p>
              </div>
              <div className="flex items-center gap-2 ml-11">
                <Share className="w-6 h-6 text-blue-600" />
                <p className="text-base text-gray-700">Tap the <span className="font-bold text-blue-600">Share button</span> (square with arrow)</p>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-lg border-2 border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-lg">2</div>
                <p className="font-bold text-lg text-gray-800">Scroll down in the menu</p>
              </div>
              <div className="flex items-center gap-2 ml-11">
                <Plus className="w-6 h-6 text-blue-600" />
                <p className="text-base text-gray-700">Find and tap <span className="font-bold text-blue-600">"Add to Home Screen"</span></p>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-lg border-2 border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-lg">3</div>
                <p className="font-bold text-lg text-gray-800">Tap "Add" - Done!</p>
              </div>
              <div className="ml-11">
                <p className="text-base text-green-700 font-bold">✓ Yens icon appears on home screen!</p>
              </div>
            </div>
          </div>
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
