import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth-context.js";
import { useTheme } from "./lib/theme.js";
import SplashPage from "./pages/SplashPage";
import MarketingPage from "./pages/MarketingPage";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import AppLayout from "./layouts/AppLayout";
import AiPage from "./pages/AiPage";
import SalesPage from "./pages/SalesPage";
import InventoryPage from "./pages/InventoryPage";
import UdhaarPage from "./pages/UdhaarPage";
import ReportsPage from "./pages/ReportsPage";
import BusinessCoachPage from "./pages/BusinessCoachPage";
import VoiceAssistantPage from "./pages/VoiceAssistantPage";
import ScannerPage from "./pages/ScannerPage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";

function RequireAuth({ children }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useTheme(); // Initialize theme globally

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/onboarding" element={<MarketingPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="udhaar" element={<UdhaarPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="coach" element={<BusinessCoachPage />} />
        <Route path="voice" element={<VoiceAssistantPage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
