"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AuthContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("nexus_token");
  });

  const setToken = useCallback((nextToken: string | null) => {
    setTokenState(nextToken);
    if (typeof window === "undefined") {
      return;
    }

    if (nextToken) {
      window.localStorage.setItem("nexus_token", nextToken);
    } else {
      window.localStorage.removeItem("nexus_token");
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      setToken,
      isAuthenticated: Boolean(token),
    }),
    [setToken, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
