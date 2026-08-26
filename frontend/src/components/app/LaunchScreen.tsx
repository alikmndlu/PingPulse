import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { copy } from "@/i18n";
import { appleEase } from "@/lib/motion";

const LaunchContext = createContext(true);

export function useLaunchDone() {
  return useContext(LaunchContext);
}

let playedThisLoad = false;

const LINES = [
  { text: copy.appName, className: "text-[2.85rem] font-semibold leading-none tracking-[-0.04em] text-foreground", ms: 72 },
  { text: copy.tagline, className: "text-[15px] font-normal tracking-[-0.01em] text-muted-foreground", ms: 26 },
  { text: "Always on.", className: "text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground/55", ms: 48 },
] as const;

export function LaunchProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(playedThisLoad);
  const finish = useCallback(() => {
    playedThisLoad = true;
    setDone(true);
  }, []);

  return (
    <LaunchContext.Provider value={done}>
      {children}
      <AnimatePresence>{done ? null : <LaunchScreen key="launch" onDone={finish} />}</AnimatePresence>
    </LaunchContext.Provider>
  );
}

function LaunchScreen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(reduce ? LINES.map((l) => l.text) : [""]);
  const [logoReady, setLogoReady] = useState(Boolean(reduce));
  const [hint, setHint] = useState(false);

  const finish = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    const skip = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", skip);
    const hintTimer = window.setTimeout(() => setHint(true), 1600);
    return () => {
      window.removeEventListener("keydown", skip);
      window.clearTimeout(hintTimer);
    };
  }, [finish]);

  useEffect(() => {
    if (reduce) {
      const t = window.setTimeout(finish, 900);
      return () => window.clearTimeout(t);
    }
  }, [reduce, finish]);

  useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => setLogoReady(true), 520);
    return () => window.clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !logoReady) return;
    if (line >= LINES.length) {
      const t = window.setTimeout(finish, 780);
      return () => window.clearTimeout(t);
    }
    const current = LINES[line];
    const soFar = typed[line] ?? "";
    if (soFar.length >= current.text.length) {
      const t = window.setTimeout(() => {
        setLine((n) => n + 1);
        setTyped((prev) => (prev.length > line + 1 ? prev : [...prev, ""]));
      }, line === 0 ? 420 : 340);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setTyped((prev) => {
        const next = [...prev];
        next[line] = current.text.slice(0, soFar.length + 1);
        return next;
      });
    }, soFar.length === 0 && line > 0 ? 80 : current.ms);
    return () => window.clearTimeout(t);
  }, [reduce, logoReady, line, typed, finish]);

  const typing = logoReady && line < LINES.length;

  return (
    <motion.button
      type="button"
      aria-label="Continue"
      onClick={finish}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: appleEase }}
      className="fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-background text-left outline-none"
      autoFocus
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-[44%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[90px]"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.25, 0.5, 0.32], scale: [0.92, 1.08, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative flex flex-col items-center"
        exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
        transition={{ duration: 0.55, ease: appleEase }}
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.72, filter: "blur(16px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: appleEase }}
          className="relative"
        >
          <span className="absolute inset-[-18%] rounded-[2rem] bg-primary/20 blur-xl" />
          <img
            src="/appicon.png"
            alt=""
            className="relative h-[88px] w-[88px] rounded-[1.35rem] shadow-[0_20px_50px_-24px_hsl(var(--foreground)/0.55)]"
          />
        </motion.div>

        <div className="mt-9 flex min-h-[7.5rem] w-[min(22rem,calc(100vw-3rem))] flex-col items-center gap-3.5 text-center">
          {LINES.map((item, i) => {
            const visible = typed[i] ?? "";
            const isActive = typing && i === line;
            if (i > line && !visible) return null;
            return (
              <p key={item.text} className={item.className}>
                {visible}
                {isActive ? <span className="launch-caret" /> : null}
              </p>
            );
          })}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: hint ? 1 : 0 }}
        className="absolute bottom-8 text-[11px] tracking-wide text-muted-foreground/50"
      >
        Click to enter
      </motion.p>
    </motion.button>
  );
}
