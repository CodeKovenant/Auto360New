import { Link } from "wouter";
import { MapPin, Fuel, Gauge, MessageCircle, Car as CarIcon, Zap, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Car } from "@shared/schema";

interface CarCardProps {
  car: Car & { dealerName: string; dealerWhatsapp: string };
}

function formatPrice(price: string | number) {
  const num = Number(price);
  if (num >= 1_000_000) return `KSh ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KSh ${(num / 1_000).toFixed(0)}K`;
  return `KSh ${num.toLocaleString()}`;
}

function formatMileage(km: number | null) {
  if (!km) return null;
  if (km >= 1000) return `${(km / 1000).toFixed(0)}k km`;
  return `${km} km`;
}

export default function CarCard({ car }: CarCardProps) {
  const image = car.images?.[0];
  const isNew = car.condition === "new";

  return (
    <Card className="group hover-elevate cursor-pointer flex flex-col overflow-hidden" data-testid={`card-car-${car.id}`}>
      {/* Image */}
      <Link href={`/cars/${car.id}`} className="block">
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
          {image ? (
            <img src={image} alt={car.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Gradient overlay at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Year — top left */}
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {car.year}
            </span>
          </div>

          {/* Condition + Transmission — bottom left (over gradient) */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            {car.condition && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm ${
                isNew
                  ? "bg-emerald-500 text-white"
                  : "bg-white/15 backdrop-blur-md border border-white/30 text-white"
              }`}>
                {isNew ? (
                  <Zap className="w-2.5 h-2.5" />
                ) : (
                  <RotateCcw className="w-2.5 h-2.5" />
                )}
                {isNew ? "Brand New" : "Used"}
              </span>
            )}
            {car.transmission && (
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm capitalize">
                {car.transmission}
              </span>
            )}
          </div>
        </div>
      </Link>

      <CardContent className="p-4 flex flex-col flex-1">
        {/* Clickable title */}
        <Link href={`/cars/${car.id}`}>
          <h3
            className="font-semibold text-gray-900 dark:text-white text-base leading-tight mb-0.5 line-clamp-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            data-testid={`car-title-${car.id}`}
          >
            {car.title}
          </h3>
        </Link>

        <p className="text-xl font-bold text-red-600 dark:text-red-400 mb-3" data-testid={`car-price-${car.id}`}>
          {formatPrice(car.price)}
        </p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
          {car.mileage && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatMileage(car.mileage)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Fuel className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="capitalize">{car.fuelType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{car.location}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3 truncate">
          Dealer: <span className="text-gray-700 dark:text-gray-300 font-medium">{car.dealerName}</span>
        </p>

        <div className="flex items-center gap-2 mt-auto">
          <Link href={`/cars/${car.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full" data-testid={`button-view-car-${car.id}`}>
              View Details
            </Button>
          </Link>
          <a
            href={`https://wa.me/${car.dealerWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in the ${car.title} listed on AutoDirectory.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`button-whatsapp-car-${car.id}`}
          >
            <Button size="sm" className="bg-green-600 text-white">
              <MessageCircle className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
