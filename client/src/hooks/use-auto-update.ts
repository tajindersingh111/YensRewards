import { useEffect } from 'react';

const CURRENT_VERSION = 'v63';

export function useAutoUpdate() {
  // Auto-update disabled to prevent refresh loops on Android
  // Version checking can be manually triggered if needed
  useEffect(() => {
    console.log(`App version: ${CURRENT_VERSION} - Auto-update disabled`);
  }, []);
}
