import { useEffect } from 'react';

const CURRENT_VERSION = 'v63';
const CHECK_INTERVAL = 300000; // Check every 5 minutes

export function useAutoUpdate() {
  useEffect(() => {
    console.log(`App version: ${CURRENT_VERSION} - Auto-update every 5 minutes`);
    
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

    // Check every 5 minutes (NO immediate check on load)
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, []);
}
