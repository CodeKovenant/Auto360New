import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronLeft, MapPin, MessageCircle, Wrench } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessGallery from "@/components/BusinessGallery";
import RelatedItems from "@/components/RelatedItems";
import type { GarageService } from "@shared/schema";

type ServiceWithGarage = GarageService & {
  garageName: string;
  garageWhatsapp: string;
  garageCity: string;
  garageLogo: string | null;
};

export default function ServiceDetail() {
  const params = useParams<{ id: string }>();

  const { data: service, isLoading } = useQuery<ServiceWithGarage>({
    queryKey: ["/api/services/" + params.id],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-14 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Wrench className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="mb-2 text-xl font-semibold">Service not found</h2>
        <p className="mb-5 text-muted-foreground">This service may have been removed or is not currently available.</p>
        <Link href="/garages/services">
          <Button variant="outline">Browse Services</Button>
        </Link>
      </div>
    );
  }

  const whatsappUrl = service.garageWhatsapp
    ? "https://wa.me/" + service.garageWhatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi, I need help with: " + service.name)
    : "";
  const serviceTags = ["Garage service", ...(service.featured ? ["Featured"] : []), ...(service.popular ? ["Popular service"] : [])];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link href="/garages/services">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Services
          </Button>
        </Link>

        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-700 to-orange-500 px-5 py-7 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/15">
                {service.garageLogo ? (
                  <img src={service.garageLogo} alt={service.garageName + " logo"} className="h-full w-full object-cover" />
                ) : (
                  <Wrench className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <Badge className="mb-2 border-white/25 bg-white/15 text-white">Garage Service</Badge>
                <h1 className="text-2xl font-bold sm:text-3xl" data-testid="service-detail-name">{service.name}</h1>
                <p className="mt-1 text-orange-100">{service.garageName}</p>
              </div>
            </div>
          </div>

          <CardContent className="space-y-8 p-5 sm:p-8">
            <BusinessGallery
              entityType="garage_service"
              entityId={service.id}
              canManage={false}
              title="Service photos"
              layout="featured"
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">About this service</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {service.description || "Contact the garage for more information about this service."}
                  </p>
                </section>

                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Service tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {serviceTags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service location</p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{service.garageCity || "Contact the garage for location"}</p>
                    </div>
                  </div>
                  {service.price && (
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="mt-1 font-semibold text-orange-600 dark:text-orange-400">Starting from {service.price}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" /> Garage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.garageName}</p>
                    <Link href={"/business/" + service.garageId} className="block">
                      <Button variant="outline" className="w-full">View Garage Profile</Button>
                    </Link>
                    {whatsappUrl && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Chat on WhatsApp
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <RelatedItems kind="services" currentId={service.id} location={service.garageCity} />

        <Link href="/garages/services" className="mt-6 inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />
          Browse more services
        </Link>
      </div>
    </div>
  );
}
