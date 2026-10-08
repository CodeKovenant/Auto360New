import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronLeft, MapPin, MessageCircle, Wrench } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessGallery from "@/components/BusinessGallery";
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
    queryKey: [`/api/services/${params.id}`],
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-14 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Service not found</h2>
        <p className="text-muted-foreground mb-5">This service may have been removed or is not currently available.</p>
        <Link href="/garages/services">
          <Button variant="outline">Browse Services</Button>
        </Link>
      </div>
    );
  }

  const whatsappUrl = service.garageWhatsapp
    ? `https://wa.me/${service.garageWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I need help with: ${service.name}`)}`
    : "";

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/garages/services">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Services
          </Button>
        </Link>

        <Card className="overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-700 to-orange-500 text-white px-5 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center overflow-hidden flex-shrink-0">
                {service.garageLogo ? (
                  <img src={service.garageLogo} alt={`${service.garageName} logo`} className="w-full h-full object-cover" />
                ) : (
                  <Wrench className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <Badge className="mb-2 bg-white/15 text-white border-white/25">Garage Service</Badge>
                <h1 className="text-2xl sm:text-3xl font-bold" data-testid="service-detail-name">{service.name}</h1>
                <p className="text-orange-100 mt-1">{service.garageName}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About this service</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description || "Contact the garage for more information about this service."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    {service.garageCity}
                  </div>
                  {service.price && (
                    <div className="font-semibold text-orange-600 dark:text-orange-400">
                      Starting from {service.price}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Link href={`/business/${service.garageId}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Building2 className="w-4 h-4 mr-2" />
                    View Garage Profile
                  </Button>
                </Link>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Photos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BusinessGallery
              entityType="garage_service"
              entityId={service.id}
              canManage={false}
              title="Service Photos"
            />
          </CardContent>
        </Card>

        <Link href="/garages/services" className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 mt-6">
          <ArrowLeft className="w-4 h-4" />
          Browse more services
        </Link>
      </div>
    </div>
  );
}