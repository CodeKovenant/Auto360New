import { useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import GarageServiceCard from "@/components/GarageServiceCard";
import type { GarageService } from "@shared/schema";

const SERVICE_TYPES = [
  "Engine Repair", "Oil Change", "Tire Replacement", "Car Diagnostics", "Brake Service",
  "AC Service", "Suspension", "Electrical", "Body Work", "Wheel Alignment", "Transmission",
];

type ServiceWithGarage = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string };

export default function GarageServices() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [search, setSearch] = useState(params.get("q") || "");
  const [location, setLocation] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    ...(search ? { q: search } : {}),
    ...(location !== "all" ? { location } : {}),
  }).toString();

  const { data: services, isLoading } = useQuery<ServiceWithGarage[]>({
    queryKey: [`/api/services?${queryString}`],
  });

  const cities = [...new Set(services?.map(s => s.garageCity).filter(Boolean) || [])].sort();
  const hasFilters = search || location !== "all";

  function clearFilters() {
    setSearch(""); setLocation("all");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-orange-700 to-orange-500 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2" data-testid="services-heading">Garage Services</h1>
          <p className="text-orange-100 mb-6">Find trusted mechanics and garage services near you</p>
          <div className="flex items-center gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search services (oil change, brake, engine...)..."
                className="pl-9 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-0"
                data-testid="input-search-services"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/30 text-white bg-white/10 backdrop-blur-sm"
              data-testid="button-filter-services"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger data-testid="select-service-location"><SelectValue placeholder="All Cities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-service-filters">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick filter chips */}
        <div className="flex gap-2 flex-wrap mb-5">
          {SERVICE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSearch(search === type ? "" : type)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                search === type
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              }`}
              data-testid={`chip-service-${type.toLowerCase().replace(/\s/g, "-")}`}
            >
              {type}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-md" />)}
          </div>
        ) : services && services.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-5" data-testid="services-count">
              {services.length} service{services.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(svc => <GarageServiceCard key={svc.id} service={svc} />)}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Wrench className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No services found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? "Try adjusting your search." : "No garage services listed yet."}
            </p>
            {hasFilters && <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
