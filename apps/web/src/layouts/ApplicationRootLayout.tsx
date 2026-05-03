import { Outlet } from "react-router";
import { ApplicationTopNavBar } from "./navigation/ApplicationTopNavBar";
import { ApplicationPublicFooter } from "./ApplicationPublicFooter";

export function ApplicationRootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <ApplicationTopNavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ApplicationPublicFooter />
    </div>
  );
}
