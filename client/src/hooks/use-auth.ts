import { useState, useEffect } from "react";
import { getAuthUser, setAuthUser, logout as authLogout, type AuthUser } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser());

  useEffect(() => {
    const handleStorage = () => {
      setUser(getAuthUser());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
