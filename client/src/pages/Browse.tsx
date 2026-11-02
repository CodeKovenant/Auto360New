import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CarFront, Package, Search, Wrench } from "lucide-react";
import { Link } from "wouter";
import BusinessCard from "@/components/BusinessCard";
import CarCard from "@/components/CarCard";
import GarageServiceCard from "@/components/GarageServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Business, Car as CarType, GarageService } from "@shared/schema";

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string; dealerLogo?: string | null; galleryImage?: string | null };
type ServiceWithGarage = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo?: string | null; galleryImage?: string | null };
type BusinessWithRating = Business & { avgRating: number; reviewCount: number; galleryImage?: string | null };

export default function Browse() {
  const [categoryFilter, setCategoryFilter] = useState<"all" | "cars" | "services" | "parts">("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [carBrand, setCarBrand] = useState("all");
  const [serviceCity, setServiceCity] = useState("all");
  const [partCity, setPartCity] = useState("all");

  const { data: cars, isLoading: carsLoading } = useQuery<CarWithDealer[]>({
    queryKey: ["/api/cars"],
  });

  const { data: services, isLoading: servicesLoading } = useQuery<ServiceWithGarage[]>({
    queryKey: ["/api/services"],
  });

  const { data: sparePartsBusinesses, isLoading: spareLoading } = useQuery<BusinessWithRating[]>({
    queryKey: ["/api/businesses?category=spare_parts"],
  });

  const carBrands = useMemo(() => Array.from(new Set((cars ?? []).map(car => car.brand))).sort(), [cars]);
  const serviceCities = useMemo(() => Array.from(new Set((services ?? []).map(service => service.garageCity).filter(Boolean))).sort(), [services]);
  const partCities = useMemo(() => Array.from(new Set((sparePartsBusinesses ?? []).map(business => business.city).filter(Boolean))).sort(), [sparePartsBusinesses]);

  const filteredCars = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return (cars ?? []).filter(car => {
      const matchesCategory = categoryFilter === "all" || categoryFilter === "cars";
      const matchesSearch = !search || [car.title, car.brand, car.model, car.location].join(" ").toLowerCase().includes(search);
      const matchesBrand = carBrand === "all" || car.brand === carBrand;
      return matchesCategory && matchesSearch && matchesBrand;
    }).slice(0, 6);
  }, [cars, globalSearch, categoryFilter, carBrand]);

  const filteredServices = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return (services ?? []).filter(service => {
      const matchesCategory = categoryFilter === "all" || categoryFilter === "services";
      const matchesSearch = !search || [service.name, service.description, service.garageName].join(" ").toLowerCase().includes(search);
      const matchesCity = serviceCity === "all" || service.garageCity === serviceCity;
      return matchesCategory && matchesSearch && matchesCity;
    }).slice(0, 6);
  }, [services, globalSearch, categoryFilter, serviceCity]);

  const filteredPartBusinesses = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return (sparePartsBusinesses ?? []).filter(business => {
      const matchesCategory = categoryFilter === "all" || categoryFilter === "parts";
      const matchesSearch = !search || [business.name, business.city, business.description].join(" ").toLowerCase().includes(search);
      const matchesCity = partCity === "all" || business.city === partCity;
      return matchesCategory && matchesSearch && matchesCity;
    }).slice(0, 6);
  }, [sparePartsBusinesses, globalSearch, categoryFilter, partCity]);

  const loading = carsLoading || servicesLoading || spareLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-gradient-to-r from-red-700 via-red-800 to-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-red-200">Browse everything</p>
              <h1 className="text-3xl font-bold sm:text-4xl">All listings in one place</h1>
              <p className="mt-3 max-w-2xl text-sm text-red-100 sm:text-base">
                Explore available cars, garage services, and spare-parts businesses from trusted automotive providers across Kenya.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/cars">
                <Button className="bg-white text-red-700 hover:bg-red-50">Cars</Button>
              </Link>
              <Link href="/garages/services">
                <Button variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10">Services</Button>
              </Link>
              <Link href="/autospares-dealers">
                <Button variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10">Spare parts</Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <Input
                  value={globalSearch}
                  onChange={event => setGlobalSearch(event.target.value)}
                  placeholder="Search cars, services, and shops..."
                  className="border-0 bg-white/10 pl-9 text-white placeholder:text-red-100 focus-visible:ring-white/40"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "cars", "services", "parts"] as const).map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={categoryFilter === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(option)}
                    className={categoryFilter === option
                      ? "bg-white text-red-700 hover:bg-red-50"
                      : "border-white/30 bg-transparent text-white hover:bg-white/10"}
                  >
                    {option === "all" ? "All" : option === "cars" ? "Cars" : option === "services" ? "Services" : "Spare parts"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {(categoryFilter === "all" || categoryFilter === "cars") && (
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                  <CarFront className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cars</h2>
                  <p className="text-sm text-muted-foreground">Latest vehicle listings</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm text-muted-foreground">Brand</label>
                <select
                  value={carBrand}
                  onChange={event => setCarBrand(event.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">All brands</option>
                  {carBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
              </div>
            ) : filteredCars.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCars.map(car => <CarCard key={car.id} car={car} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-muted-foreground dark:border-gray-800 dark:bg-gray-900">
                No cars match your filters.
              </div>
            )}
          </section>
        )}

        {(categoryFilter === "all" || categoryFilter === "services") && (
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Garage services</h2>
                  <p className="text-sm text-muted-foreground">Repairs, maintenance, diagnostics and more</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm text-muted-foreground">City</label>
                <select
                  value={serviceCity}
                  onChange={event => setServiceCity(event.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">All cities</option>
                  {serviceCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map(service => <GarageServiceCard key={service.id} service={service} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-muted-foreground dark:border-gray-800 dark:bg-gray-900">
                No garage services match your filters.
              </div>
            )}
          </section>
        )}

        {(categoryFilter === "all" || categoryFilter === "parts") && (
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spare parts</h2>
                  <p className="text-sm text-muted-foreground">Parts dealers and suppliers</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm text-muted-foreground">City</label>
                <select
                  value={partCity}
                  onChange={event => setPartCity(event.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">All cities</option>
                  {partCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
              </div>
            ) : filteredPartBusinesses.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPartBusinesses.map(business => <BusinessCard key={business.id} business={business} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-muted-foreground dark:border-gray-800 dark:bg-gray-900">
                No spare-parts businesses match your filters.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
