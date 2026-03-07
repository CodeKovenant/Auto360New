import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, MessageSquare, Star, Plus, Edit, Package, CheckCircle, Clock, XCircle } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Business, Message, Review, SparePart } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

interface DashboardData {
  business: Business;
  messages: Message[];
  reviews: Review[];
  spareParts: SparePart[];
}

const PART_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user || user.role !== "owner") {
    navigate("/login");
    return null;
  }

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Business>>({});

  const [newPart, setNewPart] = useState({ partName: "", carBrand: "", carModel: "", year: "", condition: "new", price: "", description: "" });
  const [showAddPart, setShowAddPart] = useState(false);

  function startEdit() {
    if (data?.business) {
      setEditForm({ ...data.business });
      setEditMode(true);
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/businesses/me", editForm);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Business updated!" });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/parts", { ...newPart, businessId: data?.business.id });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Part added!" });
      setNewPart({ partName: "", carBrand: "", carModel: "", year: "", condition: "new", price: "", description: "" });
      setShowAddPart(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/parts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Part removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  if (!data?.business) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Business Listed</h2>
        <p className="text-muted-foreground mb-5">You haven't registered a business yet.</p>
        <Button onClick={() => navigate("/register-business")} className="bg-blue-600 text-white">Register Your Business</Button>
      </div>
    );
  }

  const { business, messages, reviews, spareParts } = data;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="dashboard-business-name">{business.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {statusBadge(business.status)}
              <span className="text-sm text-muted-foreground">
                {BUSINESS_CATEGORIES.find(c => c.value === business.category)?.label}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={startEdit} data-testid="button-edit-business">
            <Edit className="w-4 h-4 mr-1.5" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-messages">{messages.length}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-reviews">{reviews.length}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-parts">{spareParts.length}</p>
                <p className="text-xs text-muted-foreground">Parts Listed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        {editMode && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Edit Business Profile</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Business Name</Label>
                  <Input value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="mt-1" data-testid="input-edit-name" />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={editForm.city || ""} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editForm.phone || ""} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp</Label>
                  <Input value={editForm.whatsapp || ""} onChange={e => setEditForm(p => ({ ...p, whatsapp: e.target.value }))} className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input value={editForm.address || ""} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={3} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Logo URL</Label>
                  <Input value={editForm.logo || ""} onChange={e => setEditForm(p => ({ ...p, logo: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-blue-600 text-white" data-testid="button-save-edit">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="messages">
          <TabsList className="mb-4">
            <TabsTrigger value="messages" data-testid="tab-messages">Messages ({messages.length})</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews ({reviews.length})</TabsTrigger>
            {business.category === "spare_parts" && (
              <TabsTrigger value="parts" data-testid="tab-parts">Spare Parts ({spareParts.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="messages">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No messages yet</p>
              </div>
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

          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No reviews yet</p>
              </div>
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

          {business.category === "spare_parts" && (
            <TabsContent value="parts">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowAddPart(!showAddPart)} className="bg-orange-500 text-white" data-testid="button-add-part">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Part
                </Button>
              </div>

              {showAddPart && (
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-sm">Add Spare Part</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Part Name <span className="text-red-500">*</span></Label>
                        <Input value={newPart.partName} onChange={e => setNewPart(p => ({ ...p, partName: e.target.value }))} placeholder="Brake Pads" className="mt-1" data-testid="input-part-name" />
                      </div>
                      <div>
                        <Label className="text-xs">Car Brand <span className="text-red-500">*</span></Label>
                        <Input value={newPart.carBrand} onChange={e => setNewPart(p => ({ ...p, carBrand: e.target.value }))} placeholder="Toyota" className="mt-1" data-testid="input-part-brand" />
                      </div>
                      <div>
                        <Label className="text-xs">Car Model <span className="text-red-500">*</span></Label>
                        <Input value={newPart.carModel} onChange={e => setNewPart(p => ({ ...p, carModel: e.target.value }))} placeholder="Corolla" className="mt-1" data-testid="input-part-model" />
                      </div>
                      <div>
                        <Label className="text-xs">Year (optional)</Label>
                        <Input value={newPart.year} onChange={e => setNewPart(p => ({ ...p, year: e.target.value }))} placeholder="2020" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Condition <span className="text-red-500">*</span></Label>
                        <Select value={newPart.condition} onValueChange={v => setNewPart(p => ({ ...p, condition: v }))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PART_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Price (optional)</Label>
                        <Input value={newPart.price} onChange={e => setNewPart(p => ({ ...p, price: e.target.value }))} placeholder="KSh 2,500" className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Description (optional)</Label>
                        <Textarea value={newPart.description} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => addPartMutation.mutate()} disabled={addPartMutation.isPending || !newPart.partName || !newPart.carBrand || !newPart.carModel} className="bg-blue-600 text-white" data-testid="button-save-part">
                        {addPartMutation.isPending ? "Adding..." : "Add Part"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddPart(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {spareParts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No spare parts listed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {spareParts.map(part => (
                    <Card key={part.id} data-testid={`dash-part-${part.id}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{part.partName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{part.carBrand} {part.carModel} {part.year && `• ${part.year}`}</p>
                            {part.description && <p className="text-xs text-muted-foreground mt-1">{part.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={part.condition === "new" ? "default" : "secondary"} className="text-xs">
                              {part.condition === "new" ? "New" : "Used"}
                            </Badge>
                            {part.price && <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{part.price}</span>}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 text-xs h-7"
                              onClick={() => deletePartMutation.mutate(part.id)}
                              data-testid={`button-delete-part-${part.id}`}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
