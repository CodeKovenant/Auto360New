import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Car, Upload, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { BUSINESS_CATEGORIES } from "@shared/schema";

export default function RegisterBusiness() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    description: "",
    logo: "",
  });

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate("/register");
      return;
    }
    if (!form.name || !form.category || !form.phone || !form.whatsapp || !form.address || !form.city || !form.description) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/businesses", { ...form, ownerId: user.id });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      setSuccess(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Listing Submitted!</h2>
            <p className="text-muted-foreground mb-5">
              Your business has been submitted and is pending admin approval. We'll review it shortly.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/dashboard">
                <Button className="bg-blue-600 text-white" data-testid="button-go-dashboard">Go to Dashboard</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">AutoDirectory</span>
          </Link>
        </div>

        {!user && (
          <div className="mb-5 p-4 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-300">
            You need an account to register a business.{" "}
            <Link href="/register" className="font-medium underline">Create an account</Link> or{" "}
            <Link href="/login" className="font-medium underline">sign in</Link> first.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Register Your Business</CardTitle>
            <CardDescription>Fill in the details below to list your car business. Your listing will be reviewed by our team before going live.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="biz-name">Business Name <span className="text-red-500">*</span></Label>
                  <Input id="biz-name" value={form.name} onChange={e => setField("name", e.target.value)} placeholder="ABC Motors" className="mt-1" required data-testid="input-biz-name" />
                </div>
                <div>
                  <Label htmlFor="biz-category">Category <span className="text-red-500">*</span></Label>
                  <Select value={form.category} onValueChange={v => setField("category", v)}>
                    <SelectTrigger className="mt-1" data-testid="select-biz-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.filter(c => c.value !== "automotive_support").map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="biz-phone">Phone Number <span className="text-red-500">*</span></Label>
                  <Input id="biz-phone" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+254 700 000 000" className="mt-1" required data-testid="input-biz-phone" />
                </div>
                <div>
                  <Label htmlFor="biz-whatsapp">WhatsApp Number <span className="text-red-500">*</span></Label>
                  <Input id="biz-whatsapp" value={form.whatsapp} onChange={e => setField("whatsapp", e.target.value)} placeholder="+254 700 000 000" className="mt-1" required data-testid="input-biz-whatsapp" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="biz-city">City <span className="text-red-500">*</span></Label>
                  <Input id="biz-city" value={form.city} onChange={e => setField("city", e.target.value)} placeholder="Nairobi" className="mt-1" required data-testid="input-biz-city" />
                </div>
                <div>
                  <Label htmlFor="biz-address">Address <span className="text-red-500">*</span></Label>
                  <Input id="biz-address" value={form.address} onChange={e => setField("address", e.target.value)} placeholder="123 Main Street" className="mt-1" required data-testid="input-biz-address" />
                </div>
              </div>

              <div>
                <Label htmlFor="biz-desc">Description <span className="text-red-500">*</span></Label>
                <Textarea id="biz-desc" value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Tell customers about your business, what you offer, your experience..." className="mt-1" rows={4} required data-testid="input-biz-description" />
              </div>

              <div>
                <Label htmlFor="biz-logo">Logo URL (optional)</Label>
                <div className="relative mt-1">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="biz-logo" value={form.logo} onChange={e => setField("logo", e.target.value)} placeholder="https://example.com/logo.png" className="pl-9" data-testid="input-biz-logo" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 text-white"
                disabled={loading || !user}
                data-testid="button-submit-business"
              >
                {loading ? "Submitting..." : "Submit Listing for Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
