import { Link, useLocation } from "wouter";
import { Car, Menu, X, LogOut, LayoutDashboard, Shield, Wrench, Store } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import TopBar from "./TopBar";

const NAV_CATEGORIES = [
  { label: "Automobile Dealers", href: "/businesses?category=car_dealer", icon: Car, param: "car_dealer" },
  { label: "Autospares Dealers", href: "/businesses?category=spare_parts", icon: Store, param: "spare_parts" },
  { label: "Autogarage Repair", href: "/businesses?category=garage", icon: Wrench, param: "garage" },
  { label: "Automotive Support", href: "/businesses?category=automotive_support", icon: Shield, param: "automotive_support" },
];

function isNavActive(href: string, location: string): boolean {
  const hrefPath = href.split("?")[0];
  const hrefQuery = href.includes("?") ? href.split("?")[1] : null;
  const currentPath = location.split("?")[0];
  const currentSearch = typeof window !== "undefined" ? window.location.search : "";
  if (currentPath !== hrefPath) return false;
  if (!hrefQuery) return true;
  return currentSearch.includes(hrefQuery);
}

function getRoleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "owner") return "Business";
  return "User";
}

function getInitials(email: string) {
  return email?.charAt(0).toUpperCase() ?? "U";
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  function handleLogout() {
    logout();
    navigate("/");
    setOpen(false);
  }

  return (
    <div className="sticky top-0 z-50">
      <TopBar />
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0" data-testid="nav-logo">
              <img
                src="/logo.png"
                alt="Auto360 - Your guide to the Auto World"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop category nav */}
            <div className="hidden lg:flex items-center gap-0">
              {NAV_CATEGORIES.map(({ label, href, icon: Icon, param }) => {
                const active = isNavActive(href, location);
                return (
                  <Link key={href} href={href}>
                    <button
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                        active
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-500"
                          : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      data-testid={`nav-cat-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  </Link>
                );
              })}
              <Link href="/register-business">
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                    isNavActive("/register-business", location)
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  data-testid="nav-register"
                >
                  Register Business
                </button>
              </Link>
            </div>

            {/* Desktop auth section */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  {/* User badge */}
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full pl-1.5 pr-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{getInitials(user.email)}</span>
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                      <span className="text-[10px] text-muted-foreground">{getRoleLabel(user.role)}</span>
                    </div>
                  </div>

                  {user.role === "admin" ? (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400" data-testid="nav-admin">
                        <Shield className="w-3.5 h-3.5 mr-1" />
                        Admin
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm" className="text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400" data-testid="nav-dashboard">
                        <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-gray-500" data-testid="nav-logout">
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-xs" data-testid="nav-login">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" data-testid="nav-signup" className="text-xs bg-red-600 hover:bg-red-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300"
              onClick={() => setOpen(!open)}
              data-testid="nav-mobile-toggle"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">

            {/* User info (when logged in) */}
            {user && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{getInitials(user.email)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground">{user.email} · {getRoleLabel(user.role)}</p>
                </div>
              </div>
            )}

            {/* Category links */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1 pb-1.5">Browse</p>
            <div className="space-y-0.5">
              {NAV_CATEGORIES.map(({ label, href, icon: Icon }) => {
                const active = isNavActive(href, location);
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}>
                    <div className={`flex items-center gap-2.5 px-2 py-2.5 rounded-md font-medium text-sm transition-colors ${
                      active
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}>
                      <Icon className={`w-4 h-4 ${active ? "text-red-500" : "text-gray-400"}`} />
                      {label}
                    </div>
                  </Link>
                );
              })}
              <Link href="/register-business" onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-2.5 px-2 py-2.5 rounded-md font-medium text-sm ${
                  isNavActive("/register-business", location)
                    ? "bg-red-50 text-red-600"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  Register Business
                </div>
              </Link>
            </div>

            {/* Auth section */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
              {user ? (
                <>
                  {user.role === "admin" ? (
                    <Link href="/admin" onClick={() => setOpen(false)}>
                      <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                        <Shield className="w-4 h-4" /> Admin Panel
                      </div>
                    </Link>
                  ) : (
                    <Link href="/dashboard" onClick={() => setOpen(false)}>
                      <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                        <LayoutDashboard className="w-4 h-4" /> My Dashboard
                      </div>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-sm" data-testid="mobile-login">Login</Button>
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="flex-1">
                    <Button size="sm" className="w-full text-sm bg-red-600 hover:bg-red-700 text-white" data-testid="mobile-signup">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
