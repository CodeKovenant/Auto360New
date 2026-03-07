import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import CarCard from "@/components/CarCard";
import type { Car as CarType } from "@shared/schema";
import { FUEL_TYPES, TRANSMISSIONS, CAR_CONDITIONS } from "@shared/schema";

const CAR_BRANDS = ["Toyota", "Honda", "Nissan", "Subaru", "Mazda", "Mercedes", "BMW", "Audi", "Volkswagen", "Mitsubishi", "Land Rover", "Ford", "Hyundai", "Kia"];

export default function Cars() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [search, setSearch] = useState(params.get("q") || "");
  const [brand, setBrand] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [condition, setCondition] = useState("all");
  const [minYear, setMinYear] = useState("any");
  const [maxPrice, setMaxPrice] = useState("any");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    ...(search ? { q: search } : {}),
    ...(brand !== "all" ? { brand } : {}),
    ...(fuelType !== "all" ? { fuelType } : {}),
    ...(transmission !== "all" ? { transmission } : {}),
    ...(condition !== "all" ? { condition } : {}),
    ...(minYear && minYear !== "any" ? { minYear } : {}),
    ...(maxPrice && maxPrice !== "any" ? { maxPrice } : {}),
  }).toString();

  const { data: carList, isLoading } = useQuery<(CarType & { dealerName: string; dealerWhatsapp: string })[]>({
    queryKey: [`/api/cars?${queryString}`],
  });

  const hasFilters = search || brand !== "all" || fuelType !== "all" || transmission !== "all" || condition !== "all" || (minYear !== "any") || (maxPrice !== "any");

  function clearFilters() {
    setSearch(""); setBrand("all"); setFuelType("all"); setTransmission("all"); setCondition("all"); setMinYear("any"); setMaxPrice("any");
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => String(currentYear - i));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2" data-testid="cars-heading">Cars for Sale</h1>
          <p className="text-blue-200 mb-6">Browse verified vehicles from trusted dealers</p>
          <form onSubmit={e => e.preventDefault()} className="flex items-center gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by brand, model, location..."
                className="pl-9 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-0"
                data-testid="input-search-cars"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/30 text-white bg-white/10 backdrop-blur-sm"
              data-testid="button-filter-cars"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger data-testid="select-brand"><SelectValue placeholder="All Brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {CAR_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger><SelectValue placeholder="Fuel Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fuel Types</SelectItem>
                  {FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger><SelectValue placeholder="Transmission" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transmissions</SelectItem>
                  {TRANSMISSIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger data-testid="select-condition-filter"><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {CAR_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={minYear} onValueChange={setMinYear}>
                <SelectTrigger><SelectValue placeholder="Min Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Year</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={maxPrice} onValueChange={setMaxPrice}>
                <SelectTrigger><SelectValue placeholder="Max Price" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Price</SelectItem>
                  <SelectItem value="500000">Up to KSh 500K</SelectItem>
                  <SelectItem value="1000000">Up to KSh 1M</SelectItem>
                  <SelectItem value="2000000">Up to KSh 2M</SelectItem>
                  <SelectItem value="5000000">Up to KSh 5M</SelectItem>
                  <SelectItem value="10000000">Up to KSh 10M</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-car-filters">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-md" />)}
          </div>
        ) : carList && carList.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-5" data-testid="cars-count">
              {carList.length} car{carList.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {carList.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Car className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No cars found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? "Try adjusting your filters." : "No car listings yet. Check back soon!"}
            </p>
            {hasFilters && <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
