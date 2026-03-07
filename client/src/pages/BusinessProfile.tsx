import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Phone, MessageCircle, Building2, Package, Star, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Business, SparePart, Review } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

interface BusinessData {
  business: Business & { avgRating: number; reviewCount: number };
  reviews: Review[];
  spareParts: SparePart[];
}

export default function BusinessProfile() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [msgName, setMsgName] = useState("");
  const [msgPhone, setMsgPhone] = useState("");
  const [msgText, setMsgText] = useState("");

  const { data, isLoading } = useQuery<BusinessData>({
    queryKey: [`/api/businesses/${params.id}`],
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        businessId: params.id,
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setReviewName(""); setReviewRating(0); setReviewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${params.id}`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const msgMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/messages", {
        businessId: params.id,
        name: msgName,
        phone: msgPhone,
        message: msgText,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: "The business will contact you soon." });
      setMsgName(""); setMsgPhone(""); setMsgText("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Business not found</h2>
        <p className="text-muted-foreground">This business may not exist or has been removed.</p>
      </div>
    );
  }

  const { business, reviews, spareParts } = data;
  const categoryLabel = BUSINESS_CATEGORIES.find(c => c.value === business.category)?.label || business.category;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-md bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-white/70" />
              )}
            </div>
            <div className="flex-1">
              <Badge className="mb-2 bg-white/10 text-white border-white/20">{categoryLabel}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold mb-1" data-testid="business-name">{business.name}</h1>
              <div className="flex items-center gap-1 text-blue-200 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{business.address}, {business.city}</span>
              </div>
              {business.avgRating > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(business.avgRating)} size="md" />
                  <span className="text-sm text-blue-100">
                    {business.avgRating.toFixed(1)} ({business.reviewCount} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="business-description">{business.description}</p>
            </CardContent>
          </Card>

          {/* Spare Parts */}
          {business.category === "spare_parts" && spareParts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <CardTitle className="text-base">Available Spare Parts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spareParts.map(part => (
                    <div key={part.id} className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-testid={`part-${part.id}`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{part.partName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {part.carBrand} {part.carModel} {part.year && `• ${part.year}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={part.condition === "new" ? "default" : "secondary"} className="text-xs">
                            {part.condition === "new" ? "New" : "Used"}
                          </Badge>
                          {part.price && <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{part.price}</span>}
                        </div>
                      </div>
                      {part.description && <p className="text-xs text-muted-foreground mt-1.5">{part.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-400" />
                <CardTitle className="text-base">Customer Reviews ({reviews.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {reviews.map(r => (
                    <div key={r.id} className="pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0" data-testid={`review-${r.id}`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p>
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt!).toLocaleDateString()}</span>
                      </div>
                      <StarRating rating={r.rating} size="sm" />
                      <p className="text-sm text-muted-foreground mt-1.5">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">No reviews yet. Be the first to review!</p>
              )}

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <h4 className="font-medium text-sm mb-3 text-gray-900 dark:text-white">Leave a Review</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Your Name</Label>
                    <Input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="John Doe" className="mt-1" data-testid="input-review-name" />
                  </div>
                  <div>
                    <Label className="text-xs">Rating</Label>
                    <div className="mt-1">
                      <StarRating rating={reviewRating} size="lg" interactive onChange={setReviewRating} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Comment</Label>
                    <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..." className="mt-1" rows={3} data-testid="input-review-comment" />
                  </div>
                  <Button
                    onClick={() => reviewMutation.mutate()}
                    disabled={!reviewName || !reviewRating || !reviewComment || reviewMutation.isPending}
                    className="w-full bg-blue-600 text-white"
                    data-testid="button-submit-review"
                  >
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Contact */}
          <Card>
            <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <a href={`tel:${business.phone}`} className="flex items-center gap-3 p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-testid="link-phone">
                <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{business.phone}</span>
              </a>
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 w-full"
                data-testid="link-whatsapp-profile"
              >
                <div className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Chat on WhatsApp</span>
              </a>
            </CardContent>
          </Card>

          {/* Send Message */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" /> Send Message</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Your Name</Label>
                <Input value={msgName} onChange={e => setMsgName(e.target.value)} placeholder="John Doe" className="mt-1" data-testid="input-msg-name" />
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input value={msgPhone} onChange={e => setMsgPhone(e.target.value)} placeholder="+254..." className="mt-1" data-testid="input-msg-phone" />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="How can we help you?" className="mt-1" rows={3} data-testid="input-msg-text" />
              </div>
              <Button
                onClick={() => msgMutation.mutate()}
                disabled={!msgName || !msgPhone || !msgText || msgMutation.isPending}
                className="w-full"
                data-testid="button-send-message"
              >
                {msgMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
