import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router";
import { TbRadar2 } from "react-icons/tb";
import { useAuth } from "@/lib/auth.context";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoadingSession } = useAuth();
  const location = useLocation();

  // Don't redirect while we're still checking the session cookie —
  // avoids a flash redirect to /login on page refresh.
  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 animate-pulse">
          <TbRadar2 className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
