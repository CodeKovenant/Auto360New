import { useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Droplets, BadgeDollarSign, Radio, Truck, Building2, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import type { Business } from "@shared/schema";

const TABS = [
  {
    value: "car_wash_detailing",
    label: "Car Wash & Auto Detailing",
    icon: Droplets,
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    activeBorder: "border-cyan-500",
    desc: "Professional car wash, detailing, and paint protection services",
  },
  {
    value: "vehicle_finance",
    label: "Vehicle Finance",
    icon: BadgeDollarSign,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    activeBorder: "border-green-500",
    desc: "Car loans, hire purchase, and insurance solutions",
  },
  {
    value: "vehicle_tracking",
    label: "Vehicle Tracking",
    icon: Radio,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    activeBorder: "border-blue-500",
    desc: "GPS tracking systems, fleet management, and security",
  },
  {
    value: "vehicle_towing",
    label: "Vehicle Towing",
    icon: Truck,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    activeBorder: "border-orange-500",
    desc: "24/7 towing, roadside assistance, and breakdown recovery",
  },
];

const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyandarua","Nyamira","Nyeri",
  "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi",
  "Trans-Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
];

export default function AutomotiveSupport() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [activeTab, setActiveTab] = useState(params.get("tab") || "car_wash_detailing");
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    category: "automotive_support",
    subcategory: activeTab,
    ...(search ? { q: search } : {}),
    ...(county !== "all" ? { city: county } : {}),
  }).toString();

  const { data: businesses, isLoading } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: [`/api/businesses?${queryString}`],
  });

  const currentTab = TABS.find(t => t.value === activeTab)!;

  function clearFilters() {
    setSearch("");
    setCounty("all");
  }

  const hasFilters = search || county !== "all";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1" data-testid="support-heading">
            Automotive Support Industry
          </h1>
          <p className="text-muted-foreground text-sm mb-5">
            Find professional automotive support services across Kenya
          </p>

          {/* Tabs */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 -mb-px">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  data-testid={`tab-${tab.value}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? `${tab.bg} ${tab.color} ${tab.activeBorder} border-b-2`
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-header for active tab */}
      <div className={`${currentTab.bg} border-b border-gray-200 dark:border-gray-700`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <currentTab.icon className={`w-5 h-5 ${currentTab.color}`} />
              <p className="text-sm text-gray-600 dark:text-gray-300">{currentTab.desc}</p>
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  className="pl-9 h-9 w-52 bg-white dark:bg-gray-900"
                  data-testid="input-search-support"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 bg-white dark:bg-gray-900"
                data-testid="button-toggle-filters-support"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                Filter
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9" data-testid="button-clear-filters-support">
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-3">
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger className="w-52 h-9 bg-white dark:bg-gray-900" data-testid="select-county-support">
                  <SelectValue placeholder="All Counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {KENYA_COUNTIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-md" />
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-5" data-testid="support-count">
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
            <currentTab.icon className={`w-14 h-14 mx-auto mb-4 opacity-20 ${currentTab.color}`} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              No {currentTab.label} businesses yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Be the first to list your {currentTab.label.toLowerCase()} business and reach customers across Kenya.
            </p>
            <a href="/register-business">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Register Your Business
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
