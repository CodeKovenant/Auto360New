import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Car, Package, Wrench, Building2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import type { Business } from "@shared/schema";

type BizWithRating = Business & { avgRating: number; reviewCount: number };

interface BrandData {
  dealers: BizWithRating[];
  spareParts: BizWithRating[];
  garages: BizWithRating[];
}

const BRAND_LOGOS: Record<string, string> = {
  "Toyota": "https://cdn.simpleicons.org/toyota",
  "Nissan": "https://cdn.simpleicons.org/nissan",
  "Honda": "https://cdn.simpleicons.org/honda",
  "Subaru": "https://cdn.simpleicons.org/subaru",
  "Mazda": "https://cdn.simpleicons.org/mazda",
  "Mitsubishi": "https://cdn.simpleicons.org/mitsubishi",
  "BMW": "https://cdn.simpleicons.org/bmw",
  "Hyundai": "https://cdn.simpleicons.org/hyundai",
  "Volkswagen": "https://cdn.simpleicons.org/volkswagen",
  "Land Rover": "https://cdn.jsdelivr.net/npm/simple-icons/icons/landrover.svg",
  "Mercedes-Benz": "https://cdn.simpleicons.org/mercedes",
  "Audi": "https://cdn.simpleicons.org/audi",
  "Kia": "https://cdn.simpleicons.org/kia",
  "Porsche": "https://cdn.simpleicons.org/porsche",
  "Volvo": "https://cdn.simpleicons.org/volvo",
};

const TABS = [
  { id: "dealers", label: "Car Dealers", icon: Car, color: "text-red-600 dark:text-red-400" },
  { id: "spare_parts", label: "Spare Parts", icon: Package, color: "text-orange-500 dark:text-orange-400" },
  { id: "garages", label: "Garages", icon: Wrench, color: "text-green-600 dark:text-green-400" },
] as const;

type TabId = typeof TABS[number]["id"];

function EmptyState({ tab, brand }: { tab: TabId; brand: string }) {
  const msgs: Record<TabId, string> = {
    dealers: `No approved car dealers currently stocking ${brand} vehicles.`,
    spare_parts: `No spare parts dealers currently listing ${brand} parts.`,
    garages: `No garages currently specialising in ${brand} vehicles.`,
  };
  const icons: Record<TabId, typeof Car> = { dealers: Car, spare_parts: Package, garages: Wrench };
  const Icon = icons[tab];
  return (
    <div className="text-center py-16">
      <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p className="text-muted-foreground text-sm">{msgs[tab]}</p>
    </div>
  );
}

export default function BrandPage() {
  const params = useParams<{ brand: string }>();
  const brand = decodeURIComponent(params.brand || "");
  const [activeTab, setActiveTab] = useState<TabId>("dealers");

  const { data, isLoading } = useQuery<BrandData>({
    queryKey: [`/api/businesses/by-brand/${encodeURIComponent(brand)}`],
    enabled: !!brand,
  });

  const logoUrl = BRAND_LOGOS[brand];

  const counts = {
    dealers: data?.dealers.length ?? 0,
    spare_parts: data?.spareParts.length ?? 0,
    garages: data?.garages.length ?? 0,
  };

  const activeList: BizWithRating[] =
    activeTab === "dealers" ? (data?.dealers ?? []) :
    activeTab === "spare_parts" ? (data?.spareParts ?? []) :
    (data?.garages ?? []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-950 to-red-900 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5 transition-colors" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${brand} logo`}
                  className="w-10 h-10 object-contain brightness-0 invert"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <Building2 className="w-8 h-8 text-white/70" />
              )}
            </div>
            <div>
              <p className="text-red-200 text-sm mb-1">Browse by brand</p>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="brand-title">{brand}</h1>
              <p className="text-red-200 text-sm mt-1">
                {isLoading ? "Loading…" : `${counts.dealers} dealer${counts.dealers !== 1 ? "s" : ""} · ${counts.spare_parts} spare parts · ${counts.garages} garage${counts.garages !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = counts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
                    : "border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ""}`} />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <EmptyState tab={activeTab} brand={brand} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeList.map(biz => (
              <BusinessCard key={biz.id} business={biz} data-testid={`card-biz-${biz.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
