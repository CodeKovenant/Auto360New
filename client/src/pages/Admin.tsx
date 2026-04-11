import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Shield, Building2, CheckCircle, XCircle, Trash2, Users, Star,
  Clock, Flag, Phone, MessageCircle, MapPin, Mail, User, ExternalLink,
  Calendar, ChevronDown, ChevronUp, BadgeCheck, TrendingUp, DollarSign, AlertCircle,
  Download, Upload, FileText, FileUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  users: UserType[];
}

function getCategoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function BusinessCard({
  biz,
  actions,
  defaultExpanded = false,
}: {
  biz: EnrichedBusiness;
  actions: React.ReactNode;
  defaultExpanded?: boolean;
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
                {biz.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span data-testid={`text-email-${biz.id}`}>{biz.email}</span>
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
                  <Link href={`/business/${biz.id}`}>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800" data-testid={`link-view-profile-${biz.id}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      View Public Profile
                    </Button>
                  </Link>
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
            {(biz.website || biz.facebook || biz.instagram) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Online Presence</p>
                <div className="flex flex-wrap gap-2">
                  {biz.website && (
                    <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 underline" data-testid={`link-website-${biz.id}`}>
                      Website
                    </a>
                  )}
                  {biz.facebook && (
                    <a href={biz.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 underline" data-testid={`link-facebook-${biz.id}`}>
                      Facebook
                    </a>
                  )}
                  {biz.instagram && (
                    <a href={biz.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 underline" data-testid={`link-instagram-${biz.id}`}>
                      Instagram
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
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/businesses/${id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Business approved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
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
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Import / Export ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDragging, setImportDragging] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

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

  function downloadTemplate() {
    const csv = "name,category,phone,whatsapp,address,city,description,subcategory,carBrands\nExample Motors,car_dealer,+254700000000,+254700000000,123 Example Road,Nairobi,A great dealership,,Toyota|Honda\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "businesses-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import/businesses", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      setImportResult(data);
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
        queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
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
                        <span className="font-semibold">{revenue.stats.expiringSoon} subscription{revenue.stats.expiringSoon > 1 ? "s" : ""}</span> expiring within 7 days — consider reaching out for renewal.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Active subscriptions table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-yellow-500" />
                      Active Premium Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenue.activeSubscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No active premium subscriptions</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {revenue.activeSubscriptions.map(sub => (
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
                              <p className="text-xs text-muted-foreground">{getCategoryLabel(sub.category)} · {sub.city}</p>
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
                              <p className="text-xs text-muted-foreground">{getCategoryLabel(sub.category)} · {sub.city}</p>
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
                  Import Businesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Bulk-import business listings from a CSV file. Imported businesses are auto-approved and published immediately.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={downloadTemplate}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Download Template
                  </Button>
                </div>

                {/* Required columns info */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Required CSV columns:</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">name, category, phone, whatsapp, address, city</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Optional: description, subcategory, carBrands (pipe-separated, e.g. <span className="font-mono">Toyota|Honda</span>)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Categories: car_dealer, garage, spare_parts, car_wash, insurance, other
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    importDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setImportDragging(true); }}
                  onDragLeave={() => setImportDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setImportDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleImportFile(file);
                  }}
                >
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  {importLoading ? (
                    <p className="text-sm text-muted-foreground">Importing…</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop CSV file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV files only · Max 5 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Result */}
                {importResult && (
                  <div className={`rounded-lg border p-4 ${importResult.failed === 0 ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.failed === 0
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <AlertCircle className="w-4 h-4 text-orange-500" />}
                      <p className="text-sm font-semibold">
                        {importResult.imported} imported
                        {importResult.failed > 0 && `, ${importResult.failed} failed`}
                      </p>
                    </div>
                    {importResult.errors.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="text-xs text-orange-700 dark:text-orange-300">{err}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li className="text-xs text-muted-foreground">…and {importResult.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
