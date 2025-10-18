import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// UNREGISTER ALL SERVICE WORKERS - FORCE CLEAR CACHE
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log('SW UNREGISTERED - CACHE CLEARED');
      });
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
