import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { TargetsPage } from "@/pages/Targets";
import { TargetDetailsPage } from "@/pages/TargetDetails";
import { HistoryPage } from "@/pages/History";
import { NotificationsPage } from "@/pages/Notifications";
import { SettingsPage } from "@/pages/Settings";
import { useEffect } from "react";
import { api } from "@/services/api";
import { applyTheme, useAppStore } from "@/stores/app";

export default function App() {
  const setTheme = useAppStore((s) => s.setTheme);
  const setMonitoring = useAppStore((s) => s.setMonitoring);

  useEffect(() => {
    void api
      .getSettings()
      .then((s) => {
        setTheme(s.theme);
        applyTheme(s.theme);
      })
      .catch(() => applyTheme("dark"));
    void api
      .getMonitoringStatus()
      .then((s) => setMonitoring(s.running, s.paused))
      .catch(() => undefined);
  }, [setTheme, setMonitoring]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/targets" element={<TargetsPage />} />
          <Route path="/targets/:id" element={<TargetDetailsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
