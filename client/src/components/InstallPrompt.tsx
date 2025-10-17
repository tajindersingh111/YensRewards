import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

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

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-primary text-primary-foreground" data-testid="card-install-prompt">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install Yens App</h3>
          <p className="text-sm opacity-90 mb-3">
            Install this app on your device for quick access and offline use
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall} 
              size="sm" 
              variant="secondary"
              data-testid="button-install-app"
            >
              Install
            </Button>
            <Button 
              onClick={handleDismiss} 
              size="sm" 
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-dismiss-install"
            >
              Not Now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-primary-foreground/20"
          data-testid="button-close-install"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}
