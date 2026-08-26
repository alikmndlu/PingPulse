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

  async function finish(seed: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await api.completeOnboarding(seed);
      setOpen(false);
      if (seed) {
        toast.success("Sample target added. Monitoring is on. Configure alerts under Notifications when you want them.");
        navigate("/targets");
      }
    } catch (err) {
      setBusy(false);
      toast.error(wailsError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && void finish(false)}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to PingPulse</DialogTitle>
          <DialogDescription>
            Add a sample ICMP target (1.1.1.1), start monitoring, and you will see it on the dashboard. Alerts live under Notifications — desktop toasts are on by default.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={busy} onClick={() => void finish(false)}>
            Skip
          </Button>
          <Button disabled={busy} onClick={() => void finish(true)}>
            Add sample target
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
