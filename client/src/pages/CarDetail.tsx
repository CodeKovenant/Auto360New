import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Gauge, MessageCircle, Car as CarIcon, ChevronLeft, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Car as CarType } from "@shared/schema";
import { Link } from "wouter";
import BusinessGallery from "@/components/BusinessGallery";
import RelatedItems from "@/components/RelatedItems";
import { useAuth } from "@/hooks/use-auth";

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null };

function formatPrice(price: string | number) {
  const num = Number(price);
  return "KSh " + num.toLocaleString();
}

export default function CarDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: car, isLoading } = useQuery<CarWithDealer>({
    queryKey: ["/api/cars/" + params.id],
  });

  const canManageGallery = !!(user && car && user.id === car.dealerId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <CarIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="mb-2 text-xl font-semibold">Car not found</h2>
        <Link href="/cars"><Button variant="outline">Browse Cars</Button></Link>
      </div>
    );
  }

  const images = car.images || [];
  const vehicleTags = [
    car.brand,
    car.model,
    String(car.year),
    ...(car.featured ? ["Featured"] : []),
    car.condition === "new" ? "Brand new" : "Used",
    car.fuelType,
    car.transmission,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link href="/cars">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Cars
          </Button>
        </Link>

        <div className="mb-6">
          <BusinessGallery
            entityType="car"
            entityId={car.id}
            canManage={canManageGallery}
            title="Vehicle photos"
            layout="featured"
            initialImages={images}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardContent className="pt-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="car-detail-title">{car.title}</h1>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="car-detail-price">{formatPrice(car.price)}</p>
                </div>

                <section className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Listing tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {vehicleTags.map((tag, index) => (
                      <Badge key={tag + "-" + index} className="bg-gray-100 capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>

                <section className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Vehicle details</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Brand</p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{car.brand}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{car.model}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Year</p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{car.year}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <p className="mt-1 font-medium capitalize text-gray-900 dark:text-white">{car.condition === "new" ? "Brand new" : "Used"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Fuel</p>
                      <p className="mt-1 font-medium capitalize text-gray-900 dark:text-white">{car.fuelType}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                      <p className="text-xs text-muted-foreground">Transmission</p>
                      <p className="mt-1 font-medium capitalize text-gray-900 dark:text-white">{car.transmission}</p>
                    </div>
                  </div>
                </section>

                <div className="mb-5 flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-red-500" />
                  <span className="font-medium">Location:</span>
                  <span>{car.location}</span>
                </div>

                <section className="border-t border-gray-100 pt-5 dark:border-gray-800">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">About this vehicle</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {car.description || "The seller has not added a description for this vehicle yet."}
                  </p>
                </section>

                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span>{car.mileage != null ? car.mileage.toLocaleString() + " km" : "Mileage not provided"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" /> Dealer Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    {car.dealerLogo ? (
                      <img src={car.dealerLogo} alt={car.dealerName + " logo"} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{car.dealerName}</p>
                </div>
{car.dealerWhatsapp?.trim() && (
                <a
                  href={"https://wa.me/" + car.dealerWhatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi, I'm interested in the " + car.title + " listed on AutoDirectory. Price: " + formatPrice(car.price))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid="button-whatsapp-dealer"
                >
                  <Button className="w-full bg-green-600 text-white">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat on WhatsApp
                  </Button>
                </a>
                )}
                <Link href={"/business/" + car.dealerId}>
                  <Button variant="outline" className="w-full">View Dealer Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <RelatedItems kind="cars" currentId={car.id} brand={car.brand} location={car.location} />
      </div>
    </div>
  );
}
