import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { TargetsPage } from "@/pages/Targets";
import { TargetDetailsPage } from "@/pages/TargetDetails";
import { HistoryPage } from "@/pages/History";
import { IncidentsPage } from "@/pages/Incidents";
import { MaintenancePage } from "@/pages/Maintenance";
import { NotificationsPage } from "@/pages/Notifications";
import { SettingsPage } from "@/pages/Settings";
import { useEffect } from "react";
import { api } from "@/services/api";
import { applyTheme, useAppStore } from "@/stores/app";

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
      })
      .catch(() => applyTheme("dark"));
    void api
      .getMonitoringStatus()
      .then((s) => setMonitoring(s.running, s.paused))
      .catch(() => undefined);
  }, [setTheme, setMonitoring, setMutedUntil]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/targets" element={<TargetsPage />} />
          <Route path="/targets/:id" element={<TargetDetailsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
