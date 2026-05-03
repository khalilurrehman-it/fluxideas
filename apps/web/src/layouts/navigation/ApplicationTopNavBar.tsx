import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { TbRadar2, TbLayoutDashboard, TbLogout, TbMenu, TbX } from "react-icons/tb";
import { BsArrowRight } from "react-icons/bs";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/lib/auth.context";

export function ApplicationTopNavBar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleSignOut = async () => {
    await logout();
    toast.success("You've been signed out.");
    navigate("/", { replace: true });
    closeMenu();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          {/* Brand */}
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/35 group-hover:bg-primary/25 transition-colors">
              <TbRadar2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-foreground">
              FluxIdeas
            </span>
          </Link>

          {/* Desktop auth actions */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {user && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <Button
                  asChild
                  size="sm"
                  className="rounded-full font-semibold gap-1.5 shadow-md text-white border-0"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.58 0.28 280), oklch(0.55 0.26 240))",
                  }}
                >
                  <Link to="/dashboard">
                    <TbLayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full font-semibold gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
                  onClick={handleSignOut}
                >
                  <TbLogout className="w-3.5 h-3.5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary font-medium"
                >
                  <Link to="/login">Sign In</Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-1.5 shadow-sm transition-all"
                >
                  <Link to="/signup">
                    Get Started
                    <BsArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <TbX className="w-5 h-5" /> : <TbMenu className="w-5 h-5" />}
          </button>

        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={closeMenu}
          />

          {/* Menu panel */}
          <div className="fixed top-16 left-0 right-0 z-40 sm:hidden border-b border-border bg-background/95 backdrop-blur-md shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {/* User info */}
                  {user && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 border border-primary/25 text-primary text-sm font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  )}

                  <Link
                    to="/dashboard"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.58 0.28 280), oklch(0.55 0.26 240))",
                    }}
                  >
                    <TbLayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <TbLogout className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Sign In
                  </Link>

                  <Link
                    to="/signup"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
                  >
                    Get Started
                    <BsArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
