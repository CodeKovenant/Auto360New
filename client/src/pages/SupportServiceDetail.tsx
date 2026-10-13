import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Droplets, MapPin, MessageCircle, Phone, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RelatedItems from "@/components/RelatedItems";
import type { SupportService } from "@shared/schema";

type SupportServiceWithBusiness = SupportService & {
  businessName: string;
  businessCity: string;
  businessAddress: string;
  businessPhone: string;
  businessWhatsapp: string;
  businessLogo: string | null;
  businessBanner: string | null;
  businessSubcategory: string | null;
  businessCategory: "insurance" | "car_wash" | "other";
  businessOwnerId: string;
};

function formatStartingPrice(price: string | null) {
  if (!price) return "Contact provider for pricing";
  const normalized = price.replace(/[\s,]/g, "");
  if (/^\d+(\.\d+)?$/.test(normalized)) return "From KSh " + Number(normalized).toLocaleString();
  return /^from\s/i.test(price) ? price : "From " + price;
}

export default function SupportServiceDetail() {
  const params = useParams<{ id: string }>();
  const { data: service, isLoading } = useQuery<SupportServiceWithBusiness>({
    queryKey: ["/api/support-service/" + params.id],
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

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold">Service listing not available</h1>
        <p className="mb-6 text-muted-foreground">This service may have been removed or its provider is not currently active.</p>
        <Link href="/automotive-support"><Button variant="outline">Browse automotive services</Button></Link>
      </div>
    );
  }

  const whatsappUrl = service.businessWhatsapp
    ? "https://wa.me/" + service.businessWhatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi, I'm interested in " + service.name)
    : "";
  const categoryLabel = service.businessCategory === "insurance"
    ? "Insurance"
    : service.businessCategory === "car_wash"
      ? "Car wash"
      : service.businessSubcategory?.replace(/_/g, " ") || "Automotive support";
  const CategoryIcon = service.businessCategory === "insurance" ? ShieldCheck : service.businessCategory === "car_wash" ? Droplets : Wrench;

  return (
    <main className="min-h-screen bg-slate-50 pb-16 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/automotive-support" className="hover:text-orange-600">Automotive support</Link>
          <span>/</span>
          <Link href={"/business/" + service.businessId} className="max-w-[200px] truncate hover:text-orange-600">{service.businessName}</Link>
          <span>/</span>
          <span className="max-w-[240px] truncate text-gray-900 dark:text-white">{service.name}</span>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {service.businessBanner ? (
                <img src={service.businessBanner} alt={service.businessName} className="h-full w-full object-cover" />
              ) : service.businessLogo ? (
                <div className="flex h-full w-full items-center justify-center bg-white p-10 dark:bg-gray-900">
                  <img src={service.businessLogo} alt={service.businessName + " logo"} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-300 dark:bg-orange-950/20">
                  <CategoryIcon className="h-24 w-24" />
                </div>
              )}
              <Badge className="absolute left-4 top-4 bg-white text-gray-900 shadow-sm hover:bg-white dark:bg-gray-950 dark:text-white dark:hover:bg-gray-950">
                <CategoryIcon className="mr-1.5 h-3.5 w-3.5 text-orange-600" />{categoryLabel}
              </Badge>
            </div>
          </section>

          <aside className="lg:col-span-2">
            <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm dark:border-gray-800">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Featured service</p>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white sm:text-3xl">{service.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Provided by {service.businessName}</p>
                </div>
                <div className="border-y border-slate-100 py-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starting price</p>
                  <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{formatStartingPrice(service.startingPrice)}</p>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div>
                    <p className="font-semibold">Provider location</p>
                    <p className="mt-0.5 text-muted-foreground">{[service.businessCity, service.businessAddress].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <a href={"tel:" + service.businessPhone} className="block">
                    <Button variant="outline" className="w-full"><Phone className="mr-2 h-4 w-4" />Call provider</Button>
                  </a>
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-green-600 text-white hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>
                    </a>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-gray-800">
                      {service.businessLogo ? <img src={service.businessLogo} alt={service.businessName + " logo"} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Service provider</p>
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{service.businessName}</p>
                    </div>
                  </div>
                  <Link href={"/business/" + service.businessId} className="block">
                    <Button variant="outline" className="w-full">View provider profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card className="mt-6 rounded-2xl border-slate-200 shadow-sm dark:border-gray-800">
          <CardHeader><CardTitle className="text-lg">Service details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300">
              {service.description || "Contact the provider to confirm the service scope, availability, and any requirements."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">{categoryLabel}</Badge>
              {service.businessSubcategory && <Badge variant="secondary" className="rounded-full px-3 py-1">{service.businessSubcategory.replace(/_/g, " ")}</Badge>}
            </div>
          </CardContent>
        </Card>

        <RelatedItems kind="support" currentId={service.id} businessId={service.businessId} businessName={service.businessName} location={service.businessCity} />
        <Link href="/automotive-support" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />Browse automotive support
        </Link>
      </div>
    </main>
  );
}
