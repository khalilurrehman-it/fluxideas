import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { TbRadar2, TbEye, TbEyeOff } from "react-icons/tb";
import { BsArrowRight } from "react-icons/bs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAuth } from "@/lib/auth.context";

/* ── Validation schema ────────────────────────────────────────── */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Left panel features ──────────────────────────────────────── */

const PANEL_FEATURES = [
  "Mine Reddit, Product Hunt & Google Trends",
  "AI clusters problems into validated patterns",
  "Opportunity gap scores out of 100",
  "Investor-grade PDF report in under 5 min",
];

/* ── Page ─────────────────────────────────────────────────────── */

export default function UserLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back! Redirecting…");
      navigate(from, { replace: true });
    } catch {
      toast.error("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 10% 110%, oklch(0.42 0.22 270 / 0.6), transparent 60%), oklch(0.10 0.02 270)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <Link to="/" className="flex items-center gap-2.5 relative z-10 w-fit">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/20">
            <TbRadar2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">FluxIdeas</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
              What a PM takes 3 weeks. You in 5 minutes.
            </p>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Stop guessing what to build.
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.78 0.14 270), oklch(0.72 0.20 290))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Let AI find the signal.
              </span>
            </h2>
          </div>
          <ul className="space-y-3">
            {PANEL_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/20 shrink-0 text-white text-[10px]">
                  ✓
                </span>
                <span className="text-sm text-white/70">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm text-white/80 italic leading-relaxed mb-3">
            &ldquo;What used to take our team 3 weeks now takes 5 minutes. The opportunity
            scores changed how we prioritise.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Alex M.</p>
              <p className="text-[10px] text-white/40">Indie hacker · 3 reports/week</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">

        <Link to="/" className="flex items-center gap-2.5 mb-10 group lg:hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 border border-primary/35 group-hover:bg-primary/25 transition-colors">
            <TbRadar2 className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">FluxIdeas</span>
        </Link>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                className={`h-11 bg-background border-border focus-visible:ring-primary/30 ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  className={`h-11 pr-10 bg-background border-border focus-visible:ring-primary/30 ${errors.password ? "border-destructive" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <TbEyeOff className="w-4 h-4" /> : <TbEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2 text-sm mt-1"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign In
                  <BsArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Get started free
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground/40">
            By signing in you agree to our{" "}
            <Link to="/terms" className="hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

    </div>
  );
}
