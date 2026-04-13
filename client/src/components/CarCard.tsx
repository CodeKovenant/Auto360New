import { Link } from "wouter";
import { MapPin, Fuel, Gauge, MessageCircle, Car as CarIcon, Zap, RotateCcw } from "lucide-react";
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
  const mileage = formatMileage(car.mileage);

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
      data-testid={`card-car-${car.id}`}
    >
      {/* Image area */}
      <Link href={`/cars/${car.id}`} className="block relative flex-shrink-0">
        <div className="relative h-52 bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={car.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <CarIcon className="w-14 h-14 text-gray-200 dark:text-gray-700" />
              <span className="text-xs text-gray-400">No photo</span>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {/* Year — top left */}
          <span className="absolute top-3 left-3 inline-flex items-center bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow">
            {car.year}
          </span>

          {/* Featured — top right */}
          {car.featured && (
            <span className="absolute top-3 right-3 inline-flex items-center bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow">
              ★ Featured
            </span>
          )}

          {/* Condition + transmission — over gradient */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            {car.condition && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow ${
                isNew ? "bg-emerald-500 text-white" : "bg-white/20 backdrop-blur-sm border border-white/30 text-white"
              }`}>
                {isNew ? <Zap className="w-2.5 h-2.5" /> : <RotateCcw className="w-2.5 h-2.5" />}
                {isNew ? "Brand New" : "Used"}
              </span>
            )}
            {car.transmission && (
              <span className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow capitalize">
                {car.transmission}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/cars/${car.id}`}>
          <h3
            className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug line-clamp-1 hover:text-red-600 dark:hover:text-red-400 transition-colors mb-1"
            data-testid={`car-title-${car.id}`}
          >
            {car.title}
          </h3>
        </Link>

        <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mb-3 tracking-tight" data-testid={`car-price-${car.id}`}>
          {formatPrice(car.price)}
        </p>

        {/* Specs */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
          {mileage && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Gauge className="w-3.5 h-3.5 text-gray-400" />
              {mileage}
            </div>
          )}
          {car.fuelType && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Fuel className="w-3.5 h-3.5 text-gray-400" />
              <span className="capitalize">{car.fuelType}</span>
            </div>
          )}
          {car.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {car.location}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-4">
          by <span className="text-gray-600 dark:text-gray-300 font-medium">{car.dealerName}</span>
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <Link href={`/cars/${car.id}`} className="flex-1">
            <button
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`button-view-car-${car.id}`}
            >
              View Details
            </button>
          </Link>
          <a
            href={`https://wa.me/${car.dealerWhatsapp?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in the ${car.title} listed on Auto360.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`button-whatsapp-car-${car.id}`}
          >
            <button className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm shadow-green-200 dark:shadow-none">
              <MessageCircle className="w-4 h-4" />
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
