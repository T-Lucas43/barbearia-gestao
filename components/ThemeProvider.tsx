"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  resolvedTheme,
  themePreference,
  themeStorageKey,
  type ThemePreference,
} from "@/lib/theme";
const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}>({ preference: "system", setPreference: () => {} });
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preference, update] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      update(themePreference(localStorage.getItem(themeStorageKey)));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolvedTheme(preference, media.matches);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#101317" : "#f5f6f8");
    };
    apply();
    media.addEventListener("change", apply);
    const storage = (event: StorageEvent) => {
      if (event.key === themeStorageKey)
        update(themePreference(event.newValue));
    };
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", storage);
    };
  }, [preference, ready]);
  const setPreference = (value: ThemePreference) => {
    update(value);
    try {
      localStorage.setItem(themeStorageKey, value);
    } catch {}
  };
  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeControl() {
  const { preference, setPreference } = useContext(ThemeContext);
  const Icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;
  return (
    <label className="theme-control" title="Aparência do sistema">
      <Icon size={17} aria-hidden="true" />
      <select
        aria-label="Tema do sistema"
        value={preference}
        onChange={(e) => setPreference(themePreference(e.target.value))}
      >
        <option value="system">Automático</option>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
      </select>
    </label>
  );
}
