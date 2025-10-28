import { useEffect } from 'react';

const CURRENT_VERSION = 'v63';
const CHECK_INTERVAL = 300000; // Check every 5 minutes (much less aggressive)
const INITIAL_DELAY = 30000; // Wait 30 seconds before first check

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

    // Wait 30 seconds before first check (prevents refresh loop on load)
    const initialTimeout = setTimeout(checkVersion, INITIAL_DELAY);

    // Check periodically every 5 minutes
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
}
