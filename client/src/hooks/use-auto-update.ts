import { useEffect } from 'react';

const CURRENT_VERSION = 'v56';
const CHECK_INTERVAL = 60000; // Check every 60 seconds

export function useAutoUpdate() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        
        if (data.version !== CURRENT_VERSION) {
          console.log(`New version available: ${data.version} (current: ${CURRENT_VERSION})`);
          // Force reload to get new version
          window.location.reload();
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check on mount
    checkVersion();

    // Check periodically
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Check when page becomes visible (iOS Safari)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
