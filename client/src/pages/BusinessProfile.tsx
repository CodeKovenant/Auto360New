import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  MapPin, Phone, MessageCircle, Building2, Package, Star, Send,
  Car, Wrench, Shield, AlertTriangle, Share2, Flag, Settings,
} from "lucide-react";
import { SiFacebook, SiX, SiInstagram, SiWhatsapp } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StarRating from "@/components/StarRating";
import CarCard from "@/components/CarCard";
import GarageServiceCard from "@/components/GarageServiceCard";
import SupportServiceCard from "@/components/SupportServiceCard";
import BusinessMap from "@/components/BusinessMap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Business, SparePart, Review, Car as CarType, GarageService, SupportService } from "@shared/schema";
import { BUSINESS_CATEGORIES, REPORT_REASONS } from "@shared/schema";

interface BusinessData {
  business: Business & { avgRating: number; reviewCount: number };
  reviews: Review[];
  spareParts: SparePart[];
  supportServices: SupportService[];
}

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string };
type ServiceWithGarage = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string };

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${sz} ${i < rating ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"}`} />
      ))}
    </div>
  );
}

// ── Share Buttons ─────────────────────────────────────────────────────────────
function ShareButtons({ businessName }: { businessName: string }) {
  const profileUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Check out ${businessName} on AutoDirectory Kenya: ${profileUrl}`;

  const shares = [
    {
      label: "Facebook",
      icon: SiFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      label: "X",
      icon: SiX,
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      color: "bg-gray-900 hover:bg-black text-white",
    },
    {
      label: "Instagram",
      icon: SiInstagram,
      href: `https://www.instagram.com/`,
      color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 text-white",
    },
    {
      label: "WhatsApp",
      icon: SiWhatsapp,
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      color: "bg-green-500 hover:bg-green-600 text-white",
    },
  ];

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Share this business</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {shares.map(({ label, icon: Icon, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity ${color}`}
              data-testid={`share-${label.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Safety Tips ───────────────────────────────────────────────────────────────
const SAFETY_TIPS = [
  "Verify the business registration before making any payment.",
  "For high-value transactions, meet in a safe, public location.",
  "Use official channels — WhatsApp, phone, or the contact form on this page.",
  "Do not share sensitive personal or financial information upfront.",
  "Request a receipt or written agreement for any service rendered.",
];

function SafetyTips() {
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Safety Tips</span>
        </div>
        <ul className="space-y-1.5" data-testid="safety-tips">
          {SAFETY_TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 font-bold" style={{ fontSize: "10px" }}>{i + 1}</span>
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Report Business Form ───────────────────────────────────────────────────────
function ReportBusinessForm({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/report", { businessId, name, email, reason, description });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Our team will review this report. Thank you." });
      setName(""); setEmail(""); setReason(""); setDescription("");
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error submitting report", description: e.message, variant: "destructive" }),
  });

  if (!open) {
    return (
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          data-testid="button-open-report"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Report this business
        </button>
      </div>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
          <Flag className="w-4 h-4" />
          Report this Business
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Help us keep the directory safe. Reports are reviewed by our admin team.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Your Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="mt-1" data-testid="input-report-name" />
          </div>
          <div>
            <Label className="text-xs">Your Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" data-testid="input-report-email" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="mt-1" data-testid="select-report-reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="mt-1"
            rows={3}
            data-testid="input-report-description"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !email || !reason || mutation.isPending}
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
            data-testid="button-submit-report"
          >
            {mutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-report">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const isDealer = data?.business.category === "car_dealer";
  const isGarage = data?.business.category === "garage";
  const isSupport = data?.business.category !== undefined && ["insurance", "car_wash", "other"].includes(data.business.category);

  const { data: carListings } = useQuery<CarWithDealer[]>({
    queryKey: [`/api/cars?dealerId=${params.id}`],
    enabled: !!data && isDealer,
  });

  const { data: serviceListings } = useQuery<ServiceWithGarage[]>({
    queryKey: [`/api/services?garageId=${params.id}`],
    enabled: !!data && isGarage,
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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Business not found</h2>
        <p className="text-muted-foreground">This business may not exist or has been removed.</p>
      </div>
    );
  }

  const { business, reviews, spareParts, supportServices } = data;
  const categoryLabel = BUSINESS_CATEGORIES.find(c => c.value === business.category)?.label || business.category;
  const avgRating = business.avgRating || 0;
  const hasMap = business.latitude && business.longitude;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-12">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-md bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-white/70" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Badge className="mb-2 bg-white/10 text-white border-white/20">{categoryLabel}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold mb-1 truncate" data-testid="business-name">{business.name}</h1>
              <div className="flex items-center gap-1 text-blue-200 mb-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{business.address}, {business.city}</span>
              </div>
              {avgRating > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRow rating={Math.round(avgRating)} size="md" />
                  <span className="text-sm text-blue-100">
                    {avgRating.toFixed(1)} ({business.reviewCount} review{business.reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              ) : (
                <span className="text-sm text-blue-200">No reviews yet</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm hover:bg-white/20 transition-colors" data-testid="link-phone-header">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:block">Call</span>
              </a>
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-600/80 border border-green-500/30 rounded-md px-3 py-2 text-sm hover:bg-green-600 transition-colors"
                data-testid="link-whatsapp-header"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Share buttons */}
        <ShareButtons businessName={business.name} />

        {/* About */}
        <Card>
          <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="business-description">{business.description}</p>
          </CardContent>
        </Card>

        {/* Automotive Support — Support services */}
        {isSupport && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Services Offered {supportServices && supportServices.length > 0 && `(${supportServices.length})`}
              </h2>
            </div>
            {!supportServices || supportServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No services listed yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {supportServices.map(svc => (
                  <SupportServiceCard
                    key={svc.id}
                    service={svc}
                    businessName={business.name}
                    businessPhone={business.phone}
                    businessWhatsapp={business.whatsapp}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Car Dealer — Car listings */}
        {isDealer && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cars for Sale {carListings && `(${carListings.length})`}
                </h2>
              </div>
              <Link href={`/cars?dealerId=${params.id}`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            {!carListings || carListings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No car listings yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {carListings.slice(0, 6).map(car => <CarCard key={car.id} car={car} />)}
              </div>
            )}
          </div>
        )}

        {/* Garage — Services */}
        {isGarage && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Services Offered {serviceListings && `(${serviceListings.length})`}
                </h2>
              </div>
              <Link href="/garages/services">
                <Button variant="outline" size="sm">Browse All Services</Button>
              </Link>
            </div>
            {!serviceListings || serviceListings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No services listed yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceListings.map(svc => <GarageServiceCard key={svc.id} service={svc} />)}
              </div>
            )}
          </div>
        )}

        {/* Spare Parts */}
        {business.category === "spare_parts" && spareParts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-base">Available Spare Parts ({spareParts.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {spareParts.map(part => (
                  <div key={part.id} className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-testid={`part-${part.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{part.partName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {part.carBrand} {part.carModel} {part.year && `• ${part.year}`}
                        </p>
                      </div>
                      <Badge variant={part.condition === "new" ? "default" : "secondary"} className="text-xs">
                        {part.condition === "new" ? "New" : "Used"}
                      </Badge>
                    </div>
                    {part.price && <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1.5">{part.price}</p>}
                    {part.description && <p className="text-xs text-muted-foreground mt-1">{part.description}</p>}
                    <div className="flex gap-2 mt-3">
                      <a href={`tel:${business.phone}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full text-xs">
                          <Phone className="w-3 h-3 mr-1" />Call
                        </Button>
                      </a>
                      <a
                        href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm looking for: ${part.partName} for ${part.carBrand} ${part.carModel}`)}`}
                        target="_blank" rel="noopener noreferrer" className="flex-1"
                      >
                        <Button size="sm" className="w-full text-xs bg-green-600 text-white">
                          <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Section */}
        {hasMap && (
          <BusinessMap
            lat={parseFloat(business.latitude as string)}
            lng={parseFloat(business.longitude as string)}
            name={business.name}
            address={`${business.address}, ${business.city}`}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Reviews + Safety Tips + Report */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reviews */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-400" />
                    <CardTitle className="text-base">Reviews ({reviews.length})</CardTitle>
                  </div>
                  {avgRating > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{avgRating.toFixed(1)}</span>
                      <StarRow rating={Math.round(avgRating)} />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    {reviews.map(r => (
                      <div key={r.id} className="pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0" data-testid={`review-${r.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{r.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p>
                              <span className="text-xs text-muted-foreground">{new Date(r.createdAt!).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <StarRow rating={r.rating} />
                            <p className="text-sm text-muted-foreground mt-1.5">{r.comment}</p>
                          </div>
                        </div>
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

            {/* Safety Tips */}
            <SafetyTips />

            {/* Report Business */}
            <ReportBusinessForm businessId={params.id} />
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
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
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 w-full"
                  data-testid="link-whatsapp-profile"
                >
                  <div className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Chat on WhatsApp</span>
                </a>
                <div className="flex items-center gap-3 p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">{business.address}, {business.city}</span>
                </div>
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
    </div>
  );
}
