import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Shield, Building2, CheckCircle, XCircle, Trash2, Users, Star, Clock, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Business, Review, User, BusinessReport } from "@shared/schema";
import { BUSINESS_CATEGORIES, REPORT_REASONS } from "@shared/schema";

interface AdminData {
  stats: { total: number; pending: number; approved: number; totalReviews: number };
  pending: Business[];
  approved: Business[];
  reviews: (Review & { businessName: string })[];
  users: User[];
}

function getCategoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find(c => c.value === cat)?.label || cat;
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  const { stats, pending, approved, reviews, users } = data || { stats: { total: 0, pending: 0, approved: 0, totalReviews: 0 }, pending: [], approved: [], reviews: [], users: [] };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-10">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="admin-stat-total">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Businesses</p>
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
                <p className="text-xs text-muted-foreground">Pending Review</p>
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
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="pending" data-testid="admin-tab-pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="admin-tab-approved">
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="admin-tab-reviews">
              Reviews ({stats.totalReviews})
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users">
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="admin-tab-reports">
              Reports {reports && reports.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{reports.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Pending businesses */}
          <TabsContent value="pending">
            {pending.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No businesses pending approval</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map(biz => (
                  <Card key={biz.id} data-testid={`pending-biz-${biz.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-12 h-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {biz.logo ? <img src={biz.logo} alt={biz.name} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{biz.name}</h3>
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">Pending</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{getCategoryLabel(biz.category)} • {biz.city}</p>
                          <p className="text-sm text-muted-foreground mt-1">{biz.phone} | {biz.whatsapp}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 line-clamp-2">{biz.description}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white"
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved businesses */}
          <TabsContent value="approved">
            {approved.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No approved businesses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approved.map(biz => (
                  <Card key={biz.id} data-testid={`approved-biz-${biz.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {biz.logo ? <img src={biz.logo} alt={biz.name} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{biz.name}</h3>
                          <p className="text-xs text-muted-foreground">{getCategoryLabel(biz.category)} • {biz.city}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => deleteBizMutation.mutate(biz.id)}
                          disabled={deleteBizMutation.isPending}
                          data-testid={`button-delete-biz-${biz.id}`}
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p>
                              <span className="text-xs text-muted-foreground">on {r.businessName}</span>
                            </div>
                            <StarRating rating={r.rating} size="sm" />
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt!).toLocaleDateString()}</p>
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
                            <span className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-KE") : ""}</span>
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
        </Tabs>
      </div>
    </div>
  );
}
