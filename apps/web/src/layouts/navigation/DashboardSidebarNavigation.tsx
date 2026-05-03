import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import type { IconType } from "react-icons";
import { TbRadar2, TbLayoutDashboard, TbSearch, TbFileReport, TbSettings, TbLogout } from "react-icons/tb";
import { useAuth } from "@/lib/auth.context";

interface DashboardSidebarNavItem {
  label: string;
  to: string;
  icon: IconType;
}

const DASHBOARD_PRIMARY_NAV_ITEMS: DashboardSidebarNavItem[] = [
  { label: "Overview",     to: "/dashboard",          icon: TbLayoutDashboard },
  { label: "New Research", to: "/dashboard/research",  icon: TbSearch          },
  { label: "My Reports",   to: "/dashboard/reports",   icon: TbFileReport      },
];

const DASHBOARD_SECONDARY_NAV_ITEMS: DashboardSidebarNavItem[] = [
  { label: "Settings", to: "/dashboard/settings", icon: TbSettings },
];

function SidebarNavLink({
  navItem,
  onClick,
}: {
  navItem: DashboardSidebarNavItem;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const isActive =
    navItem.to === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(navItem.to);

  const NavIcon = navItem.icon;

  return (
    <Link
      to={navItem.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <NavIcon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
      {navItem.label}
    </Link>
  );
}

interface DashboardSidebarNavigationProps {
  onNavItemClick?: () => void;
}

export function DashboardSidebarNavigation({ onNavItemClick }: DashboardSidebarNavigationProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    toast.success("You've been signed out.");
    navigate("/login", { replace: true });
    onNavItemClick?.();
  };

  return (
    <aside className="flex flex-col h-full">

      {/* Brand logo */}
      <Link to="/" className="flex items-center gap-2.5 px-3 py-4 mb-2 group">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/35 group-hover:bg-primary/25 transition-colors shrink-0">
          <TbRadar2 className="w-5 h-5 text-primary" />
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">FluxIdeas</span>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 space-y-0.5 px-2">
        {DASHBOARD_PRIMARY_NAV_ITEMS.map((navItem) => (
          <SidebarNavLink
            key={navItem.to}
            navItem={navItem}
            onClick={onNavItemClick}
          />
        ))}
      </nav>

      {/* Secondary nav + user */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-border/40 pt-4">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground/60 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {DASHBOARD_SECONDARY_NAV_ITEMS.map((navItem) => (
          <SidebarNavLink
            key={navItem.to}
            navItem={navItem}
            onClick={onNavItemClick}
          />
        ))}
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
          onClick={handleSignOut}
        >
          <TbLogout className="w-4.5 h-4.5 shrink-0" />
          Sign Out
        </button>
      </div>

    </aside>
  );
}
