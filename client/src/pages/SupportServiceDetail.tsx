import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronLeft, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SupportService } from "@shared/schema";

type SupportServiceWithBusiness = SupportService & {
  businessName: string;
  businessCity: string;
  businessLogo: string | null;
  businessSubcategory: string | null;
  businessPhone: string;
  businessWhatsapp: string;
  businessAddress: string;
};

export default function SupportServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isLoading } = useQuery<SupportServiceWithBusiness>({
    queryKey: ["/api/support-service/" + id],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-14 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="mb-2 text-xl font-semibold">Support service not found</h2>
        <p className="mb-5 text-muted-foreground">This listing may have been removed or is not currently available.</p>
        <Link href="/automotive-support">
          <Button variant="outline">Browse automotive support</Button>
        </Link>
      </div>
    );
  }

  const phoneDigits = service.businessWhatsapp.replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? "https://wa.me/" + phoneDigits + "?text=" + encodeURIComponent("Hi, I'm interested in your " + service.name + " service. Please provide more details.")
    : "";

  return (
    <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link href="/automotive-support">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to automotive support
          </Button>
        </Link>

        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-700 to-orange-500 px-5 py-7 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/15">
                {service.businessLogo ? (
                  <img src={service.businessLogo} alt={service.businessName + " logo"} className="h-full w-full object-cover" />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <Badge className="mb-2 border-white/25 bg-white/15 text-white">Automotive support</Badge>
                {service.featured && <Badge className="mb-2 ml-2 border-amber-200/40 bg-amber-300/20 text-amber-100">★ Featured</Badge>}
                <h1 className="text-2xl font-bold sm:text-3xl" data-testid="support-service-detail-name">{service.name}</h1>
                <p className="mt-1 text-orange-100">{service.businessName}</p>
              </div>
            </div>
          </div>

          <CardContent className="grid grid-cols-1 gap-8 p-5 sm:p-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section>
                <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">About this service</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {service.description || "Contact the provider for more information about this service."}
                </p>
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Provider location</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{[service.businessAddress, service.businessCity].filter(Boolean).join(", ") || "Contact the provider for location"}</p>
                  </div>
                </div>
                {service.startingPrice && (
                  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground">Starting from</p>
                    <p className="mt-1 font-semibold text-orange-600 dark:text-orange-400">KSh {service.startingPrice}</p>
                  </div>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" /> Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold text-gray-900 dark:text-white">{service.businessName}</p>
                <Link href={"/business/" + service.businessId} className="block">
                  <Button variant="outline" className="w-full">View provider profile</Button>
                </Link>
                {service.businessPhone && (
                  <a href={"tel:" + service.businessPhone} className="block">
                    <Button variant="outline" className="w-full">
                      <Phone className="mr-2 h-4 w-4" /> Call provider
                    </Button>
                  </a>
                )}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                      <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Link href="/automotive-support" className="mt-6 inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />
          Browse more support services
        </Link>
      </div>
    </div>
  );
}
