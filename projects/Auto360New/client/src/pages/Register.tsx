import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Car, Wrench, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  "Free business listing registration",
  "Reach thousands of customers daily",
  "Verified & admin-approved listings",
  "Coverage across all 47 counties",
  "M-Pesa premium subscription available",
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();
  const { login, user } = useAuth();
  const [, navigate] = useLocation();

  if (user) {
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Terms required", description: "Please read and accept the Terms & Conditions to continue.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password, role: "owner" });
      const data = await res.json();
      login(data.user, data.token);
      toast({ title: "Account created!", description: "Welcome to Auto360Ke." });
      navigate("/register-business");
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-[45%] relative flex-col items-center justify-center p-12 text-white overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-red-950">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-white/10" />
        <div className="relative z-10 max-w-sm w-full">
          <Link href="/">
            <img src="/logo.png" alt="Auto360" className="h-14 mb-8 brightness-0 invert object-contain" />
          </Link>
          <h2 className="text-3xl font-extrabold mb-3 leading-snug">Grow Your Auto Business</h2>
          <p className="text-red-200 mb-8 leading-relaxed">
            Join hundreds of automotive businesses already listed on Auto360Ke and reach more customers every day.
          </p>
          <ul className="space-y-3.5">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-orange-300 flex-shrink-0" />
                <span className="text-sm text-red-100">{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 pt-8 border-t border-white/10 flex items-center gap-4 text-xs text-red-300">
            <div className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Dealers</div>
            <div className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Garages</div>
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> 47 Counties</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-6">
          <Link href="/">
            <img src="/logo.png" alt="Auto360" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        <div className="w-full max-w-md">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>Register to list your automotive business</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1.5 h-11"
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 h-11"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="h-11"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <Checkbox
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5 flex-shrink-0"
                    data-testid="checkbox-terms"
                  />
                  <Label htmlFor="terms-checkbox" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed cursor-pointer">
                    I have read and agree to the{" "}
                    <Link href="/terms" className="text-red-600 dark:text-red-400 font-medium underline hover:text-red-700">
                      Terms &amp; Conditions
                    </Link>
                    {" "}of Auto360Ke.
                  </Label>
                </div>

                <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold" disabled={loading || !agreedToTerms} data-testid="button-register">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-5">
            <Link href="/" className="hover:underline">← Back to Auto360Ke</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
