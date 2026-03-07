import { useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import type { Business } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

export default function Businesses() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [search, setSearch] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "all");
  const [city, setCity] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    ...(search ? { q: search } : {}),
    ...(category !== "all" ? { category } : {}),
    ...(city !== "all" ? { city } : {}),
    ...(minRating !== "0" ? { minRating } : {}),
  }).toString();

  const { data: businesses, isLoading } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: [`/api/businesses?${queryString}`],
  });

  const cities = [...new Set(businesses?.map(b => b.city) || [])].sort();

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setCity("all");
    setMinRating("0");
  }

  const hasFilters = search || category !== "all" || city !== "all" || minRating !== "0";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="businesses-heading">
            Find Car Services
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-60 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, city, spare part..."
                className="pl-9"
                data-testid="input-search-businesses"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : ""}
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {BUSINESS_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger data-testid="select-city">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(c => (
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-md" />
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-5" data-testid="businesses-count">
              {businesses.length} business{businesses.length !== 1 ? "es" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Building2 className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No businesses found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? "Try adjusting your filters or search terms." : "No approved businesses yet."}
            </p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
