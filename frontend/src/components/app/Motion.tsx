import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { TableRow } from "@/components/ui/table";
import { appleEase, duration, spring, springPage } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function PageTransition() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <AnimatePresence initial={false}>
        <motion.div
          key={location.pathname}
          className="will-change-[transform,opacity]"
          style={{ transformOrigin: "50% 12%" }}
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  y: -18,
                  scale: 1.02,
                  filter: "blur(8px)",
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  pointerEvents: "none",
                }
          }
          transition={
            reduce
              ? { duration: 0.01 }
              : {
                  opacity: { duration: 0.42, ease: appleEase },
                  filter: { duration: 0.45, ease: appleEase },
                  y: springPage,
                  scale: springPage,
                }
          }
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Skeleton → content crossfade. Safe to wait here; the page is already mounted. */
export function Crossfade({
  ready,
  skeleton,
  children,
}: {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {ready ? (
        <motion.div
          key="content"
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={reduce ? { duration: 0 } : { duration: duration.slow, ease: appleEase }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="skeleton"
          initial={false}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.24, ease: appleEase }}
        >
          {skeleton}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Stagger({ children, className, delay = 0.04 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduce ? { duration: 0 } : { staggerChildren: 0.07, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("h-full", className)}
      variants={{
        hidden: reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: reduce ? { duration: 0 } : springPage,
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: duration.slow, delay, ease: appleEase }}
    >
      {children}
    </motion.div>
  );
}

export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className={cn("overflow-hidden", className)}
          initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: duration.base, ease: appleEase }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { motion, AnimatePresence, spring, appleEase };

export const MotionTableRow = motion(TableRow);
