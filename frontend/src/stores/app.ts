import { create } from "zustand";
import type { Settings } from "@/types";

interface AppStore {
  monitoring: boolean;
  paused: boolean;
  theme: Settings["theme"];
  refreshKey: number;
  setMonitoring: (running: boolean, paused?: boolean) => void;
  setTheme: (theme: Settings["theme"]) => void;
  bump: () => void;
}

function normalizeTheme(theme: string | undefined): Settings["theme"] {
  return theme === "light" ? "light" : "dark";
}

function applyTheme(theme: Settings["theme"]) {
  const resolved = normalizeTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
}

export const useAppStore = create<AppStore>((set) => ({
  monitoring: false,
  paused: false,
  theme: "dark",
  refreshKey: 0,
  setMonitoring: (running, paused = false) => set({ monitoring: running, paused }),
  setTheme: (theme) => {
    const resolved = normalizeTheme(theme);
    applyTheme(resolved);
    set({ theme: resolved });
  },
  bump: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));

export { applyTheme, normalizeTheme };
