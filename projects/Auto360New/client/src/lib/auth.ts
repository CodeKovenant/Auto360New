export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner";
}

export function getAuthUser(): AuthUser | null {
  const data = localStorage.getItem("auth_user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser, token: string) {
  localStorage.setItem("auth_user", JSON.stringify(user));
  localStorage.setItem("auth_token", token);
  window.dispatchEvent(new Event("auth-changed"));
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function logout() {
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_token");
  window.dispatchEvent(new Event("auth-changed"));
}
