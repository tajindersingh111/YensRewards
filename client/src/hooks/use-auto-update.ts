import { useEffect } from 'react';

const CURRENT_VERSION = 'v97';

export function useAutoUpdate() {
  // Auto-update completely disabled
  useEffect(() => {
    console.log(`App version: ${CURRENT_VERSION} - Auto-update disabled`);
  }, []);
}
