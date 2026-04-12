import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { BUSINESS_CATEGORIES, AUTOMOTIVE_SUPPORT_SUBCATEGORIES, CAR_BRANDS } from "@shared/schema";
import LogoUpload from "@/components/LogoUpload";

export default function RegisterBusiness() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    description: "",
    logo: "",
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleBrand(brand: string) {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  }

  const needsBrands = form.category === "garage" || form.category === "spare_parts";

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
    if (!agreedToTerms) {
      toast({ title: "Terms required", description: "Please read and accept the Terms & Conditions to continue.", variant: "destructive" });
      return;
    }
    if (form.category === "automotive_support" && !form.subcategory) {
      toast({ title: "Select service type", description: "Please select the type of automotive support service.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/businesses", {
      ...form,
      ownerId: user.id,
      carBrands: needsBrands ? selectedBrands : [],
    });
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
            <div className="text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-5">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Check your email</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                We've sent a verification link to <strong>{user?.email}</strong>. Please click the link to verify your email address and activate your account.
              </p>
            </div>
            <p className="text-muted-foreground mb-5 text-sm">
              After email verification, your business will be reviewed by our admin team. You'll receive another email once it's approved.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/dashboard">
                <Button className="bg-red-600 text-white" data-testid="button-go-dashboard">Go to Dashboard</Button>
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
          <Link href="/">
            <img src="/logo.png" alt="Auto360" className="h-12 w-auto object-contain" />
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
                  <Select value={form.category} onValueChange={v => { setField("category", v); setField("subcategory", ""); }}>
                    <SelectTrigger className="mt-1" data-testid="select-biz-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car_dealer">Automobile Dealers</SelectItem>
                      <SelectItem value="spare_parts">Autospares Dealers</SelectItem>
                      <SelectItem value="garage">Autogarage Repair</SelectItem>
                      <SelectItem value="automotive_support">Automotive Support Industry</SelectItem>
                      <SelectItem value="car_wash">Car Wash & Auto Detailing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.category === "automotive_support" && (
                <div>
                  <Label htmlFor="biz-subcategory">Support Service Type <span className="text-red-500">*</span></Label>
                  <Select value={form.subcategory} onValueChange={v => setField("subcategory", v)}>
                    <SelectTrigger className="mt-1" data-testid="select-biz-subcategory">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMOTIVE_SUPPORT_SUBCATEGORIES.filter(s => s.value !== "car_wash_detailing").map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsBrands && (
                <div>
                  <Label>
                    Car Brands You Deal With
                    <span className="text-muted-foreground text-xs font-normal ml-1">(select all that apply)</span>
                  </Label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="grid-car-brands">
                    {CAR_BRANDS.map(brand => {
                      const checked = selectedBrands.includes(brand);
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => toggleBrand(brand)}
                          data-testid={`brand-checkbox-${brand.toLowerCase().replace(/\s/g, "-")}`}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all text-left ${
                            checked
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                            checked ? "bg-red-600 border-red-600 text-white" : "border-gray-300 dark:border-gray-600"
                          }`}>
                            {checked ? "✓" : ""}
                          </span>
                          {brand}
                        </button>
                      );
                    })}
                  </div>
                  {selectedBrands.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {selectedBrands.join(", ")}
                    </p>
                  )}
                </div>
              )}

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
                  <Label htmlFor="biz-county">County <span className="text-red-500">*</span></Label>
                  <Select value={form.city} onValueChange={val => setField("city", val)}>
                    <SelectTrigger id="biz-county" className="mt-1" data-testid="select-biz-county">
                      <SelectValue placeholder="Select County" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
                        "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
                        "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
                        "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
                        "Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri",
                        "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi",
                        "Trans-Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
                      ].map(county => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label>Business Logo (optional)</Label>
                <LogoUpload value={form.logo} onChange={url => setField("logo", url)} />
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
                  <Link href="/terms" target="_blank" className="text-red-600 dark:text-red-400 font-medium underline hover:text-red-700">
                    Terms &amp; Conditions
                  </Link>
                  {" "}of Auto360Ke. I confirm that the information provided is accurate and that I am authorised to register this business.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 text-white"
                disabled={loading || !user || !agreedToTerms}
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
