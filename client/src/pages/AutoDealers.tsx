import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Car, MapPin, BadgeCheck, ChevronRight, Building2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import type { Business } from "@shared/schema";

const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri",
  "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi",
  "Trans-Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
];

const BRANDS = [
  "Toyota","Nissan","Honda","Subaru","Mazda","Mitsubishi","BMW","Mercedes-Benz",
  "Volkswagen","Ford","Isuzu","Hyundai","Kia","Land Rover","Jeep","Audi",
];

export default function AutoDealers() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    category: "car_dealer",
    ...(search ? { q: search } : {}),
    ...(city !== "all" ? { city } : {}),
    ...(minRating !== "0" ? { minRating } : {}),
  }).toString();

  const { data: businesses, isLoading } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: [`/api/businesses?${queryString}`],
  });

  const hasFilters = search || city !== "all" || minRating !== "0";

  function clearFilters() {
    setSearch("");
    setCity("all");
    setMinRating("0");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── BANNER ── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-red-950 to-gray-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%), radial-gradient(circle at 80% 20%, #dc2626 0%, transparent 40%)" }}
        />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Left — text content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6 text-red-200">
                <BadgeCheck className="w-4 h-4 text-red-400" />
                Verified Automobile Dealers
              </div>

              {/* Heading */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 drop-shadow-lg" data-testid="dealers-banner-heading">
                Trusted Car Dealers
                <span className="block text-orange-400">Near You</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-gray-300 mb-3 max-w-xl mx-auto lg:mx-0">
                Find verified automobile dealers &amp; drive with confidence
              </p>

              {/* Tagline */}
              <div className="flex items-center gap-2 justify-center lg:justify-start mb-8 text-red-300 text-sm font-medium">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                Explore leading car brands across Kenya
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <a href="#dealer-listings">
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-6" data-testid="button-browse-dealers">
                    <Car className="w-4 h-4 mr-2" />
                    Browse Dealers
                  </Button>
                </a>
                <Link href="/register-business">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-6" data-testid="button-list-dealership">
                    List Your Dealership
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — stats cards */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-4 w-full max-w-xs">
              {[
                { icon: Car, label: "Active Dealers", value: businesses?.length ?? "—" },
                { icon: MapPin, label: "Counties Covered", value: "47" },
                { icon: BadgeCheck, label: "Verified Listings", value: "100%" },
                { icon: Building2, label: "Car Brands", value: "50+" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 border border-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <Icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Brand pills */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 text-center lg:text-left">Popular brands available</p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {BRANDS.map(brand => (
                <Link href={`/brand/${encodeURIComponent(brand)}`} key={brand}>
                  <span
                    className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-gray-300 hover:bg-red-600/30 hover:border-red-500/40 hover:text-white transition-colors cursor-pointer"
                    data-testid={`dealer-brand-${brand.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {brand}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SEARCH & FILTERS ── */}
      <div id="dealer-listings" className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-60 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search dealers by name, brand, city..."
                className="pl-9"
                data-testid="input-search-dealers"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : ""}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger data-testid="select-county">
                  <SelectValue placeholder="All Counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {KENYA_COUNTIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger data-testid="select-rating">
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-md" />
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <p className="text-sm text-muted-foreground" data-testid="dealers-count">
                {businesses.length} dealer{businesses.length !== 1 ? "s" : ""} found
              </p>
              <Link href="/register-business">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs" data-testid="button-register-dealer">
                  <ChevronRight className="w-3.5 h-3.5 mr-1" />
                  Register Your Dealership
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Car className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No dealers found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? "Try adjusting your filters or search terms." : "No approved dealers yet."}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
              <Link href="/register-business">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Register Your Dealership</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
