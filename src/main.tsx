import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker with auto-update.
// Polls every 60s for a new build; when found, immediately activates and reloads.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app") && window.location.hostname.includes("preview");

if (!isInIframe && !isPreviewHost) {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);
      // Also check when the tab becomes visible
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      });
    },
    onNeedRefresh() {
      updateSW(true);
    },
  });
} else {
  // Cleanup any previously registered SW in preview/iframe contexts
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
