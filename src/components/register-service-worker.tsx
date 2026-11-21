"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // L’application reste utilisable si l’enregistrement du service worker échoue.
      });
    }
  }, []);

  return null;
}
