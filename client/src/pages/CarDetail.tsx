import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Fuel, Settings2, Gauge, MessageCircle, Car as CarIcon, ChevronLeft, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Car as CarType } from "@shared/schema";
import { Link } from "wouter";

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string };

function formatPrice(price: string | number) {
  const num = Number(price);
  return `KSh ${num.toLocaleString()}`;
}

export default function CarDetail() {
  const params = useParams<{ id: string }>();

  const { data: car, isLoading } = useQuery<CarWithDealer>({
    queryKey: [`/api/cars/${params.id}`],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <CarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Car not found</h2>
        <Link href="/cars"><Button variant="outline">Browse Cars</Button></Link>
      </div>
    );
  }

  const images = car.images || [];

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/cars">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Cars
          </Button>
        </Link>

        {/* Images */}
        <div className="mb-6">
          {images.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              <div className="h-72 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src={images[0]} alt={car.title} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.slice(1, 4).map((img, i) => (
                    <div key={i} className="h-24 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img src={img} alt={`${car.title} ${i + 2}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-72 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CarIcon className="w-20 h-20 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="car-detail-title">{car.title}</h1>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="car-detail-price">{formatPrice(car.price)}</p>
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{car.year}</Badge>
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">{car.fuelType}</Badge>
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">{car.transmission}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gauge className="w-4 h-4" />
                    <span>{car.mileage ? `${car.mileage.toLocaleString()} km` : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{car.location}</span>
                  </div>
                </div>

                {car.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{car.description}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Dealer Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold text-gray-900 dark:text-white">{car.dealerName}</p>
                <a
                  href={`https://wa.me/${car.dealerWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in the ${car.title} listed on AutoDirectory. Price: ${formatPrice(car.price)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid="button-whatsapp-dealer"
                >
                  <Button className="w-full bg-green-600 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat on WhatsApp
                  </Button>
                </a>
                <Link href={`/business/${car.dealerId}`}>
                  <Button variant="outline" className="w-full">View Dealer Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
