import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, MessageSquare, Star, Plus, Edit, Package, CheckCircle, Clock, XCircle, Car, Wrench, BadgeCheck, Sparkles, Images, Upload } from "lucide-react";
import ImportModal from "@/components/ImportModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from "@/components/StarRating";
import LogoUpload from "@/components/LogoUpload";
import PartImageUpload from "@/components/PartImageUpload";
import BusinessGallery from "@/components/BusinessGallery";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Business, Message, Review, SparePart, Car as CarType, GarageService, SupportService } from "@shared/schema";
import { BUSINESS_CATEGORIES, FUEL_TYPES, TRANSMISSIONS, CAR_CONDITIONS, PART_CONDITIONS, CAR_BRANDS } from "@shared/schema";

interface DashboardData {
  business: Business;
  messages: Message[];
  reviews: Review[];
  spareParts: SparePart[];
  cars: CarType[];
  garageServices: GarageService[];
  supportServices: SupportService[];
}

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
}


export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user || user.role !== "owner") { navigate("/login"); return null; }

  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ["/api/dashboard"] });

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [galleryCarId, setGalleryCarId] = useState<string | null>(null);

  // Spare parts state
  const [newPart, setNewPart] = useState({ partName: "", carBrand: "", carModel: "", year: "", condition: "new", price: "", description: "", image: "" });
  const [showAddPart, setShowAddPart] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  // Support services state
  const [newSupportService, setNewSupportService] = useState({ name: "", description: "", price: "" });
  const [showAddSupportService, setShowAddSupportService] = useState(false);
  const [editingSupportService, setEditingSupportService] = useState<SupportService | null>(null);

  // Car state
  const [showAddCar, setShowAddCar] = useState(false);
  const [editingCar, setEditingCar] = useState<CarType | null>(null);
  const [newCar, setNewCar] = useState({ title: "", brand: "", model: "", year: new Date().getFullYear(), price: "", mileage: "", fuelType: "petrol", transmission: "automatic", condition: "used", description: "", location: "", images: "" });

  // Service state
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<GarageService | null>(null);
  const [newService, setNewService] = useState({ name: "", description: "", price: "", popular: false });

  // Import modal state
  const [importModalType, setImportModalType] = useState<"cars" | "parts" | "services" | "support-services" | null>(null);

  // M-Pesa premium state
  const [mpesaPhone, setMpesaPhone] = useState("");

  const { data: mpesaConfig } = useQuery<{ amount: number; days: number; configured: boolean }>({
    queryKey: ["/api/mpesa/config"],
  });

  const premiumMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/mpesa/initiate", { phone: mpesaPhone }); return res.json(); },
    onSuccess: (data: { message: string }) => { toast({ title: "Payment initiated!", description: data.message }); setMpesaPhone(""); },
    onError: (e: Error) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
  });

  function startEdit() {
    if (data?.business) { setEditForm({ ...data.business }); setEditMode(true); }
  }

  const updateMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("PUT", "/api/businesses/me", editForm); return res.json(); },
    onSuccess: () => { toast({ title: "Business updated!" }); setEditMode(false); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addPartMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/parts", { ...newPart, businessId: data?.business.id }); return res.json(); },
    onSuccess: () => { toast({ title: "Part added!" }); setNewPart({ partName: "", carBrand: "", carModel: "", year: "", condition: "new", price: "", description: "", image: "" }); setShowAddPart(false); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/parts/${id}`); },
    onSuccess: () => { toast({ title: "Part removed" }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePartMutation = useMutation({
    mutationFn: async (part: SparePart) => { const res = await apiRequest("PUT", `/api/parts/${part.id}`, part); return res.json(); },
    onSuccess: () => { toast({ title: "Part updated!" }); setEditingPart(null); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addSupportServiceMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/support-services", { ...newSupportService, businessId: data?.business.id }); return res.json(); },
    onSuccess: () => { toast({ title: "Service added!" }); setNewSupportService({ name: "", description: "", price: "" }); setShowAddSupportService(false); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSupportServiceMutation = useMutation({
    mutationFn: async (svc: SupportService) => { const res = await apiRequest("PUT", `/api/support-services/${svc.id}`, svc); return res.json(); },
    onSuccess: () => { toast({ title: "Service updated!" }); setEditingSupportService(null); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSupportServiceMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/support-services/${id}`); },
    onSuccess: () => { toast({ title: "Service removed" }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...newCar,
        year: Number(newCar.year),
        price: String(newCar.price),
        mileage: newCar.mileage ? Number(newCar.mileage) : null,
        images: newCar.images ? newCar.images.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await apiRequest("POST", "/api/cars", payload);
      return res.json();
    },
    onSuccess: () => { toast({ title: "Car listing added!" }); setShowAddCar(false); setNewCar({ title: "", brand: "", model: "", year: new Date().getFullYear(), price: "", mileage: "", fuelType: "petrol", transmission: "automatic", condition: "used", description: "", location: "", images: "" }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCarMutation = useMutation({
    mutationFn: async (car: CarType) => { const res = await apiRequest("PUT", `/api/cars/${car.id}`, car); return res.json(); },
    onSuccess: () => { toast({ title: "Car updated!" }); setEditingCar(null); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/cars/${id}`); },
    onSuccess: () => { toast({ title: "Car removed" }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/services", newService); return res.json(); },
    onSuccess: () => { toast({ title: "Service added!" }); setShowAddService(false); setNewService({ name: "", description: "", price: "", popular: false }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (svc: GarageService) => { const res = await apiRequest("PUT", `/api/services/${svc.id}`, svc); return res.json(); },
    onSuccess: () => { toast({ title: "Service updated!" }); setEditingService(null); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/services/${id}`); },
    onSuccess: () => { toast({ title: "Service removed" }); queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-24 rounded-md" /><Skeleton className="h-48 rounded-md" />
    </div>
  );

  if (!data?.business) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <Building2 className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Business Listed</h2>
      <p className="text-muted-foreground mb-5">You haven't registered a business yet.</p>
      <Button onClick={() => navigate("/register-business")} className="bg-red-600 text-white">Register Your Business</Button>
    </div>
  );

  const { business, messages, reviews, spareParts, cars, garageServices, supportServices } = data;
  const isDealer = business.category === "car_dealer";
  const isGarage = business.category === "garage";
  const isSupportBiz = ["insurance", "car_wash", "other"].includes(business.category);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-10">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="dashboard-business-name">{business.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {statusBadge(business.status)}
              <span className="text-sm text-muted-foreground">{BUSINESS_CATEGORIES.find(c => c.value === business.category)?.label}</span>
            </div>
          </div>
          <Button variant="outline" onClick={startEdit} data-testid="button-edit-business">
            <Edit className="w-4 h-4 mr-1.5" />Edit Profile
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: MessageSquare, color: "blue", count: messages.length, label: "Messages" },
            { icon: Star, color: "orange", count: reviews.length, label: "Reviews" },
            ...(isDealer ? [{ icon: Car, color: "blue", count: cars.length, label: "Cars Listed" }] : []),
            ...(isGarage ? [{ icon: Wrench, color: "orange", count: garageServices.length, label: "Services" }] : []),
            ...(isSupportBiz ? [{ icon: Wrench, color: "orange", count: supportServices.length, label: "Services" }] : []),
            ...(!isDealer && !isGarage && !isSupportBiz ? [{ icon: Package, color: "green", count: spareParts.length, label: "Parts Listed" }] : []),
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center ${stat.color === "blue" ? "bg-red-100 dark:bg-red-900/30" : stat.color === "orange" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color === "blue" ? "text-red-600 dark:text-red-400" : stat.color === "orange" ? "text-orange-500" : "text-green-600 dark:text-green-400"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Premium Card */}
        {business && (
          <Card className={`mb-6 ${business.premium ? "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/20" : "border-orange-200 dark:border-orange-800"}`}>
            <CardContent className="pt-5 pb-5">
              {business.premium ? (
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm" data-testid="text-premium-active">Premium Business</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your business appears as verified with a blue checkmark.
                      {business.premiumExpiresAt && ` Expires ${new Date(business.premiumExpiresAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Sparkles className="w-7 h-7 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Get Premium — KSh {mpesaConfig?.amount?.toLocaleString() ?? "2,000"} / {mpesaConfig?.days ?? 30} days</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stand out with a blue verified checkmark and appear in the Premium section on the homepage.</p>
                    </div>
                  </div>
                  {business.status === "approved" ? (
                    <div className="flex gap-2 items-center flex-shrink-0">
                      <Input
                        placeholder="07XXXXXXXX"
                        value={mpesaPhone}
                        onChange={e => setMpesaPhone(e.target.value)}
                        className="w-36 h-9 text-sm"
                        data-testid="input-mpesa-phone"
                      />
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-9 whitespace-nowrap"
                        onClick={() => premiumMutation.mutate()}
                        disabled={premiumMutation.isPending || !mpesaPhone}
                        data-testid="button-pay-premium"
                      >
                        {premiumMutation.isPending ? "Processing..." : "Pay via M-Pesa"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic flex-shrink-0">Available after approval</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit form */}
        {editMode && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Edit Business Profile</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[["Business Name", "name"], ["City", "city"], ["Phone", "phone"], ["WhatsApp", "whatsapp"], ["Address", "address"]].map(([label, field]) => (
                  <div key={field} className={field === "address" ? "sm:col-span-2" : ""}>
                    <Label className="text-xs">{label}</Label>
                    <Input value={(editForm as any)[field] || ""} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))} className="mt-1" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={3} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Business Logo</Label>
                  <LogoUpload value={editForm.logo || ""} onChange={url => setEditForm(p => ({ ...p, logo: url }))} />
                </div>
                {(editForm.category === "garage" || editForm.category === "spare_parts") && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">
                      Car Brands {editForm.category === "spare_parts" ? "You Stock Parts For" : "You Service"}
                      <span className="text-muted-foreground font-normal ml-1">(select all that apply)</span>
                    </Label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CAR_BRANDS.map(brand => {
                        const checked = (editForm.carBrands ?? []).includes(brand);
                        return (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setEditForm(p => ({
                              ...p,
                              carBrands: checked
                                ? (p.carBrands ?? []).filter(b => b !== brand)
                                : [...(p.carBrands ?? []), brand]
                            }))}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-all text-left ${
                              checked
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium"
                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                              checked ? "bg-red-600 border-red-600 text-white" : "border-gray-300 dark:border-gray-600"
                            }`}>
                              {checked ? "✓" : ""}
                            </span>
                            {brand}
                          </button>
                        );
                      })}
                    </div>
                    {(editForm.carBrands ?? []).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">Selected: {(editForm.carBrands ?? []).join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-red-600 text-white" data-testid="button-save-edit">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={isDealer ? "cars" : isGarage ? "services" : isSupportBiz ? "support-services" : "messages"}>
          <TabsList className="mb-4 flex-wrap h-auto">
            {isDealer && <TabsTrigger value="cars" data-testid="tab-cars">My Cars ({cars.length})</TabsTrigger>}
            {isGarage && <TabsTrigger value="services" data-testid="tab-services">My Services ({garageServices.length})</TabsTrigger>}
            {isSupportBiz && <TabsTrigger value="support-services" data-testid="tab-support-services">My Services ({supportServices.length})</TabsTrigger>}
            <TabsTrigger value="messages" data-testid="tab-messages">Messages ({messages.length})</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews ({reviews.length})</TabsTrigger>
            {!isDealer && !isGarage && !isSupportBiz && <TabsTrigger value="parts" data-testid="tab-parts">Spare Parts ({spareParts.length})</TabsTrigger>}
          </TabsList>

          {/* Cars Tab */}
          {isDealer && (
            <TabsContent value="cars">
              {business.status !== "approved" && (
                <div className="p-4 mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
                  Your business must be approved before you can add car listings.
                </div>
              )}
              {business.status === "approved" && (
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={() => setImportModalType("cars")}>
                    <Upload className="w-4 h-4 mr-1" />Import CSV
                  </Button>
                  <Button onClick={() => setShowAddCar(!showAddCar)} className="bg-red-600 text-white" data-testid="button-add-car">
                    <Plus className="w-4 h-4 mr-1" />Add Car
                  </Button>
                </div>
              )}

              {showAddCar && (
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-sm">Add Car Listing</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
                        <Input value={newCar.title} onChange={e => setNewCar(p => ({ ...p, title: e.target.value }))} placeholder="Toyota Prado 2020 4WD" className="mt-1" data-testid="input-car-title" />
                      </div>
                      <div>
                        <Label className="text-xs">Brand <span className="text-red-500">*</span></Label>
                        <Input value={newCar.brand} onChange={e => setNewCar(p => ({ ...p, brand: e.target.value }))} placeholder="Toyota" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Model <span className="text-red-500">*</span></Label>
                        <Input value={newCar.model} onChange={e => setNewCar(p => ({ ...p, model: e.target.value }))} placeholder="Prado" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Year <span className="text-red-500">*</span></Label>
                        <Input type="number" value={newCar.year} onChange={e => setNewCar(p => ({ ...p, year: Number(e.target.value) }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Price (KSh) <span className="text-red-500">*</span></Label>
                        <Input type="number" value={newCar.price} onChange={e => setNewCar(p => ({ ...p, price: e.target.value }))} placeholder="6500000" className="mt-1" data-testid="input-car-price" />
                      </div>
                      <div>
                        <Label className="text-xs">Mileage (km)</Label>
                        <Input type="number" value={newCar.mileage} onChange={e => setNewCar(p => ({ ...p, mileage: e.target.value }))} placeholder="35000" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Location <span className="text-red-500">*</span></Label>
                        <Input value={newCar.location} onChange={e => setNewCar(p => ({ ...p, location: e.target.value }))} placeholder="Nairobi" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Condition <span className="text-red-500">*</span></Label>
                        <Select value={newCar.condition} onValueChange={v => setNewCar(p => ({ ...p, condition: v }))}>
                          <SelectTrigger className="mt-1" data-testid="select-car-condition"><SelectValue /></SelectTrigger>
                          <SelectContent>{CAR_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fuel Type</Label>
                        <Select value={newCar.fuelType} onValueChange={v => setNewCar(p => ({ ...p, fuelType: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Transmission</Label>
                        <Select value={newCar.transmission} onValueChange={v => setNewCar(p => ({ ...p, transmission: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{TRANSMISSIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Image URLs (comma-separated)</Label>
                        <Input value={newCar.images} onChange={e => setNewCar(p => ({ ...p, images: e.target.value }))} placeholder="https://... , https://..." className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={newCar.description} onChange={e => setNewCar(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => addCarMutation.mutate()} disabled={addCarMutation.isPending || !newCar.title || !newCar.brand || !newCar.model || !newCar.price || !newCar.location} className="bg-red-600 text-white" data-testid="button-save-car">
                        {addCarMutation.isPending ? "Adding..." : "Add Car"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddCar(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {cars.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Car className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No car listings yet</p></div>
              ) : (
                <div className="space-y-3">
                  {cars.map(car => (
                    <Card key={car.id} data-testid={`dash-car-${car.id}`}>
                      <CardContent className="pt-4 pb-4">
                        {editingCar?.id === car.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label className="text-xs">Title</Label><Input value={editingCar.title} onChange={e => setEditingCar(p => p ? { ...p, title: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Price</Label><Input type="number" value={Number(editingCar.price)} onChange={e => setEditingCar(p => p ? { ...p, price: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Mileage</Label><Input type="number" value={editingCar.mileage || ""} onChange={e => setEditingCar(p => p ? { ...p, mileage: Number(e.target.value) || null } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Location</Label><Input value={editingCar.location} onChange={e => setEditingCar(p => p ? { ...p, location: e.target.value } : null)} className="mt-1" /></div>
                              <div>
                                <Label className="text-xs">Condition</Label>
                                <Select value={editingCar.condition || "used"} onValueChange={v => setEditingCar(p => p ? { ...p, condition: v as any } : null)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>{CAR_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateCarMutation.mutate(editingCar!)} disabled={updateCarMutation.isPending} className="bg-red-600 text-white">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingCar(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <p className="font-semibold text-gray-900 dark:text-white">{car.title}</p>
                                  {car.condition && (
                                    <Badge className={`text-xs ${car.condition === "new" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                                      {car.condition === "new" ? "Brand New" : "Used"}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{car.brand} {car.model} • {car.year} • {car.location}</p>
                                <p className="text-base font-bold text-red-600 dark:text-red-400 mt-0.5">KSh {Number(car.price).toLocaleString()}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setGalleryCarId(galleryCarId === car.id ? null : car.id)}
                                  data-testid={`button-gallery-car-${car.id}`}
                                  className={galleryCarId === car.id ? "border-red-400 text-red-600 bg-red-50 dark:bg-red-900/20" : ""}
                                >
                                  <Images className="w-3.5 h-3.5 mr-1" />
                                  Photos
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCar(car)} data-testid={`button-edit-car-${car.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteCarMutation.mutate(car.id)} data-testid={`button-delete-car-${car.id}`}>Remove</Button>
                              </div>
                            </div>
                            {galleryCarId === car.id && (
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <BusinessGallery
                                  entityType="car"
                                  entityId={car.id}
                                  canManage={true}
                                  title="Car Photos"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Services Tab */}
          {isGarage && (
            <TabsContent value="services">
              {business.status !== "approved" && (
                <div className="p-4 mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
                  Your business must be approved before you can add services.
                </div>
              )}
              {business.status === "approved" && (
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={() => setImportModalType("services")}>
                    <Upload className="w-4 h-4 mr-1" />Import CSV
                  </Button>
                  <Button onClick={() => setShowAddService(!showAddService)} className="bg-orange-500 text-white" data-testid="button-add-service">
                    <Plus className="w-4 h-4 mr-1" />Add Service
                  </Button>
                </div>
              )}

              {showAddService && (
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-sm">Add Service</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Service Name <span className="text-red-500">*</span></Label>
                        <Input value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="Oil Change" className="mt-1" data-testid="input-service-name" />
                      </div>
                      <div>
                        <Label className="text-xs">Price</Label>
                        <Input value={newService.price} onChange={e => setNewService(p => ({ ...p, price: e.target.value }))} placeholder="KSh 2,000" className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={newService.description} onChange={e => setNewService(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => addServiceMutation.mutate()} disabled={addServiceMutation.isPending || !newService.name} className="bg-orange-500 text-white" data-testid="button-save-service">
                        {addServiceMutation.isPending ? "Adding..." : "Add Service"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddService(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {garageServices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No services listed yet</p></div>
              ) : (
                <div className="space-y-3">
                  {garageServices.map(svc => (
                    <Card key={svc.id} data-testid={`dash-service-${svc.id}`}>
                      <CardContent className="pt-4 pb-4">
                        {editingService?.id === svc.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label className="text-xs">Service Name</Label><Input value={editingService.name} onChange={e => setEditingService(p => p ? { ...p, name: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Price</Label><Input value={editingService.price || ""} onChange={e => setEditingService(p => p ? { ...p, price: e.target.value } : null)} className="mt-1" /></div>
                              <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editingService.description || ""} onChange={e => setEditingService(p => p ? { ...p, description: e.target.value } : null)} rows={2} className="mt-1" /></div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateServiceMutation.mutate(editingService!)} disabled={updateServiceMutation.isPending} className="bg-orange-500 text-white">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{svc.name}</p>
                              {svc.description && <p className="text-sm text-muted-foreground mt-0.5">{svc.description}</p>}
                              {svc.price && <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-0.5">From {svc.price}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingService(svc)} data-testid={`button-edit-service-${svc.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteServiceMutation.mutate(svc.id)} data-testid={`button-delete-service-${svc.id}`}>Remove</Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Messages Tab */}
          <TabsContent value="messages">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No messages yet</p></div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <Card key={msg.id} data-testid={`message-${msg.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{msg.name}</p>
                        <span className="text-xs text-muted-foreground">{new Date(msg.createdAt!).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{msg.phone}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><Star className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No reviews yet</p></div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <Card key={r.id} data-testid={`dash-review-${r.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p>
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt!).toLocaleDateString()}</span>
                      </div>
                      <StarRating rating={r.rating} size="sm" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">{r.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Spare Parts Tab */}
          {!isDealer && !isGarage && (
            <TabsContent value="parts">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={() => setImportModalType("parts")}>
                  <Upload className="w-4 h-4 mr-1" />Import CSV
                </Button>
                <Button onClick={() => setShowAddPart(!showAddPart)} className="bg-orange-500 text-white" data-testid="button-add-part">
                  <Plus className="w-4 h-4 mr-1" />Add Part
                </Button>
              </div>
              {showAddPart && (
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-sm">Add Spare Part</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-xs">Part Name *</Label><Input value={newPart.partName} onChange={e => setNewPart(p => ({ ...p, partName: e.target.value }))} placeholder="Brake Pads" className="mt-1" data-testid="input-part-name" /></div>
                      <div><Label className="text-xs">Car Brand *</Label><Input value={newPart.carBrand} onChange={e => setNewPart(p => ({ ...p, carBrand: e.target.value }))} placeholder="Toyota" className="mt-1" /></div>
                      <div><Label className="text-xs">Car Model *</Label><Input value={newPart.carModel} onChange={e => setNewPart(p => ({ ...p, carModel: e.target.value }))} placeholder="Corolla" className="mt-1" /></div>
                      <div><Label className="text-xs">Year</Label><Input value={newPart.year} onChange={e => setNewPart(p => ({ ...p, year: e.target.value }))} placeholder="2020" className="mt-1" /></div>
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <Select value={newPart.condition} onValueChange={v => setNewPart(p => ({ ...p, condition: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PART_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Price</Label><Input value={newPart.price} onChange={e => setNewPart(p => ({ ...p, price: e.target.value }))} placeholder="KSh 2,500" className="mt-1" /></div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Part Image (optional)</Label>
                        <PartImageUpload value={newPart.image} onChange={url => setNewPart(p => ({ ...p, image: url }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => addPartMutation.mutate()} disabled={addPartMutation.isPending || !newPart.partName || !newPart.carBrand || !newPart.carModel} className="bg-red-600 text-white" data-testid="button-save-part">
                        {addPartMutation.isPending ? "Adding..." : "Add Part"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddPart(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {spareParts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No spare parts listed yet</p></div>
              ) : (
                <div className="space-y-3">
                  {spareParts.map(part => (
                    <Card key={part.id} data-testid={`dash-part-${part.id}`}>
                      <CardContent className="pt-4 pb-4">
                        {editingPart?.id === part.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label className="text-xs">Part Name</Label><Input value={editingPart.partName} onChange={e => setEditingPart(p => p ? { ...p, partName: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Price</Label><Input value={editingPart.price || ""} onChange={e => setEditingPart(p => p ? { ...p, price: e.target.value } : null)} className="mt-1" placeholder="KSh 2,500" /></div>
                              <div><Label className="text-xs">Car Brand</Label><Input value={editingPart.carBrand} onChange={e => setEditingPart(p => p ? { ...p, carBrand: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Car Model</Label><Input value={editingPart.carModel} onChange={e => setEditingPart(p => p ? { ...p, carModel: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Year</Label><Input value={editingPart.year || ""} onChange={e => setEditingPart(p => p ? { ...p, year: e.target.value } : null)} className="mt-1" /></div>
                              <div>
                                <Label className="text-xs">Condition</Label>
                                <Select value={editingPart.condition || "new"} onValueChange={v => setEditingPart(p => p ? { ...p, condition: v as any } : null)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>{PART_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editingPart.description || ""} onChange={e => setEditingPart(p => p ? { ...p, description: e.target.value } : null)} rows={2} className="mt-1" /></div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updatePartMutation.mutate(editingPart!)} disabled={updatePartMutation.isPending} className="bg-orange-500 text-white">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPart(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            {part.image && (
                              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                                <img src={part.image} alt={part.partName} className="w-full h-full object-cover" data-testid={`img-part-${part.id}`} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{part.partName}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{part.carBrand} {part.carModel} {part.year && `• ${part.year}`}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={part.condition === "new" ? "default" : "secondary"} className="text-xs">{part.condition === "new" ? "New" : "Used"}</Badge>
                                  {part.price && <span className="text-sm font-semibold text-orange-600">{part.price}</span>}
                                  <Button size="sm" variant="outline" onClick={() => setEditingPart(part)} data-testid={`button-edit-part-${part.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="text-red-500 text-xs h-7" onClick={() => deletePartMutation.mutate(part.id)} data-testid={`button-delete-part-${part.id}`}>Remove</Button>
                                </div>
                              </div>
                              {part.description && <p className="text-xs text-muted-foreground mt-1">{part.description}</p>}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Support Services Tab */}
          {isSupportBiz && (
            <TabsContent value="support-services">
              {business.status !== "approved" && (
                <div className="p-4 mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
                  Your business must be approved before customers can see your services.
                </div>
              )}

              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={() => setImportModalType("support-services")}>
                  <Upload className="w-4 h-4 mr-1" />Import CSV
                </Button>
                <Button onClick={() => setShowAddSupportService(!showAddSupportService)} className="bg-orange-500 text-white" data-testid="button-add-support-service">
                  {showAddSupportService ? "Cancel" : <><Plus className="w-4 h-4 mr-1" />Add Service</>}
                </Button>
              </div>

              {showAddSupportService && (
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-sm">Add Service</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Service Name <span className="text-red-500">*</span></Label>
                        <Input value={newSupportService.name} onChange={e => setNewSupportService(p => ({ ...p, name: e.target.value }))} placeholder="Comprehensive Cover" className="mt-1" data-testid="input-support-service-name" />
                      </div>
                      <div>
                        <Label className="text-xs">Price</Label>
                        <Input value={newSupportService.price} onChange={e => setNewSupportService(p => ({ ...p, price: e.target.value }))} placeholder="KSh 15,000/year" className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={newSupportService.description} onChange={e => setNewSupportService(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => addSupportServiceMutation.mutate()} disabled={addSupportServiceMutation.isPending || !newSupportService.name} className="bg-orange-500 text-white" data-testid="button-save-support-service">
                        {addSupportServiceMutation.isPending ? "Adding..." : "Add Service"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddSupportService(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {supportServices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No services listed yet</p></div>
              ) : (
                <div className="space-y-3">
                  {supportServices.map(svc => (
                    <Card key={svc.id} data-testid={`dash-support-service-${svc.id}`}>
                      <CardContent className="pt-4 pb-4">
                        {editingSupportService?.id === svc.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label className="text-xs">Service Name</Label><Input value={editingSupportService.name} onChange={e => setEditingSupportService(p => p ? { ...p, name: e.target.value } : null)} className="mt-1" /></div>
                              <div><Label className="text-xs">Price</Label><Input value={editingSupportService.price || ""} onChange={e => setEditingSupportService(p => p ? { ...p, price: e.target.value } : null)} className="mt-1" /></div>
                              <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editingSupportService.description || ""} onChange={e => setEditingSupportService(p => p ? { ...p, description: e.target.value } : null)} rows={2} className="mt-1" /></div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateSupportServiceMutation.mutate(editingSupportService!)} disabled={updateSupportServiceMutation.isPending} className="bg-orange-500 text-white">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingSupportService(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{svc.name}</p>
                              {svc.description && <p className="text-sm text-muted-foreground mt-0.5">{svc.description}</p>}
                              {svc.price && <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-0.5">From {svc.price}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingSupportService(svc)} data-testid={`button-edit-support-service-${svc.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteSupportServiceMutation.mutate(svc.id)} data-testid={`button-delete-support-service-${svc.id}`}>Remove</Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {importModalType && (
        <ImportModal
          open={true}
          type={importModalType}
          onClose={() => setImportModalType(null)}
        />
      )}
    </div>
  );
}
