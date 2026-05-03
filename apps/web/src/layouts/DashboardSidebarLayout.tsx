import { useState } from "react";
import { Outlet } from "react-router";
import { TbMenu, TbX } from "react-icons/tb";
import { Button } from "@/shared/ui/button";
import { DashboardSidebarNavigation } from "./navigation/DashboardSidebarNavigation";

const SIDEBAR_WIDTH_CLASS = "w-56";

export function DashboardSidebarLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex">

      {/* Desktop sidebar — always visible on lg+ */}
      <div
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 ${SIDEBAR_WIDTH_CLASS} border-r border-border bg-zinc-50 z-30`}
      >
        <DashboardSidebarNavigation />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 ${SIDEBAR_WIDTH_CLASS} border-r border-border bg-zinc-50 shadow-xl z-50 transform transition-transform duration-200 lg:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebarNavigation onNavItemClick={closeMobileSidebar} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:pl-56 min-h-screen">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/90 backdrop-blur-sm lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            {isMobileSidebarOpen ? (
              <TbX className="w-5 h-5" />
            ) : (
              <TbMenu className="w-5 h-5" />
            )}
          </Button>
          <span className="font-semibold text-sm text-foreground">FluxIdeas</span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
