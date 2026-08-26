import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { TargetsPage } from "@/pages/Targets";
import { TargetDetailsPage } from "@/pages/TargetDetails";
import { HistoryPage } from "@/pages/History";
import { IncidentsPage } from "@/pages/Incidents";
import { SlaReportPage } from "@/pages/SlaReport";
import { MaintenancePage } from "@/pages/Maintenance";
import { NotificationsPage } from "@/pages/Notifications";
import { HelpPage } from "@/pages/Help";
import { SettingsPage } from "@/pages/Settings";
import { useEffect } from "react";
import { api } from "@/services/api";
import { applyTheme, useAppStore } from "@/stores/app";
import { appleEase } from "@/lib/motion";
import { putCache } from "@/lib/queryCache";
import { LaunchProvider } from "@/components/app/LaunchScreen";

export default function App() {
  const setTheme = useAppStore((s) => s.setTheme);
  const setMonitoring = useAppStore((s) => s.setMonitoring);
  const setMutedUntil = useAppStore((s) => s.setMutedUntil);

  useEffect(() => {
    void api
      .getSettings()
      .then((s) => {
        setTheme(s.theme);
        applyTheme(s.theme);
        setMutedUntil(s.mutedUntil ?? "");
        putCache("settings", s);
      })
      .catch(() => applyTheme("dark"));
    void api
      .getMonitoringStatus()
      .then((s) => setMonitoring(s.running, s.paused))
      .catch(() => undefined);
    void Promise.all([
      api.getDashboardStats().then((s) => {
        putCache("dashboard", s);
        setMonitoring(s.monitoring, s.paused);
      }),
      api.getTargets().then((list) => putCache("targets", list ?? [])),
      api.listGroups().then((g) => putCache("groups", g ?? [])),
    ]).catch(() => undefined);
  }, [setTheme, setMonitoring, setMutedUntil]);

  return (
    <MotionConfig reducedMotion="user" transition={{ ease: appleEase, duration: 0.42 }}>
      <LaunchProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/targets" element={<TargetsPage />} />
              <Route path="/targets/:id" element={<TargetDetailsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/sla" element={<SlaReportPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LaunchProvider>
    </MotionConfig>
  );
}
