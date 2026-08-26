import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { appleEase, duration, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useLaunchDone } from "@/components/app/LaunchScreen";

export function PageTransition() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.01 : duration.fast, ease: appleEase }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function Stagger({ children, className, delay = 0.03 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const launched = useLaunchDone();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={launched ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: {
          transition: reduce ? { duration: 0 } : { staggerChildren: 0.05, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: appleEase } },
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
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, delay, ease: appleEase }}
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
