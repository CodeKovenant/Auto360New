import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, IdCard, Camera, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+254")) return `+254${digits.slice(4)}`;
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  if (digits.startsWith("+")) return digits;
  return `+254${digits}`;
}

function isValidKenyanPhoneNumber(value: string) {
  const normalized = normalizeKenyanPhone(value);
  return /^\+254[1-9]\d{8}$/.test(normalized);
}

export default function RegisterAgent() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    idNumber: "",
    refereeName: "",
    refereePhone: "",
  });
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user) {
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
    return null;
  }

  async function uploadFile(file: File, endpoint: string) {
    const payload = new FormData();
    payload.append("image", file);
    const response = await fetch(endpoint, { method: "POST", body: payload });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password || !form.idNumber || !form.refereeName || !form.refereePhone || !idDocument || !passportPhoto) {
      toast({ title: "Incomplete application", description: "Please fill in every required field and attach both documents.", variant: "destructive" });
      return;
    }
    if (!isValidKenyanPhoneNumber(form.phone) || !isValidKenyanPhoneNumber(form.refereePhone)) {
      toast({ title: "Invalid phone number", description: "Use valid Kenyan phone numbers in the format +2547xx...", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const [idDocumentUrl, passportPhotoUrl] = await Promise.all([
        uploadFile(idDocument, "/api/upload/id-document"),
        uploadFile(passportPhoto, "/api/upload/passport-photo"),
      ]);

      const response = await apiRequest("POST", "/api/auth/register-agent", {
        ...form,
        phone: normalizeKenyanPhone(form.phone),
        refereePhone: normalizeKenyanPhone(form.refereePhone),
        idDocumentUrl,
        passportPhotoUrl,
      });
      const data = await response.json();
      toast({
        title: "Application submitted",
        description: data.user?.agentId ? `${data.message || "Your agent onboarding is pending admin approval."} Agent ID: ${data.user.agentId}` : (data.message || "Your agent onboarding is pending admin approval."),
      });
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[42%] relative flex-col items-center justify-center p-10 text-white overflow-hidden bg-gradient-to-br from-slate-900 via-red-900 to-red-700">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 max-w-sm w-full">
          <Link href="/">
            <img src="/logo.png" alt="Auto360" className="h-14 mb-8 brightness-0 invert object-contain" />
          </Link>
          <h2 className="text-3xl font-extrabold mb-3 leading-snug">Agent onboarding</h2>
          <p className="text-red-100 mb-8 leading-relaxed">
            Become part of the Auto360Ke business onboarding team. Your profile will be reviewed by the admin before you can begin managing business registrations.
          </p>
          <ul className="space-y-3.5">
            <li className="flex items-center gap-3"><IdCard className="w-5 h-5 text-orange-300" /><span className="text-sm text-red-100">National ID verification</span></li>
            <li className="flex items-center gap-3"><Camera className="w-5 h-5 text-orange-300" /><span className="text-sm text-red-100">Passport-size photo required</span></li>
            <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-orange-300" /><span className="text-sm text-red-100">Admin approval required</span></li>
          </ul>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-xl">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Apply to become an agent</CardTitle>
              <CardDescription>Submit your details for approval before onboarding businesses.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="agent-name">Full name</Label>
                    <Input id="agent-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11" required />
                  </div>
                  <div>
                    <Label htmlFor="agent-email">Email address</Label>
                    <Input id="agent-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11" required />
                  </div>
                  <div>
                    <Label htmlFor="agent-phone">Telephone number</Label>
                    <Input id="agent-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+254 700 000 000" className="mt-1.5 h-11" required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="agent-password">Password</Label>
                    <div className="relative mt-1.5">
                      <Input id="agent-password" type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-11" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="agent-id-no">ID number</Label>
                    <Input id="agent-id-no" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} className="mt-1.5 h-11" required />
                  </div>
                  <div>
                    <Label htmlFor="referee-name">Referee name</Label>
                    <Input id="referee-name" value={form.refereeName} onChange={e => setForm({ ...form, refereeName: e.target.value })} className="mt-1.5 h-11" required />
                  </div>
                  <div>
                    <Label htmlFor="referee-phone">Referee telephone</Label>
                    <Input id="referee-phone" type="tel" value={form.refereePhone} onChange={e => setForm({ ...form, refereePhone: e.target.value })} placeholder="+254 700 000 000" className="mt-1.5 h-11" required />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
                    <Label htmlFor="id-file">Upload ID document</Label>
                    <Input id="id-file" type="file" accept="image/*" onChange={(e) => setIdDocument(e.target.files?.[0] || null)} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-red-600 file:text-white file:px-3 file:py-2" />
                  </div>
                  <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
                    <Label htmlFor="photo-file">Upload passport photo</Label>
                    <Input id="photo-file" type="file" accept="image/*" onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-red-600 file:text-white file:px-3 file:py-2" />
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200">
                  <span className="inline-flex items-center gap-2 font-medium"><CheckCircle className="w-4 h-4" /> Admin review required</span>
                  <p className="mt-1">Once submitted, your account will not be active until an admin approves it.</p>
                </div>

                <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                  {loading ? "Submitting application..." : "Submit agent application"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-red-600 dark:text-red-400 font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
