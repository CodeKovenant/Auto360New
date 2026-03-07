import { Link, useLocation } from "wouter";
import { Car, Menu, X, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  function handleLogout() {
    logout();
    navigate("/");
    setOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">AutoDirectory</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/businesses">
              <Button variant="ghost" size="sm" data-testid="nav-businesses">Businesses</Button>
            </Link>
            <Link href="/register-business">
              <Button variant="ghost" size="sm" data-testid="nav-register">Register Business</Button>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" data-testid="nav-admin">
                      <Shield className="w-4 h-4 mr-1" />
                      Admin Panel
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" data-testid="nav-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="nav-logout">
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="nav-login">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="nav-signup" className="bg-orange-500 text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300"
            onClick={() => setOpen(!open)}
            data-testid="nav-mobile-toggle"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-2">
          <Link href="/businesses" onClick={() => setOpen(false)}>
            <div className="block py-2 text-gray-700 dark:text-gray-300 font-medium">Businesses</div>
          </Link>
          <Link href="/register-business" onClick={() => setOpen(false)}>
            <div className="block py-2 text-gray-700 dark:text-gray-300 font-medium">Register Business</div>
          </Link>
          {user ? (
            <>
              {user.role === "admin" ? (
                <Link href="/admin" onClick={() => setOpen(false)}>
                  <div className="block py-2 text-gray-700 dark:text-gray-300 font-medium">Admin Panel</div>
                </Link>
              ) : (
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <div className="block py-2 text-gray-700 dark:text-gray-300 font-medium">Dashboard</div>
                </Link>
              )}
              <button onClick={handleLogout} className="block py-2 text-red-600 font-medium w-full text-left">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                <div className="block py-2 text-gray-700 dark:text-gray-300 font-medium">Login</div>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <div className="block py-2 text-orange-500 font-medium">Get Started</div>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
