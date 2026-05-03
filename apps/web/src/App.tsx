import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "@/shared/ui/sonner";
import { AuthProvider } from "@/lib/auth.context";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { ApplicationRootLayout } from "@/layouts/ApplicationRootLayout";
import { DashboardSidebarLayout } from "@/layouts/DashboardSidebarLayout";
import LandingPage from "@/pages/landing/LandingPage";
import UserLoginPage from "@/pages/auth/UserLoginPage";
import UserSignupPage from "@/pages/auth/UserSignupPage";
import UserDashboardOverviewPage from "@/pages/dashboard/UserDashboardOverviewPage";
import UserResearchPage from "@/pages/research/UserResearchPage";
import UserReportsPage from "@/pages/reports/UserReportsPage";
import UserReportDetailPage from "@/pages/reports/UserReportDetailPage";
import NotFoundPage from "@/pages/errors/NotFoundPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public routes — top nav + footer */}
          <Route element={<ApplicationRootLayout />}>
            <Route index element={<LandingPage />} />
          </Route>

          {/* Auth routes — standalone, no nav/footer */}
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/signup" element={<UserSignupPage />} />

          {/* Dashboard routes — protected, sidebar layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardSidebarLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserDashboardOverviewPage />} />
            <Route path="research" element={<UserResearchPage />} />
            <Route path="reports" element={<UserReportsPage />} />
            <Route path="reports/:reportId" element={<UserReportDetailPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
