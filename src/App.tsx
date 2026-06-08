import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./lib/AuthContext";
import { NotificationsProvider } from "./lib/NotificationsContext";
import GlobalBroadcast from "./components/GlobalBroadcast";
import Home from "./pages/Home";
import Publish from "./pages/Publish";
import AlertDetails from "./pages/AlertDetails";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Discussions from "./pages/Discussions";
import ChatRoom from "./pages/ChatRoom";
import Rules from "./pages/Rules";
import AdminDashboard from "./pages/AdminDashboard";
import Layout from "./components/Layout";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { NotificationWatcher } from "./components/NotificationWatcher";

export default function App() {

  return (
    <ThemeProvider defaultTheme="light" storageKey="sentinelle-ui-theme-v2">
      <GlobalBroadcast />
      <AuthProvider>
        <NotificationsProvider>
          <NotificationWatcher />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="publish" element={<Publish />} />
                <Route path="alert/:id" element={<AlertDetails />} />
                <Route path="settings" element={<Settings />} />
                <Route path="discussions" element={<Discussions />} />
                <Route path="discussions/:id" element={<ChatRoom />} />
                <Route path="rules" element={<Rules />} />
                <Route path="auth" element={<Auth />} />
              </Route>
              {/* Route protégée avec ProtectedAdminRoute */}
              <Route
                path="admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
