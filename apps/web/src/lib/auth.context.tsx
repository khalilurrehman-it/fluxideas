import { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from "react";

const BACKEND_API_BASE_URL = import.meta.env.VITE_API_URL as string;

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentSessionUser(): Promise<AuthUser | null> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/auth/get-session`, {
        credentials: "include",
      });

      // 401 = definitively not authenticated — no point retrying
      if (response.status === 401) return null;

      // 5xx = server/DB cold-start error — retry before giving up
      if (!response.ok) {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        return null;
      }

      const data = await response.json() as { user?: AuthUser };
      return data?.user ?? null;
    } catch {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      return null;
    }
  }

  return null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Restore session from cookie on first render
  useEffect(() => {
    fetchCurrentSessionUser().then((sessionUser) => {
      setUser(sessionUser);
      setIsLoadingSession(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      // Better Auth returns the same error code for "user not found" and "wrong password".
      // We make a second call to distinguish them and show a specific message.
      let errorMessage = "Incorrect password. Please try again.";
      try {
        const checkRes = await fetch(
          `${BACKEND_API_BASE_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`
        );
        if (checkRes.ok) {
          const { exists } = await checkRes.json() as { exists: boolean };
          if (!exists) errorMessage = "This email is not registered.";
        }
      } catch {
        errorMessage = "Invalid email or password.";
      }
      throw new Error(errorMessage);
    }

    const data = await response.json() as { user: AuthUser };
    setUser(data.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(errorData?.message ?? "Could not create account. The email may already be in use.");
    }

    const data = await response.json() as { user: AuthUser };
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BACKEND_API_BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoadingSession, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
