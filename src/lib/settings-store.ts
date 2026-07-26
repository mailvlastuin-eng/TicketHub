import { useEffect, useState } from "react";

export type AppSettings = {
  name: string;
  virtualMail: string;
  cityState: string;
  country: string;
  currency: string;
  gaDesign: string;
  mailDesign: string;
  dark: string;
  transferBtn: string;
  mapView: string;
  orderBtn: string;
  barcode: string;
  ticketBar: string;
  sellBtn: string;
  sellTab: string;
  tt: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  name: "Miller Broome",
  virtualMail: "Weirdrexx@gmail.com",
  cityState: "Texas",
  country: "US",
  currency: "USD",
  gaDesign: "D1 (US)",
  mailDesign: "US",
  dark: "No",
  transferBtn: "Show",
  mapView: "Yes",
  orderBtn: "Show",
  barcode: "Show",
  ticketBar: "Show",
  sellBtn: "Fade",
  sellTab: "Fade",
  tt: "Yes",
};

import { getUser } from "./auth";

const KEY = "tm_app_settings";

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    const user = getUser();
    const dynamicDefaults = {
      ...DEFAULT_SETTINGS,
      virtualMail: user?.email || DEFAULT_SETTINGS.virtualMail,
      name: user?.name || DEFAULT_SETTINGS.name,
    };
    if (!raw) return dynamicDefaults;
    return { ...dynamicDefaults, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("tm-settings"));
  
  // Toggle dark mode class on document element
  if (settings.dark === "Yes") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  useEffect(() => {
    // Apply dark mode on mount
    const initial = getSettings();
    if (initial.dark === "Yes") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const onChange = () => {
      const next = getSettings();
      setSettings(next);
      if (next.dark === "Yes") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    
    window.addEventListener("tm-settings", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tm-settings", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return { settings, updateSettings: (newSettings: AppSettings) => saveSettings(newSettings) };
}
