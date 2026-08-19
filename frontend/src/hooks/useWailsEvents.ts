import { useEffect } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { useAppStore } from "@/stores/app";

const EVENTS = [
  "target:status_changed",
  "target:ping_completed",
  "notification:sent",
  "monitoring:started",
  "monitoring:stopped",
  "event:created",
];

export function useWailsEvents() {
  const bump = useAppStore((s) => s.bump);
  const setMonitoring = useAppStore((s) => s.setMonitoring);

  useEffect(() => {
    // Browser-only `pnpm dev` has no Wails webview runtime.
    if (typeof window === "undefined" || !("runtime" in window) || !(window as Window & { runtime?: unknown }).runtime) {
      return;
    }

    const offs = EVENTS.map((name) =>
      EventsOn(name, (payload: unknown) => {
        if (name === "monitoring:started") setMonitoring(true, false);
        if (name === "monitoring:stopped") {
          const p = payload as { running?: boolean; paused?: boolean } | undefined;
          setMonitoring(Boolean(p?.running && !p?.paused), Boolean(p?.paused));
        }
        bump();
      }),
    );
    return () => {
      offs.forEach((off) => off?.());
    };
  }, [bump, setMonitoring]);
}
