import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Shield, Building2, CheckCircle, XCircle, Trash2, Users, Star,
  Clock, Flag, Phone, MessageCircle, MapPin, Mail, User, ExternalLink,
  Calendar, ChevronDown, ChevronUp, BadgeCheck, TrendingUp, DollarSign, AlertCircle, Pause, Play, Pencil,
  Download, Upload, FileText, FileUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Business, Review, User as UserType, BusinessReport } from "@shared/schema";
import { BUSINESS_CATEGORIES, REPORT_REASONS } from "@shared/schema";
import { useState, useRef } from "react";
import { getAuthToken } from "@/lib/auth";

type EnrichedBusiness = Business & {
  avgRating: number;
  reviewCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

interface AdminData {
  stats: { total: number; pending: number; approved: number; rejected: number; totalReviews: number };
  pending: EnrichedBusiness[];
  approved: EnrichedBusiness[];
  rejected: EnrichedBusiness[];
  reviews: (Review & { businessName: string })[];
  users: Omit<UserType, "password" | "emailVerificationToken" | "emailVerifiedAt">[];
}

interface AdminImportBusiness {
  id: string;
  name: string;
  category: string;
  city: string;
}

interface AdminImportResult {
  imported: number;
  failed: number;
  skipped: number;
  errors: string[];
  created?: { id: string; name: string; city: string }[];
}

interface AdminBusinessEditForm {
  name: string; description: string; phone: string; whatsapp: string; address: string; city: string;
  subcategory: string; website: string; logo: string; banner: string; latitude: string; longitude: string;
  carBrands: string; ownerId: string;
}

type FeaturedItemType = "business" | "car" | "part" | "garage_service" | "support_service";
type FeaturedItem = {
  id: string;
  type: FeaturedItemType;
  name: string;
  subtitle: string;
  featured: boolean;
  status?: "pending" | "approved";
  suspended: boolean;
  description?: string | null;
  price?: string | null;
};

type AdminFeatureRequest = {
  id: string;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  itemType: FeaturedItemType;
  itemId: string;
  itemName: string;
  createdAt: string;
};

const FEATURED_ITEM_GROUPS: { type: FeaturedItemType; title: string }[] = [
  { type: "business", title: "Businesses" },
  { type: "car", title: "Cars" },
  { type: "part", title: "Spare parts" },
  { type: "garage_service", title: "Garage services" },
  { type: "support_service", title: "Automotive support services" },
];

const FEATURED_ITEM_ROUTES: Record<FeaturedItemType, string> = {
  business: "/business",
  car: "/cars",
  part: "/parts",
  garage_service: "/services",
  support_service: "/support-services",
};

type AdminImportType = "businesses" | "cars" | "parts" | "services" | "support-services";

const ADMIN_IMPORT_CONFIG: Record<AdminImportType, { label: string; requiredColumns: string[]; optionalColumns: string[]; description: string }> = {
  businesses: {
    label: "Businesses",
    requiredColumns: ["name", "phone"],
    optionalColumns: ["whatsapp", "address", "city", "description", "subcategory", "carBrands", "website", "logo", "banner", "latitude", "longitude"],
    description: "Each imported business gets an approved public profile and is not featured by default. Assign an existing owner account so they can complete missing details; feature the business later to promote it on its category page.",
  },
  cars: {
    label: "Cars",
    requiredColumns: ["title", "brand", "model", "year", "price", "location"],
    optionalColumns: ["mileage", "fuelType", "transmission", "condition", "description"],
    description: "Car listings will be attached to the selected approved car dealer.",
  },
  parts: {
    label: "Spare Parts",
    requiredColumns: ["partName", "carBrand", "carModel"],
    optionalColumns: ["year", "condition", "price", "description"],
    description: "Spare parts will be attached to the selected approved spare-parts business.",
  },
  services: {
    label: "Garage Services",
    requiredColumns: ["name"],
    optionalColumns: ["description", "price"],
    description: "Services will be attached to the selected approved garage.",
  },
  "support-services": {
    label: "Support Services",
    requiredColumns: ["name"],
    optionalColumns: ["description", "startingPrice"],
    description: "Support services will be attached to the selected approved support business.",
  },
};

const ADMIN_IMPORT_BUSINESS_CATEGORIES: Partial<Record<AdminImportType, string[]>> = {
  cars: ["car_dealer"],
  parts: ["spare_parts"],
  services: ["garage"],
  "support-services": ["insurance", "car_wash", "other"],
};

const ADMIN_IMPORT_OPTIONS: { value: AdminImportType; label: string }[] = [
  { value: "businesses", label: "Businesses" },
  { value: "cars", label: "Cars" },
  { value: "parts", label: "Spare Parts" },
  { value: "services", label: "Garage Services" },
  { value: "support-services", label: "Support Services" },
];

const ADMIN_BUSINESS_IMPORT_CATEGORIES = [
  { value: "car_dealer", label: "Automobile Dealers" },
  { value: "spare_parts", label: "Autospares Dealers" },
  { value: "garage", label: "Autogarage Repair" },
  { value: "automotive_support", label: "Automotive Support" },
] as const;
type AdminBusinessImportCategory = typeof ADMIN_BUSINESS_IMPORT_CATEGORIES[number]["value"];

function getCategoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function formatDate(d: any) {
  if (!d) return "â";
  return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function addMonths(date: Date, months: number) {
  const target = new Date(date);
  const dayOfMonth = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(dayOfMonth, lastDayOfMonth));
  return target;
}

function BusinessCard({
  biz,
  actions,
  defaultExpanded = false,
  onEdit,
}: {
  biz: EnrichedBusiness;
  actions: React.ReactNode;
  defaultExpanded?: boolean;
  onEdit?: (biz: EnrichedBusiness) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card data-testid={`biz-card-${biz.id}`} className="overflow-hidden">
      <CardContent className="pt-4 pb-4 px-4">
        {/* Header row */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {biz.logo
              ? <img src={biz.logo} alt={biz.name} className="w-full h-full object-cover" />
              : <Building2 className="w-6 h-6 text-gray-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{biz.name}</h3>
              <Badge variant="secondary" className="text-xs">{getCategoryLabel(biz.category)}</Badge>
              {biz.status === "pending" && (
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">Pending</Badge>
              )}
              {biz.status === "approved" && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">Approved</Badge>
              )}
              {biz.status === "rejected" && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Rejected</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{biz.city}</span>
              {biz.reviewCount > 0
                ? <span className="flex items-center gap-1"><Star className="w-3 h-3 text-orange-400 fill-orange-400" />{biz.avgRating.toFixed(1)} ({biz.reviewCount} reviews)</span>
                : <span className="text-gray-400">No reviews yet</span>
              }
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(biz.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(biz)} data-testid={`button-edit-biz-${biz.id}`}>Edit profile</Button>
            )}
            {actions}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(v => !v)}
              data-testid={`button-expand-${biz.id}`}
              className="text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="ml-1 text-xs">{expanded ? "Less" : "Details"}</span>
            </Button>
          </div>
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact info */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</p>
                {biz.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span data-testid={`text-phone-${biz.id}`}>{biz.phone}</span>
                  </div>
                )}
                {biz.whatsapp && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <MessageCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span data-testid={`text-whatsapp-${biz.id}`}>{biz.whatsapp}</span>
                  </div>
                )}
                {biz.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span data-testid={`text-address-${biz.id}`}>{biz.address}, {biz.city}</span>
                  </div>
                )}
              </div>

              {/* Owner info */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registered By</p>
                {biz.ownerName ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span data-testid={`text-owner-name-${biz.id}`}>{biz.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span data-testid={`text-owner-email-${biz.id}`}>{biz.ownerEmail}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No owner on record</p>
                )}

                <div className="pt-1">
                  <Button asChild size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800">
                    <Link href={`/business/${biz.id}`} data-testid={`link-view-profile-${biz.id}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      View Public Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Description */}
            {biz.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-md p-3" data-testid={`text-description-${biz.id}`}>
                  {biz.description}
                </p>
              </div>
            )}

            {/* Website / Social */}
            {biz.website && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Online Presence</p>
                <div className="flex flex-wrap gap-2">
                  {biz.website && (
                    <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 underline" data-testid={`link-website-${biz.id}`}>
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [premiumExpiryWindow, setPremiumExpiryWindow] = useState<"all" | "1" | "3" | "6" | "12">("all");

  if (!user || user.role !== "admin") {
    navigate("/login");
    return null;
  }

  const { data, isLoading } = useQuery<AdminData>({
    queryKey: ["/api/admin"],
  });

  const { data: reports } = useQuery<(BusinessReport & { businessName: string })[]>({
    queryKey: ["/api/admin/reports"],
  });

  const { data: importBusinesses = [] } = useQuery<AdminImportBusiness[]>({
    queryKey: ["/api/admin/import/businesses"],
  });

  const { data: featuredItems, isLoading: featuredItemsLoading } = useQuery<FeaturedItem[]>({
    queryKey: ["/api/admin/featured"],
  });
  const { data: featureRequests = [] } = useQuery<AdminFeatureRequest[]>({
    queryKey: ["/api/admin/feature-requests"],
  });

  const { data: revenue } = useQuery<{
    stats: {
      totalRevenue: number;
      currentMrr: number;
      activeSubscriptions: number;
      expiredSubscriptions: number;
      expiringSoon: number;
      premiumAmount: number;
      premiumDays: number;
    };
    activeSubscriptions: Array<{
      id: string; name: string; category: string; city: string; logo: string | null;
      premiumExpiresAt: string; activatedAt: string; amount: number; daysLeft: number;
    }>;
    expiredSubscriptions: Array<{
      id: string; name: string; category: string; city: string; logo: string | null;
      premiumExpiresAt: string | null; amount: number;
    }>;
  }>({
    queryKey: ["/api/admin/revenue"],
  });
  const visiblePremiumSubscriptions = revenue?.activeSubscriptions.filter(subscription => {
    if (premiumExpiryWindow === "all") return true;
    const now = new Date();
    const expiresAt = new Date(subscription.premiumExpiresAt);
    return expiresAt > now && expiresAt <= addMonths(now, Number(premiumExpiryWindow));
  }) ?? [];

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/businesses/${id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Business approved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/businesses/${id}/reject`);
    },
    onSuccess: () => {
      toast({ title: "Business rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBizMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/businesses/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Business deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Review deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePremiumMutation = useMutation({
    mutationFn: async ({ businessId, activate }: { businessId: string; activate: boolean }) => {
      const endpoint = activate ? "/api/mpesa/manual-activate" : "/api/mpesa/manual-deactivate";
      await apiRequest("POST", endpoint, { businessId });
    },
    onSuccess: (_, { activate }) => {
      toast({ title: activate ? "Premium activated!" : "Premium deactivated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ item, featured }: { item: FeaturedItem; featured: boolean }) => {
      await apiRequest("PUT", `/api/admin/featured/${item.type}/${item.id}`, { featured });
    },
    onSuccess: (_, { item, featured }) => {
      toast({ title: featured ? "Featured status enabled." : "Featured status removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      if (item.type === "business") {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === "string" && key.startsWith("/api/businesses?");
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/featured-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/popular"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support-services"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reviewFeatureRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      await apiRequest("PUT", `/api/admin/feature-requests/${id}`, { status });
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "approved" ? "Feature request approved." : "Feature request rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/businesses"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/featured-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support-services"] });
    },
    onError: (e: Error) => toast({ title: "Feature request update failed", description: e.message, variant: "destructive" }),
  });

  const manageCatalogMutation = useMutation({
    mutationFn: async ({ item, action, fields }: { item: FeaturedItem; action: "delete" | "suspension" | "edit"; fields?: Record<string, unknown> }) => {
      if (action === "delete") await apiRequest("DELETE", `/api/admin/catalog/${item.type}/${item.id}`);
      else if (action === "suspension") await apiRequest("PUT", `/api/admin/catalog/${item.type}/${item.id}/suspension`, fields);
      else await apiRequest("PUT", `/api/admin/catalog/${item.type}/${item.id}`, fields);
    },
    onSuccess: () => {
      toast({ title: "Catalog item updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/featured-offers"] });
    },
    onError: (e: Error) => toast({ title: "Catalog update failed", description: e.message, variant: "destructive" }),
  });

  const suspendBusinessMutation = useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      await apiRequest("PUT", `/api/admin/businesses/${id}/suspension`, { suspended });
    },
    onSuccess: () => {
      toast({ title: "Business status updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/home-sections?limit=6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses/premium"] });
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/businesses"),
      });
    },
    onError: (e: Error) => toast({ title: "Business update failed", description: e.message, variant: "destructive" }),
  });

  const editCatalogItem = (item: FeaturedItem) => {
    const nameKey = item.type === "car" ? "title" : item.type === "part" ? "partName" : "name";
    const name = window.prompt("Item name", item.name);
    if (name === null) return;
    const description = window.prompt("Description", item.description || "");
    if (description === null) return;
    const priceKey = item.type === "support_service" ? "startingPrice" : "price";
    const price = window.prompt("Price (leave blank if not applicable)", item.price || "");
    if (price === null) return;
    manageCatalogMutation.mutate({ item, action: "edit", fields: { [nameKey]: name, description, [priceKey]: price } });
  };

  // ââ Import / Export ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDragging, setImportDragging] = useState(false);
  const [importResult, setImportResult] = useState<AdminImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importType, setImportType] = useState<AdminImportType>("businesses");
  const [importBusinessCategory, setImportBusinessCategory] = useState<AdminBusinessImportCategory | "">("");
  const [importBusinessId, setImportBusinessId] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<EnrichedBusiness | null>(null);
  const [businessEditForm, setBusinessEditForm] = useState<AdminBusinessEditForm | null>(null);

  const saveBusinessProfileMutation = useMutation({
    mutationFn: async ({ businessId, form }: { businessId: string; form: AdminBusinessEditForm }) => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(), description: form.description.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim(),
        address: form.address.trim(), city: form.city.trim(), subcategory: form.subcategory.trim() || null,
        website: form.website.trim() || null, logo: form.logo.trim() || null, banner: form.banner.trim() || null,
        latitude: form.latitude.trim() || null, longitude: form.longitude.trim() || null,
        carBrands: form.carBrands.split(/[|,]/).map(brand => brand.trim()).filter(Boolean),
      };
      if ((payload.carBrands as string[]).length === 0) payload.carBrands = null;
      if (form.ownerId) payload.ownerId = form.ownerId;
      const response = await apiRequest("PUT", `/api/admin/businesses/${businessId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Business profile updated." });
      setEditingBusiness(null);
      setBusinessEditForm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function downloadExport(path: string, filename: string) {
    try {
      const token = getAuthToken();
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  }

  async function downloadTemplate() {
    try {
      let csv: Blob;
      if (importType === "businesses") {
        csv = new Blob(["name,phone,whatsapp,address,city,description,subcategory,carBrands,website,logo,banner,latitude,longitude\nExample Motors,+254700000000,+254700000000,123 Example Road,Nairobi,A great dealership,,Toyota|Honda,,,,,\n"], { type: "text/csv" });
      } else {
        const token = getAuthToken();
        const res = await fetch("/api/import/template/" + importType, {
          headers: token ? { Authorization: "Bearer " + token } : {},
        });
        if (!res.ok) throw new Error("Template download failed");
        csv = await res.blob();
      }
      const url = URL.createObjectURL(csv);
      const a = document.createElement("a");
      a.href = url;
      a.download = importType + "-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Template download failed", description: e.message, variant: "destructive" });
    }
  }

  function stageImportFile(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    setImportFile(file);
    setImportResult(null);
  }

  async function handleImportFile(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    if (importType === "businesses" && !importBusinessCategory) {
      toast({ title: "Choose a category", description: "Select a business category before importing.", variant: "destructive" });
      return;
    }
    if (importType !== "businesses" && !importBusinessId) {
      toast({ title: "Choose a business", description: "Select an approved business before importing listings.", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const token = getAuthToken();
      if (!token) {
        logout();
        navigate("/login");
        throw new Error("Your session has expired. Please sign in again.");
      }
      const formData = new FormData();
      formData.append("file", file);
      if (importType === "businesses") formData.append("category", importBusinessCategory);
      else formData.append("businessId", importBusinessId);
      const importPath = importType === "businesses" ? "/api/admin/import/businesses" : "/api/import/" + importType;
      const res = await fetch(importPath, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Your session has expired. Please sign in again.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      setImportResult(data);
      if (data.imported > 0 || data.skipped > 0 || data.failed > 0) {
        const prefixesByType: Record<AdminImportType, string[]> = {
          businesses: ["/api/admin", "/api/businesses"],
          cars: ["/api/cars", "/api/businesses"],
          parts: ["/api/parts", "/api/spare-parts", "/api/businesses", "/api/home/featured-offers"],
          services: ["/api/services", "/api/businesses", "/api/home/featured-offers"],
          "support-services": ["/api/support-services", "/api/support-service", "/api/businesses", "/api/home/featured-offers"],
        };
        const prefixes = prefixesByType[importType];
        queryClient.invalidateQueries({
          predicate: query => {
            const key = query.queryKey[0];
            return typeof key === "string" && prefixes.some(prefix =>
              key === prefix || key.startsWith(prefix + "/") || key.startsWith(prefix + "?")
            );
          },
        });
      }
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  const {
    stats,
    pending,
    approved,
    rejected,
    reviews,
    users,
  } = data || {
    stats: { total: 0, pending: 0, approved: 0, rejected: 0, totalReviews: 0 },
    pending: [],
    approved: [],
    rejected: [],
    reviews: [],
    users: [],
  };

  const importConfig = ADMIN_IMPORT_CONFIG[importType];
  const importBusinessCategories = ADMIN_IMPORT_BUSINESS_CATEGORIES[importType];
  const importBusinessOptions = importBusinessCategories
    ? importBusinesses.filter(biz => importBusinessCategories.includes(biz.category))
    : [];
  const linkedOwnerIds = new Set([...pending, ...approved, ...rejected].filter(biz => biz.id !== editingBusiness?.id).map(biz => biz.ownerId));
  const availableOwnerAccounts = users.filter(account => account.role === "owner" && !linkedOwnerIds.has(account.id));

  function startBusinessEdit(biz: EnrichedBusiness) {
    setEditingBusiness(biz);
    setBusinessEditForm({
      name: biz.name || "", description: biz.description || "", phone: biz.phone || "", whatsapp: biz.whatsapp || "",
      address: biz.address || "", city: biz.city || "", subcategory: biz.subcategory || "", website: biz.website || "",
      logo: biz.logo || "", banner: biz.banner || "", latitude: String(biz.latitude ?? ""), longitude: String(biz.longitude ?? ""),
      carBrands: (biz.carBrands || []).join(" | "), ownerId: "",
    });
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage businesses, reviews and users</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-total">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-pending">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-approved">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-rejected">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-reviews">{stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="pending" data-testid="admin-tab-pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="admin-tab-approved">
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="featured" data-testid="admin-tab-featured">
              Featured {featureRequests.length > 0 && <Badge className="ml-1 bg-red-600 text-white">{featureRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="admin-tab-rejected">
              Rejected ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="admin-tab-reviews">
              Reviews ({stats.totalReviews})
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users">
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="admin-tab-reports">
              Reports {reports && reports.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{reports.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="revenue" data-testid="admin-tab-revenue">
              Revenue
            </TabsTrigger>
            <TabsTrigger value="data" data-testid="admin-tab-data">
              Import / Export
            </TabsTrigger>
          </TabsList>

          {/* Pending */}
          <TabsContent value="pending">
            {pending.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No businesses pending approval</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(biz => (
                  <BusinessCard
                    key={biz.id}
                    biz={biz}
                    onEdit={startBusinessEdit}
                    defaultExpanded={true}
                    actions={
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveMutation.mutate(biz.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${biz.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200"
                          onClick={() => rejectMutation.mutate(biz.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${biz.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved */}
          <TabsContent value="approved">
            {approved.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No approved businesses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approved.map(biz => (
                  <BusinessCard
                    key={biz.id}
                    biz={biz}
                    onEdit={startBusinessEdit}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant={biz.premium ? "default" : "outline"}
                          className={biz.premium ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"}
                          onClick={() => togglePremiumMutation.mutate({ businessId: biz.id, activate: !biz.premium })}
                          disabled={togglePremiumMutation.isPending}
                          title={biz.premium ? "Remove premium status" : "Grant premium status"}
                          data-testid={`button-toggle-premium-${biz.id}`}
                        >
                          <BadgeCheck className="w-4 h-4 mr-1" />
                          {biz.premium ? "Premium" : "Set Premium"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => suspendBusinessMutation.mutate({ id: biz.id, suspended: !biz.suspended })}
                          disabled={suspendBusinessMutation.isPending}
                          title={biz.suspended ? "Restore business" : "Suspend business"}
                        >
                          {biz.suspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          <span className="ml-1">{biz.suspended ? "Resume" : "Suspend"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteBizMutation.mutate(biz.id)}
                          disabled={deleteBizMutation.isPending}
                          data-testid={`button-delete-biz-${biz.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Featured catalog management â independent of paid Premium status */}
          <TabsContent value="featured">
            {featuredItemsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-7">
                <section className="space-y-3" data-testid="admin-feature-requests">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Feature requests</h2>
                    <Badge variant="secondary">{featureRequests.length} pending</Badge>
                  </div>
                  {featureRequests.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No feature requests awaiting review.</p>
                  ) : (
                    <div className="space-y-2">
                      {featureRequests.map(request => (
                        <Card key={request.id}>
                          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{request.itemName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {request.ownerName || request.ownerEmail || "Business owner"} · {request.itemType.replace(/_/g, " ")} · {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewFeatureRequestMutation.mutate({ id: request.id, status: "rejected" })}
                                disabled={reviewFeatureRequestMutation.isPending}
                              >
                                <XCircle className="mr-1 h-4 w-4" />Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => reviewFeatureRequestMutation.mutate({ id: request.id, status: "approved" })}
                                disabled={reviewFeatureRequestMutation.isPending}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />Approve
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
                <p className="text-sm text-muted-foreground">
                  Only approved businesses with a ready public profile can be featured. Featured status does not change paid Premium status.
                </p>
                {FEATURED_ITEM_GROUPS.map(({ type, title }) => {
                  const groupItems = (featuredItems || []).filter((item) => item.type === type);
                  return (
                    <section key={type} className="space-y-3" data-testid={`admin-featured-group-${type}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
                        <Badge variant="secondary">{groupItems.length}</Badge>
                      </div>
                      {groupItems.length === 0 ? (
                        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          {type === "business" ? "No approved businesses yet." : "No eligible items in this group."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {groupItems.map((item) => (
                            <Card key={`${item.type}-${item.id}`}>
                              <CardContent className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    {item.suspended && <Badge variant="destructive">Suspended</Badge>}
                                  </div>
                                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={`${FEATURED_ITEM_ROUTES[item.type]}/${item.id}`} data-testid={`button-view-featured-${item.type}-${item.id}`}>
                                      View
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={item.featured ? "default" : "outline"}
                                    className={item.featured ? "bg-amber-500 text-white hover:bg-amber-600" : ""}
                                    onClick={() => toggleFeaturedMutation.mutate({ item, featured: !item.featured })}
                                    disabled={toggleFeaturedMutation.isPending || (item.suspended && !item.featured)}
                                    aria-pressed={item.featured}
                                    data-testid={`button-toggle-featured-${item.type}-${item.id}`}
                                  >
                                    <Star className={`mr-1 h-4 w-4 ${item.featured ? "fill-current" : ""}`} />
                                    {item.featured ? "Featured" : "Set featured"}
                                  </Button>
                                  {item.type !== "business" && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => editCatalogItem(item)} disabled={manageCatalogMutation.isPending} title="Edit item">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => manageCatalogMutation.mutate({ item, action: "suspension", fields: { suspended: !item.suspended } })}
                                        disabled={manageCatalogMutation.isPending}
                                      >
                                        {item.suspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600"
                                        onClick={() => {
                                          if (window.confirm(`Delete ${item.name}? This cannot be undone.`)) {
                                            manageCatalogMutation.mutate({ item, action: "delete" });
                                          }
                                        }}
                                        disabled={manageCatalogMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Rejected */}
          <TabsContent value="rejected">
            {rejected.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <XCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No rejected businesses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rejected.map(biz => (
                  <BusinessCard
                    key={biz.id}
                    biz={biz}
                    onEdit={startBusinessEdit}
                    actions={
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveMutation.mutate(biz.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-reapprove-${biz.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteBizMutation.mutate(biz.id)}
                          disabled={deleteBizMutation.isPending}
                          data-testid={`button-delete-rejected-${biz.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <Card key={r.id} data-testid={`admin-review-${r.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p>
                              <span className="text-xs text-muted-foreground">on <span className="font-medium text-gray-700 dark:text-gray-300">{r.businessName}</span></span>
                            </div>
                            <StarRating rating={r.rating} size="sm" />
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(r.createdAt)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => deleteReviewMutation.mutate(r.id)}
                          disabled={deleteReviewMutation.isPending}
                          data-testid={`button-delete-review-${r.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No users yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <Card key={u.id} data-testid={`admin-user-${u.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
                          {u.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            {!reports || reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No reports submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => {
                  const reasonLabel = REPORT_REASONS.find(x => x.value === r.reason)?.label || r.reason;
                  return (
                    <Card key={r.id} data-testid={`admin-report-${r.id}`} className="border-red-100 dark:border-red-900/30">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{r.businessName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Reported by <span className="font-medium">{r.name}</span> ({r.email})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">{reasonLabel}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                        {r.description && (
                          <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-md p-2">{r.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue">
            {!revenue ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Loading revenue data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Revenue stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="revenue-total">
                            KSh {revenue.stats.totalRevenue.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="revenue-mrr">
                            KSh {revenue.stats.currentMrr.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Current MRR</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <BadgeCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="revenue-active-subs">
                            {revenue.stats.activeSubscriptions}
                          </p>
                          <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="revenue-expired-subs">
                            {revenue.stats.expiredSubscriptions}
                          </p>
                          <p className="text-xs text-muted-foreground">Expired</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expiring soon alert */}
                {revenue.stats.expiringSoon > 0 && (
                  <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <p className="text-sm text-orange-800 dark:text-orange-300">
                        <span className="font-semibold">{revenue.stats.expiringSoon} subscription{revenue.stats.expiringSoon > 1 ? "s" : ""}</span> expiring within 7 days â consider reaching out for renewal.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Active subscriptions table */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-yellow-500" />
                        Active Premium Subscriptions
                      </CardTitle>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Expires within</span>
                        <select
                          value={premiumExpiryWindow}
                          onChange={event => setPremiumExpiryWindow(event.target.value as typeof premiumExpiryWindow)}
                          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          data-testid="select-premium-expiry-window"
                        >
                          <option value="all">All active</option>
                          <option value="1">1 month</option>
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                        </select>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visiblePremiumSubscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {premiumExpiryWindow === "all"
                          ? "No active premium subscriptions"
                          : `No active premium subscriptions expiring within ${premiumExpiryWindow} ${premiumExpiryWindow === "1" ? "month" : "months"}`}
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visiblePremiumSubscriptions.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 py-3" data-testid={`revenue-row-${sub.id}`}>
                            <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {sub.logo
                                ? <img src={sub.logo} alt={sub.name} className="w-full h-full object-cover" />
                                : <Building2 className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{sub.name}</p>
                                <BadgeCheck className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                              </div>
                              <p className="text-xs text-muted-foreground">{getCategoryLabel(sub.category)} Â· {sub.city}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">KSh {sub.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {sub.daysLeft <= 7
                                  ? <span className="text-orange-500 font-medium">{sub.daysLeft}d left</span>
                                  : <span>{sub.daysLeft}d left</span>}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                              <p>Activated {formatDate(sub.activatedAt)}</p>
                              <p>Expires {formatDate(sub.premiumExpiresAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Expired subscriptions */}
                {revenue.expiredSubscriptions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Expired Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {revenue.expiredSubscriptions.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 py-3 opacity-60">
                            <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {sub.logo
                                ? <img src={sub.logo} alt={sub.name} className="w-full h-full object-cover" />
                                : <Building2 className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{sub.name}</p>
                              <p className="text-xs text-muted-foreground">{getCategoryLabel(sub.category)} Â· {sub.city}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium text-gray-500 line-through">KSh {sub.amount.toLocaleString()}</p>
                              {sub.premiumExpiresAt && (
                                <p className="text-xs text-red-500">Expired {formatDate(sub.premiumExpiresAt)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Subscription rate info */}
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground text-center">
                      Premium subscription rate: <span className="font-semibold text-gray-700 dark:text-gray-300">KSh {revenue.stats.premiumAmount.toLocaleString()}</span> per {revenue.stats.premiumDays} days.
                      Projected annual revenue at current subscriptions: <span className="font-semibold text-green-600 dark:text-green-400">KSh {Math.round(revenue.stats.currentMrr * (365 / revenue.stats.premiumDays)).toLocaleString()}</span>.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Import / Export */}
          <TabsContent value="data" className="space-y-6">
            {/* Export section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4 text-green-600" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Download platform data as CSV files for analysis or backup.</p>

                {/* Businesses exports */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Businesses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "approved", "pending", "rejected"] as const).map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => downloadExport(
                          `/api/admin/export/businesses${status !== "all" ? `?status=${status}` : ""}`,
                          `businesses-${status}.csv`
                        )}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Users export */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Users
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => downloadExport("/api/admin/export/users", "users.csv")}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    All Users
                  </Button>
                </div>

                {/* Reviews export */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                    <Star className="w-4 h-4" /> Reviews
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => downloadExport("/api/admin/export/reviews", "reviews.csv")}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    All Reviews
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Import Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the data type first. The matching template and import handler will be used; listing imports must be assigned to an approved business.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="admin-import-type" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">What type of data are you importing?</label>
                    <select
                      id="admin-import-type"
                      value={importType}
                      disabled={importLoading}
                      onChange={e => {
                        const nextType = e.target.value as AdminImportType;
                        setImportType(nextType);
                        setImportBusinessCategory("");
                        setImportBusinessId("");
                        setImportFile(null);
                        setImportResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                      data-testid="admin-import-type"
                    >
                      {ADMIN_IMPORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>

                  {importType === "businesses" ? (
                    <div>
                      <label htmlFor="admin-import-business-category" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Business category for this import</label>
                      <select
                        id="admin-import-business-category"
                        value={importBusinessCategory}
                        disabled={importLoading}
                        onChange={e => { setImportBusinessCategory(e.target.value as AdminBusinessImportCategory | ""); setImportResult(null); }}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                        data-testid="admin-import-business-category"
                      >
                        <option value="">Select a categoryâ¦</option>
                        {ADMIN_BUSINESS_IMPORT_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">The selected category will be applied to every business in the CSV.</p>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="admin-import-business" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Assign listings to an approved business</label>
                      <select
                        id="admin-import-business"
                        value={importBusinessId}
                        disabled={importLoading}
                        onChange={e => { setImportBusinessId(e.target.value); setImportResult(null); }}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                        data-testid="admin-import-business"
                      >
                        <option value="">Select a businessâ¦</option>
                        {importBusinessOptions.map(biz => <option key={biz.id} value={biz.id}>{biz.name} â {biz.city}</option>)}
                      </select>
                      {importBusinessOptions.length === 0 && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">No approved business matches this data type.</p>}
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3 flex-wrap rounded-md border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 mt-0.5" />
                    <span>{importConfig.description}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={downloadTemplate} disabled={importLoading}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download {importConfig.label} Template
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Required CSV columns:</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">{importConfig.requiredColumns.join(", ")}</p>
                  {importConfig.optionalColumns.length > 0 && (
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Optional: <span className="font-mono">{importConfig.optionalColumns.join(", ")}</span></p>
                  )}
                  {importType === "businesses" && <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">The selected category applies to every row; any category column in the CSV is ignored. Missing optional values stay blank; use Edit profile to add them or assign an existing owner account.</p>}
                  {importType !== "businesses" && <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">The selected business determines where these listings appear. Check the type and business before importing.</p>}
                </div>

                {/* Drop zone â stage the file first, then confirm the selected import type below. */}
                <div
                  className={"border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer " + (importDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900")}
                  onClick={() => !importLoading && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setImportDragging(true); }}
                  onDragLeave={() => setImportDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setImportDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) stageImportFile(file);
                  }}
                >
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  {importLoading ? (
                    <p className="text-sm text-muted-foreground">Importingâ¦</p>
                  ) : importFile ? (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(importFile.size / 1024).toFixed(1)} KB Â· click to change file</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop CSV file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV files only Â· Max 5 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={importLoading}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) stageImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => { if (importFile) handleImportFile(importFile); }}
                    disabled={!importFile || importLoading || (importType === "businesses" ? !importBusinessCategory : (!importBusinessId || importBusinessOptions.length === 0))}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="admin-import-submit"
                  >
                    {importLoading ? "Importingâ¦" : "Import " + importConfig.label}
                  </Button>
                </div>

                {/* Result */}
                {importResult && (
                  <div className={"rounded-lg border p-4 " + (importResult.failed === 0 ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20")}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.failed === 0
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <AlertCircle className="w-4 h-4 text-orange-500" />}
                      <p className="text-sm font-semibold">
                        {importType === "businesses" ? (
                          <>
                            {importResult.imported} business{importResult.imported === 1 ? "" : "es"} imported, {importResult.skipped ?? 0} already existed
                            {importResult.failed > 0 && ", " + importResult.failed + " failed"}
                          </>
                        ) : (
                          <>
                            {importResult.imported} imported
                            {(importResult.skipped ?? 0) > 0 && ", " + importResult.skipped + " skipped (duplicates)"}
                            {importResult.failed > 0 && ", " + importResult.failed + " failed"}
                          </>
                        )}
                      </p>
                    </div>
                    {importResult.errors.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="text-xs text-orange-700 dark:text-orange-300">{err}</li>
                        ))}
                        {importResult.errors.length > 10 && <li className="text-xs text-muted-foreground">â¦and {importResult.errors.length - 10} more errors</li>}
                      </ul>
                    )}
                    {importType === "businesses" && (importResult.created?.length ?? 0) > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Open the new business profiles:</p>
                        {importResult.created!.slice(0, 20).map(profile => (
                          <div key={profile.id}>
                            <Link href={`/business/${profile.id}`} className="text-xs text-blue-700 dark:text-blue-300 underline">
                              {profile.name}{profile.city ? ` — ${profile.city}` : ""} <ExternalLink className="inline w-3 h-3" />
                            </Link>
                          </div>
                        ))}
                        {importResult.created!.length > 20 && <p className="text-xs text-muted-foreground">And {importResult.created!.length - 20} more profiles are available in the Businesses dashboard.</p>}
                      </div>
                    )}
                    {importResult.imported > 0 && (
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={() => { setImportFile(null); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Import Another</Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={!!editingBusiness} onOpenChange={open => { if (!open) { setEditingBusiness(null); setBusinessEditForm(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Complete business profile</DialogTitle></DialogHeader>
            {businessEditForm && editingBusiness && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { label: "Business name", field: "name" }, { label: "Phone", field: "phone" },
                    { label: "WhatsApp", field: "whatsapp" }, { label: "Address", field: "address" },
                    { label: "City", field: "city" }, { label: "Subcategory", field: "subcategory" },
                    { label: "Website", field: "website" }, { label: "Logo URL", field: "logo" },
                    { label: "Banner URL", field: "banner" }, { label: "Latitude", field: "latitude" },
                    { label: "Longitude", field: "longitude" },
                  ] as const).map(({ label, field }) => (
                    <label key={field} className="space-y-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      <Input type={field === "latitude" || field === "longitude" ? "number" : "text"} step={field === "latitude" || field === "longitude" ? "any" : undefined} value={businessEditForm[field]} onChange={event => setBusinessEditForm(form => form ? { ...form, [field]: event.target.value } : form)} />
                    </label>
                  ))}
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</span>
                    <Textarea rows={3} value={businessEditForm.description} onChange={event => setBusinessEditForm(form => form ? { ...form, description: event.target.value } : form)} />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Car brands (separate with |)</span>
                    <Input value={businessEditForm.carBrands} onChange={event => setBusinessEditForm(form => form ? { ...form, carBrands: event.target.value } : form)} />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Assign to an existing business-owner account</span>
                    <select value={businessEditForm.ownerId} onChange={event => setBusinessEditForm(form => form ? { ...form, ownerId: event.target.value } : form)} className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
                      <option value="">Keep current account ({editingBusiness.ownerName || "admin-managed"})</option>
                      {availableOwnerAccounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.email})</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">Only owner accounts that do not already manage another business are available.</p>
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setEditingBusiness(null); setBusinessEditForm(null); }}>Cancel</Button>
                  <Button onClick={() => businessEditForm && editingBusiness && saveBusinessProfileMutation.mutate({ businessId: editingBusiness.id, form: businessEditForm })} disabled={saveBusinessProfileMutation.isPending || !businessEditForm.name.trim() || !businessEditForm.phone.trim()} className="bg-red-600 text-white">{saveBusinessProfileMutation.isPending ? "Saving..." : "Save profile"}</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
