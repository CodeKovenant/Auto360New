import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Car as CarIcon, MapPin, Package, Wrench } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Car as CarType, GarageService, SparePart } from "@shared/schema";

type RelatedCar = CarType & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null; galleryImage?: string | null };
type RelatedService = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; galleryImage?: string | null };

type Props = {
  kind: "cars" | "services" | "parts";
  currentId: string;
  location?: string;
  brand?: string;
  businessId?: string;
};

type RelatedCard = {
  id: string;
  title: string;
  subtitle: string;
  image?: string | null;
  price?: string | null;
  tag: string;
  location?: string | null;
  href: string;
};

function formatCarPrice(price: string | number) {
  const amount = Number(price);
  return Number.isFinite(amount) ? "KSh " + amount.toLocaleString() : String(price);
}

export default function RelatedItems({ kind, currentId, location, brand, businessId }: Props) {
  const carParams = new URLSearchParams();
  if (brand) carParams.set("brand", brand);
  if (location) carParams.set("location", location);
  const carQuery = carParams.toString();
  const carPath = "/api/cars" + (carQuery ? "?" + carQuery : "");

  const serviceParams = new URLSearchParams();
  if (location) serviceParams.set("location", location);
  const serviceQuery = serviceParams.toString();
  const servicePath = "/api/services" + (serviceQuery ? "?" + serviceQuery : "");

  const { data: cars, isLoading: carsLoading } = useQuery<RelatedCar[]>({
    queryKey: [carPath],
    enabled: kind === "cars",
  });
  const { data: services, isLoading: servicesLoading } = useQuery<RelatedService[]>({
    queryKey: [servicePath],
    enabled: kind === "services",
  });
  const { data: parts, isLoading: partsLoading } = useQuery<(SparePart & { galleryImage?: string | null })[]>({
    queryKey: ["/api/parts/" + (businessId || "")],
    enabled: kind === "parts" && !!businessId,
  });

  const items: RelatedCard[] = kind === "cars"
    ? (cars || []).filter(car => car.id !== currentId).slice(0, 4).map(car => ({
        id: car.id,
        title: car.title,
        subtitle: car.brand + " " + car.model + " - " + car.year,
        image: car.images?.[0] || car.galleryImage,
        price: formatCarPrice(car.price),
        tag: car.condition === "new" ? "Brand new" : "Used",
        location: car.location,
        href: "/cars/" + car.id,
      }))
    : kind === "services"
      ? (services || []).filter(service => service.id !== currentId).slice(0, 4).map(service => ({
          id: service.id,
          title: service.name,
          subtitle: service.garageName,
          image: service.galleryImage,
          price: service.price ? "From " + service.price : null,
          tag: service.popular ? "Popular" : "Garage service",
          location: service.garageCity,
          href: "/services/" + service.id,
        }))
      : (parts || []).filter(part => part.id !== currentId).slice(0, 4).map(part => ({
          id: part.id,
          title: part.partName,
          subtitle: part.carBrand + " " + part.carModel + (part.year ? " - " + part.year : ""),
          image: part.image || part.galleryImage,
          price: part.price,
          tag: part.condition === "new" ? "New" : "Used",
          location: null,
          href: "/parts/" + part.id,
        }));

  const isLoading = kind === "cars" ? carsLoading : kind === "services" ? servicesLoading : partsLoading;
  const heading = kind === "cars" ? "Similar vehicles" : kind === "services" ? "More services nearby" : "More parts from this seller";
  const browseHref = kind === "cars" ? "/cars" : kind === "services" ? "/garages/services" : businessId ? "/business/" + businessId : "/autospares-dealers";
  const browseLabel = kind === "parts" ? "View seller profile" : "Browse all";
  const PlaceholderIcon = kind === "cars" ? CarIcon : kind === "services" ? Wrench : Package;

  if (isLoading) {
    return (
      <section className="mt-10" aria-label={heading}>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">{heading}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-10" aria-label={heading}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Keep exploring</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{heading}</h2>
        </div>
        <Link href={browseHref} className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700">
          {browseLabel}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(item => (
          <Link key={item.id} href={item.href} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {item.image ? (
                <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                  <PlaceholderIcon className="h-12 w-12" />
                </div>
              )}
              <Badge variant="secondary" className="absolute left-3 top-3">{item.tag}</Badge>
            </div>
            <div className="p-4">
              <h3 className="line-clamp-1 font-semibold text-gray-900 group-hover:text-orange-600 dark:text-white">{item.title}</h3>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.subtitle}</p>
              {item.price && <p className="mt-3 font-bold text-orange-600 dark:text-orange-400">{item.price}</p>}
              {item.location && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />{item.location}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
