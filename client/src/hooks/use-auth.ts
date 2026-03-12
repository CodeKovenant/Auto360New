import { useState, useEffect } from "react";
import { getAuthUser, setAuthUser, logout as authLogout, type AuthUser } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser());

  useEffect(() => {
    const sync = () => setUser(getAuthUser());
    window.addEventListener("auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function login(userData: AuthUser, token: string) {
    setAuthUser(userData, token);
    setUser(userData);
  }

  function logout() {
    authLogout();
    setUser(null);
    queryClient.clear();
  }

  return { user, login, logout, isAdmin: user?.role === "admin", isOwner: user?.role === "owner" };
}
