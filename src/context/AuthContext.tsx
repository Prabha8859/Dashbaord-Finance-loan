import React, { createContext, useState, useEffect } from "react";
import type { ApiAdmin } from "../api/auth";
import { fetchAdminProfile } from "../api/auth";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  admin: ApiAdmin | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, admin: ApiAdmin) => void;
  logout: () => void;
  updateAdmin: (admin: ApiAdmin) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<ApiAdmin | null>(() => {
    try {
      const stored = localStorage.getItem("admin_user");
      return stored ? (JSON.parse(stored) as ApiAdmin) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_token");
  });

  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem("admin_token"));

  // On mount — if token exists, re-validate by fetching profile
  useEffect(() => {
    if (token) {
      fetchAdminProfile()
        .then((res) => {
          setAdmin(res.admin);
          localStorage.setItem("admin_user", JSON.stringify(res.admin));
        })
        .catch((err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) {
            logout();
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (newToken: string, newAdmin: ApiAdmin) => {
    setToken(newToken);
    setAdmin(newAdmin);
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("admin_user", JSON.stringify(newAdmin));
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  };

  const updateAdmin = (updated: ApiAdmin) => {
    setAdmin(updated);
    localStorage.setItem("admin_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ admin, token, isLoggedIn: !!token, isLoading, login, logout, updateAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
