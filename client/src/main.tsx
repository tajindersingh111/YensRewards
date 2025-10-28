import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// UNREGISTER OLD SERVICE WORKER - v64 fix
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('✅ Old service worker unregistered');
      });
    }
  });
}

// TEMPORARILY DISABLED to break free from old service worker cache
// Will re-enable after v51 is confirmed working
// iOS PWA Update Fix - Force service worker updates
/*
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered');
          
          // iOS Fix: Check for waiting SW immediately
          if (registration.waiting) {
            console.log('🔄 Update waiting - reloading...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Check for updates on load
          registration.update();
          
          // Check for updates every 60 seconds (iOS needs this)
          setInterval(() => {
            registration.update();
          }, 60000);
          
          // Check when app regains focus (user switches back to app)
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              registration.update();
            }
          });
          
          // Listen for update found
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🆕 New version available!');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(err => console.error('❌ SW registration failed:', err));
    });
    
    // Auto-reload when new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 New version activated - reloading...');
      window.location.reload();
    });
  }
}

initServiceWorker();
*/

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
