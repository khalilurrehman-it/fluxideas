import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { TbRadar2, TbEye, TbEyeOff, TbCheck, TbX } from "react-icons/tb";
import { BsArrowRight } from "react-icons/bs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAuth } from "@/lib/auth.context";

/* ── Password strength helpers ────────────────────────────────── */

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",        test: (v) => v.length >= 8 },
  { label: "One uppercase letter (A–Z)",   test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter (a–z)",   test: (v) => /[a-z]/.test(v) },
  { label: "One number (0–9)",             test: (v) => /[0-9]/.test(v) },
  { label: "One special character (!@#…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const STRENGTH_COLORS = [
  "",
  "bg-red-500",
  "bg-amber-500",
  "bg-amber-400",
  "bg-green-500",
  "bg-green-600",
];
const STRENGTH_TEXT = [
  "",
  "text-red-500",
  "text-amber-500",
  "text-amber-500",
  "text-green-600",
  "text-green-600",
];

function getStrength(password: string) {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

/* ── Validation schema ────────────────────────────────────────── */

const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Full name is required.")
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name is too long.")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .max(255, "Email is too long."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
});

type SignupFormValues = z.infer<typeof signupSchema>;

/* ── Left panel data ──────────────────────────────────────────── */

const PANEL_STATS = [
  { value: "< 5 min", label: "Time to first report" },
  { value: "$0.08",   label: "Cost per research"     },
  { value: "500+",    label: "Posts analyzed"        },
  { value: "Free",    label: "First report"          },
];

const PANEL_FEATURES = [
  "No credit card required",
  "Real Reddit & Product Hunt data",
  "Export to PDF instantly",
  "Claude AI-powered analysis",
];

/* ── Page ─────────────────────────────────────────────────────── */

export default function UserSignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const passwordValue = watch("password") ?? "";
  const strength = useMemo(() => getStrength(passwordValue), [passwordValue]);

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup(data.name, data.email, data.password);
      toast.success("Account created! Taking you to your dashboard…");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
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

        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
              AI-powered market research
            </p>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Discover what the market
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.78 0.14 270), oklch(0.72 0.20 290))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                is screaming for.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PANEL_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-2.5">
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

        <p className="relative z-10 text-xs text-white/25 italic">
          Backed by real Reddit data · Validated by Claude AI
        </p>
      </div>

      {/* ── Right panel: form ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background overflow-y-auto">

        <Link to="/" className="flex items-center gap-2.5 mb-10 group lg:hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 border border-primary/35 group-hover:bg-primary/25 transition-colors">
            <TbRadar2 className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">FluxIdeas</span>
        </Link>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Start discovering real market opportunities — first report is free.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                autoComplete="name"
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                className={`h-11 bg-background border-border focus-visible:ring-primary/30 ${errors.name ? "border-destructive" : ""}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
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
                className={`h-11 bg-background border-border focus-visible:ring-primary/30 ${errors.email ? "border-destructive" : ""}`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

              {/* Strength bar */}
              {passwordValue.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                          strength >= level ? STRENGTH_COLORS[strength] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>
                    {STRENGTH_LABELS[strength]}
                  </p>

                  {/* Rule checklist */}
                  <ul className="space-y-1 pt-0.5">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(passwordValue);
                      return (
                        <li key={rule.label} className="flex items-center gap-1.5">
                          {passed ? (
                            <TbCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <TbX className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={`text-[11px] ${passed ? "text-green-600" : "text-muted-foreground/50"}`}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {errors.password && !passwordValue && (
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
                  Creating account…
                </span>
              ) : (
                <>
                  Get Started Free
                  <BsArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground/40">
            By creating an account you agree to our{" "}
            <Link to="/terms" className="hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

    </div>
  );
}
