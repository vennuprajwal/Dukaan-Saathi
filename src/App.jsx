import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth-context.js";
import { useTheme } from "./lib/theme.js";
import SplashPage from "./pages/SplashPage";
import MarketingPage from "./pages/MarketingPage";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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
import ShopProfilePage from "./pages/ShopProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import ShopDirectoryPage from "./pages/ShopDirectoryPage";
import CreditPage from "./pages/CreditPage";
import NotificationCenterPage from "./pages/NotificationCenterPage";
import CustomerLedgerPage from "./pages/CustomerLedgerPage";
import CustomerDetailsPage from "./pages/CustomerDetailsPage";

function RequireAuth({ children }) {
  const { isAuthed } = useAuth();
  // Also check storage directly in case React state hasn't updated yet
  const hasToken = Boolean(
    sessionStorage.getItem("dukaan_token") || localStorage.getItem("dukaan_token")
  );
  return (isAuthed || hasToken) ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useTheme(); // Initialize theme globally

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/onboarding" element={<MarketingPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      <Route path="/inventory" element={<Navigate to="/login" replace />} />
      <Route path="/udhaar" element={<Navigate to="/login" replace />} />
      <Route path="/reports" element={<Navigate to="/login" replace />} />
      <Route path="/notifications" element={<Navigate to="/login" replace />} />
      <Route path="/settings" element={<Navigate to="/login" replace />} />
      <Route path="/ledger" element={<Navigate to="/login" replace />} />
      <Route path="/customer/*" element={<Navigate to="/login" replace />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="directory" element={<ShopDirectoryPage />} />
        <Route path="credit" element={<CreditPage />} />
        <Route path="notifications" element={<NotificationCenterPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="udhaar" element={<UdhaarPage />} />
        <Route path="ledger" element={<CustomerLedgerPage />} />
        <Route path="customer/:id" element={<CustomerDetailsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="coach" element={<BusinessCoachPage />} />
        <Route path="voice" element={<VoiceAssistantPage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="profile" element={<ShopProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
