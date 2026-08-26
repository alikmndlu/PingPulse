import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLaunchDone } from "@/components/app/LaunchScreen";
import { api } from "@/services/api";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function OnboardingDialog() {
  const navigate = useNavigate();
  const launched = useLaunchDone();
  const [open, setOpen] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!launched) return;
    void api
      .getSettings()
      .then((s) => {
        if (!s.onboardingComplete) setOpen(true);
      })
      .catch(() => {});
  }, [launched]);

  async function finish(seed: boolean, next?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api.completeOnboarding(seed);
      setOpen(false);
      if (seed) {
        toast.success("Sample target added. Monitoring is on. Configure alerts under Notifications when you want them.");
        navigate("/targets");
      } else if (next) {
        navigate(next);
      }
    } catch (err) {
      setBusy(false);
      toast.error(wailsError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && void finish(false)}>
      <DialogContent className="max-w-md overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="relative -mx-6 -mt-6 mb-2 overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-7">
          <span className="pointer-events-none absolute -right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-primary/25 blur-2xl" />
          <p className="relative text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Welcome</p>
          <DialogHeader className="relative mt-2 space-y-2">
            <DialogTitle className="text-[1.45rem] tracking-[-0.03em]">Know when a host goes silent.</DialogTitle>
            <DialogDescription>
              Add a sample ICMP target (1.1.1.1), start monitoring, and you will see it on the dashboard. Alerts live under Notifications — desktop toasts are on by default.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={busy} onClick={() => void finish(false)}>
            Skip
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void finish(false, "/help")}>
            Open the guide
          </Button>
          <Button disabled={busy} onClick={() => void finish(true)}>
            Add sample target
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
