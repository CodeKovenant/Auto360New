import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, Package, Phone, Store, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessGallery from "@/components/BusinessGallery";
import RelatedItems from "@/components/RelatedItems";
import { useAuth } from "@/hooks/use-auth";
import type { SparePart } from "@shared/schema";

type SparePartWithBusiness = SparePart & {
  businessName: string;
  businessCity: string;
  businessAddress: string;
  businessPhone: string;
  businessWhatsapp: string;
  businessLogo: string | null;
  businessOwnerId: string;
};

function formatPartPrice(price: string | null) {
  if (!price) return "Price on request";
  const normalized = price.replace(/[\\s,]/g, "");
  if (/^\\d+(\\.\\d+)?$/.test(normalized)) return "KSh " + Number(normalized).toLocaleString();
  return price;
}

export default function SparePartDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: part, isLoading } = useQuery<SparePartWithBusiness>({
    queryKey: ["/api/spare-parts/" + params.id],
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
        <Skeleton className="h-5 w-72" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-3" />
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold">Listing not available</h1>
        <p className="mb-6 text-muted-foreground">This part may have been removed or its seller is not currently active.</p>
        <Link href="/autospares-dealers"><Button variant="outline">Browse spare-parts dealers</Button></Link>
      </div>
    );
  }

  const canManage = !!(user && (user.id === part.businessOwnerId || user.role === "admin"));
  const whatsappUrl = part.businessWhatsapp
    ? "https://wa.me/" + part.businessWhatsapp.replace(/\\D/g, "") + "?text=" + encodeURIComponent("Hi, I'm interested in the " + part.partName + " for " + part.carBrand + " " + part.carModel)
    : "";
  const tags = ["Spare part", part.condition === "new" ? "New" : "Used", part.carBrand, part.carModel, part.year ? String(part.year) : ""].filter(Boolean);
  const specifications = [
    { label: "Condition", value: part.condition === "new" ? "New" : "Used" },
    { label: "Make", value: part.carBrand },
    { label: "Model", value: part.carModel },
    { label: "Year", value: part.year ? String(part.year) : "Not specified" },
    { label: "Location", value: [part.businessCity, part.businessAddress].filter(Boolean).join(", ") || "Contact seller" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-16 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/autospares-dealers" className="hover:text-orange-600">Spare parts</Link>
          <span>/</span>
          <Link href={"/business/" + part.businessId} className="max-w-[200px] truncate hover:text-orange-600">{part.businessName}</Link>
          <span>/</span>
          <span className="max-w-[240px] truncate text-gray-900 dark:text-white">{part.partName}</span>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <BusinessGallery
                entityType="spare_part"
                entityId={part.id}
                canManage={canManage}
                title="Product photos"
                layout="featured"
                initialImages={part.image ? [part.image] : []}
              />
            </div>
          </section>

          <aside className="space-y-5 lg:col-span-2">
            <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm dark:border-gray-800">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300">Auto part</Badge>
                  <Badge variant={part.condition === "new" ? "default" : "secondary"}>{part.condition === "new" ? "New" : "Used"}</Badge>
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white sm:text-3xl">{part.partName}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Fits {part.carBrand} {part.carModel}{part.year ? " · " + part.year : ""}</p>
                </div>
                <div className="border-y border-slate-100 py-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asking price</p>
                  <p className="mt-1 text-3xl font-bold text-orange-600 dark:text-orange-400">{formatPartPrice(part.price)}</p>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div>
                    <p className="font-semibold">Seller location</p>
                    <p className="mt-0.5 text-muted-foreground">{[part.businessCity, part.businessAddress].filter(Boolean).join(", ") || "Contact seller for location"}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {part.businessPhone && (
                    <a href={"tel:" + part.businessPhone} className="block">
                      <Button variant="outline" className="w-full"><Phone className="mr-2 h-4 w-4" />Call seller</Button>
                    </a>
                  )}
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-green-600 text-white hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>
                    </a>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-gray-800">
                      {part.businessLogo ? <img src={part.businessLogo} alt={part.businessName + " logo"} className="h-full w-full object-cover" /> : <Store className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Listed by</p>
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{part.businessName}</p>
                    </div>
                  </div>
                  <Link href={"/business/" + part.businessId} className="block">
                    <Button variant="outline" className="w-full">View seller profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 shadow-sm dark:border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5 text-orange-600" />About this item</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300">
                {part.description || (part.partName + " for " + part.carBrand + " " + part.carModel + ". Contact the seller to confirm compatibility, availability, and collection details.")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Listing tags">
                {tags.map(tag => <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1"><Tag className="mr-1.5 h-3 w-3" />{tag}</Badge>)}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm dark:border-gray-800">
            <CardHeader><CardTitle className="text-lg">Item details</CardTitle></CardHeader>
            <CardContent className="divide-y divide-slate-100 dark:divide-gray-800">
              {specifications.map(detail => (
                <div key={detail.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{detail.label}</span>
                  <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{detail.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-orange-600" />
          <span>Arrange to inspect the item with the seller before making payment.</span>
        </div>

        <RelatedItems kind="parts" currentId={part.id} businessId={part.businessId} />
        <RelatedItems kind="services" currentId={part.id} location={part.businessCity} />

        <Link href="/autospares-dealers" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />Browse more spare parts
        </Link>
      </div>
    </main>
  );
}
