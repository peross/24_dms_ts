import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ClipboardProvider } from "@/contexts/ClipboardContext";
import { Toaster } from "@/components/ui/sonner";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Files } from "./pages/Files";
import { Shared } from "./pages/Shared";
import { Recent } from "./pages/Recent";
import { Trash } from "./pages/Trash";
import { Settings } from "./pages/Settings";
import { AdminUsers } from "./pages/admin/Users";
import { AdminRoles } from "./pages/admin/Roles";
import { AdminUserRoles } from "./pages/admin/UserRoles";
import { FileViewer } from "./pages/FileViewer";

function App() {
  return (
    <QueryProvider>
      <ClipboardProvider>
        <Toaster />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/files"
            element={
              <ProtectedRoute>
                <Layout>
                  <Files />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/files/view/:fileId"
            element={
              <ProtectedRoute>
                <Layout>
                  <FileViewer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/shared"
            element={
              <ProtectedRoute>
                <Layout>
                  <Shared />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/recent"
            element={
              <ProtectedRoute>
                <Layout>
                  <Recent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trash"
            element={
              <ProtectedRoute>
                <Layout>
                  <Trash />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminUsers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/roles"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminRoles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/user-roles"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminUserRoles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </BrowserRouter>
      </ClipboardProvider>
    </QueryProvider>
  );
}

export default App;