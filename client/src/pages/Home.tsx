import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Car, Wrench, Package, Droplets, Shield, MoreHorizontal, ChevronRight, CheckCircle, Building2, BadgeCheck, Store, MapPin, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import CarCard from "@/components/CarCard";
import GarageServiceCard from "@/components/GarageServiceCard";
import ReviewCard from "@/components/ReviewCard";
import type { Business, Car as CarType, GarageService } from "@shared/schema";

type BusinessRated = Business & { avgRating: number; reviewCount: number };
type HomeSections = Record<string, BusinessRated[]>;

const PREMIUM_CATEGORY_ORDER = ["car_dealer", "garage", "spare_parts", "car_wash", "insurance", "other"] as const;

const PREMIUM_SECTION_TITLE: Record<(typeof PREMIUM_CATEGORY_ORDER)[number], string> = {
  car_dealer: "Premium Car Dealers",
  garage: "Premium Garages",
  spare_parts: "Premium Spare Parts Shops",
  car_wash: "Premium Car Wash",
  insurance: "Premium Insurance",
  other: "Premium Other Services",
};

const HOME_SPOTLIGHT_SECTIONS: {
  category: (typeof PREMIUM_CATEGORY_ORDER)[number];
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { category: "spare_parts", title: "Featured Spare Parts Shops", subtitle: "Genuine and quality parts for all vehicle makes", href: "/autospares-dealers", icon: Package },
  { category: "garage", title: "Featured Garages", subtitle: "Trusted mechanics and auto repair shops near you", href: "/autogarage-repair", icon: Wrench },
  { category: "car_dealer", title: "Featured Car Dealers", subtitle: "Trusted dealers and showrooms near you", href: "/automobile-dealers", icon: Car },
  { category: "car_wash", title: "Featured Car Wash", subtitle: "Wash and detailing services", href: "/businesses?category=car_wash", icon: Droplets },
  { category: "insurance", title: "Featured Insurance", subtitle: "Coverage and automotive support", href: "/automotive-support", icon: Shield },
  { category: "other", title: "Other Featured Services", subtitle: "More automotive businesses", href: "/businesses", icon: MoreHorizontal },
];

const CATEGORIES = [
  { value: "car_dealer", label: "Car Dealers", icon: Car, href: "/automobile-dealers", color: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800" },
  { value: "garage", label: "Professional Garages", icon: Wrench, href: "/autogarage-repair", color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" },
  { value: "spare_parts", label: "Spare Parts", icon: Package, href: "/autospares-dealers", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800" },
  { value: "car_wash", label: "Car Wash", icon: Droplets, href: "/businesses?category=car_wash", color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800" },
  { value: "insurance", label: "Insurance", icon: Shield, href: "/automotive-support", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800" },
  { value: "other", label: "Other Services", icon: MoreHorizontal, href: "/businesses", color: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
];

const POPULAR_BRANDS = [
  { name: "Toyota", logo: "https://cdn.simpleicons.org/toyota" },
  { name: "Nissan", logo: "https://cdn.simpleicons.org/nissan" },
  { name: "Honda", logo: "https://cdn.simpleicons.org/honda" },
  { name: "Subaru", logo: "https://cdn.simpleicons.org/subaru" },
  { name: "Mazda", logo: "https://cdn.simpleicons.org/mazda" },
  { name: "Mitsubishi", logo: "https://cdn.simpleicons.org/mitsubishi" },
  { name: "BMW", logo: "https://cdn.simpleicons.org/bmw" },
  { name: "Hyundai", logo: "https://cdn.simpleicons.org/hyundai" },
  { name: "Land Rover", logo: "https://cdn.jsdelivr.net/npm/simple-icons/icons/landrover.svg" },
  { name: "Volkswagen", logo: "https://cdn.simpleicons.org/volkswagen" },
];

const STEPS = [
  { num: "01", title: "Business Registers", desc: "Car businesses register and submit their listing for review." },
  { num: "02", title: "Admin Approves", desc: "Our team reviews and approves legitimate businesses." },
  { num: "03", title: "Customers Connect", desc: "Users find and contact your business via phone or WhatsApp." },
];

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string };
type ServiceWithGarage = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string };
type RecentReview = { id: string; name: string; rating: number; comment: string; businessId: string; businessName: string; createdAt: string | Date | null };

export default function Home() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const SPOTLIGHT_LIMIT = 6;

  const { data: homeSections, isLoading: homeSectionsLoading } = useQuery<HomeSections>({
    queryKey: ["/api/businesses/home-sections?limit=6"],
    staleTime: 0,
  });

  const { data: premiumBusinesses, isLoading: premiumLoading } = useQuery<BusinessRated[]>({
    queryKey: ["/api/businesses/premium"],
    staleTime: 0,
  });

  /** Premium listings merged ahead of API sections so garages/spares show even if one endpoint is stale. */
  const spotlightByCategory = useMemo(() => {
    const out: Record<string, BusinessRated[]> = {};
    for (const block of HOME_SPOTLIGHT_SECTIONS) {
      const cat = block.category;
      const fromSections = homeSections?.[cat] ?? [];
      const premiumInCat = premiumBusinesses?.filter((b) => b.category === cat) ?? [];
      const seen = new Set<string>();
      const merged: BusinessRated[] = [];
      for (const b of premiumInCat) {
        if (merged.length >= SPOTLIGHT_LIMIT) break;
        if (!seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }
      for (const b of fromSections) {
        if (merged.length >= SPOTLIGHT_LIMIT) break;
        if (!seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }
      out[cat] = merged;
    }
    return out;
  }, [homeSections, premiumBusinesses]);

  const premiumByCategory = useMemo(() => {
    const map = new Map<string, BusinessRated[]>();
    if (!premiumBusinesses) return map;
    for (const b of premiumBusinesses) {
      const cur = map.get(b.category) ?? [];
      cur.push(b);
      map.set(b.category, cur);
    }
    return map;
  }, [premiumBusinesses]);

  const { data: featuredCars, isLoading: carsLoading } = useQuery<CarWithDealer[]>({
    queryKey: ["/api/cars/featured"],
  });

  const { data: popularServices, isLoading: servicesLoading } = useQuery<ServiceWithGarage[]>({
    queryKey: ["/api/services/popular"],
  });

  const { data: recentReviews, isLoading: reviewsLoading } = useQuery<RecentReview[]>({
    queryKey: ["/api/reviews/recent"],
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(search.trim() ? `/businesses?q=${encodeURIComponent(search.trim())}` : "/businesses");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── 1. HERO ── */}
      <section
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: "url(/hero-bg.jpeg)",
          backgroundSize: "cover",
          backgroundPosition: "center right",
        }}
      >
        {/* Dark gradient overlay — heavy on the left (text side), lighter on the right (car side) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
        {/* Subtle red tint on the left edge for brand color */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-transparent to-transparent" />
        {/* Fade into the page at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-950 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Trusted Car Services Near You
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 drop-shadow-lg" data-testid="hero-heading">
              All Your Automobile<br />Needs. One Platform.<br /><span className="text-orange-400">Your One-Stop Auto<br />Solution.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl drop-shadow leading-relaxed">
              Connect with verified dealers, spare parts shops &amp; garage services across Kenya's 47 counties.
            </p>
            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xl mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search businesses, spare parts, city..."
                  className="pl-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-0 shadow-lg h-12"
                  data-testid="input-search-hero"
                />
              </div>
              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-6 flex-shrink-0" data-testid="button-search-hero">
                Search
              </Button>
            </form>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/cars">
                <Button variant="outline" className="border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20" data-testid="button-browse-cars-hero">
                  <Car className="w-4 h-4 mr-1.5" />
                  Cars for Sale
                </Button>
              </Link>
              <Link href="/businesses">
                <Button variant="outline" className="border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20" data-testid="button-browse-hero">
                  Browse Businesses
                </Button>
              </Link>
              <Link href="/register-business">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg" data-testid="button-register-hero">
                  Register Your Business
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1b. TRUST / STATS BAR ── */}
      <section className="py-8 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "500+", label: "Businesses Listed", icon: Building2 },
              { num: "47", label: "Counties Covered", icon: MapPin },
              { num: "50+", label: "Car Brands", icon: Car },
              { num: "100%", label: "Verified Listings", icon: BadgeCheck },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-1">
                  <stat.icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">{stat.num}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. PREMIUM BUSINESSES ── */}
      {premiumBusinesses && premiumBusinesses.length > 0 && (
        <section className="py-14 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BadgeCheck className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Premium Businesses</h2>
                </div>
                <p className="text-muted-foreground">Verified and trusted premium automotive businesses</p>
              </div>
              <Link href="/businesses">
                <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all-premium">
                  View All <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-10">
              {PREMIUM_CATEGORY_ORDER.map(cat => {
                const list = premiumByCategory.get(cat);
                if (!list?.length) return null;
                return (
                  <div key={cat}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{PREMIUM_SECTION_TITLE[cat]}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {list.map(biz => (
                        <BusinessCard key={biz.id} business={biz} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. FEATURED BUSINESSES BY CATEGORY (premium listings appear first for every type) ── */}
      {HOME_SPOTLIGHT_SECTIONS.map((block, idx) => {
        const list = spotlightByCategory[block.category] ?? [];
        const Icon = block.icon;
        const striped = idx % 2 === 1;
        const emptyMessage =
          block.category === "spare_parts"
            ? "No spare parts shops listed yet."
            : block.category === "garage"
              ? "No garages listed yet."
              : block.category === "car_dealer"
                ? "No car dealers listed yet."
                : block.category === "car_wash"
                  ? "No car wash businesses listed yet."
                  : block.category === "insurance"
                    ? "No insurance listings yet."
                    : "No businesses in this category yet.";
        const emptyCta =
          block.category === "garage"
            ? "Register Your Garage"
            : block.category === "spare_parts"
              ? "Register Your Shop"
              : "Register Your Business";
        const testHeading =
          block.category === "spare_parts"
            ? "featured-products-heading"
            : block.category === "garage"
              ? "featured-garages-heading"
              : undefined;

        return (
          <section key={block.category} className={striped ? "py-14 bg-gray-50 dark:bg-gray-900" : "py-14"}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <h2
                    className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1"
                    {...(testHeading ? { "data-testid": testHeading } : {})}
                  >
                    {block.title}
                  </h2>
                  <p className="text-muted-foreground">{block.subtitle}</p>
                </div>
                <Link href={block.href}>
                  <Button variant="outline" className="flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              {list.length === 0 && (homeSectionsLoading || premiumLoading) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-md" />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <Icon className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-muted-foreground">{emptyMessage}</p>
                  <Link href="/register-business">
                    <Button variant="outline" className="mt-4">{emptyCta}</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map(biz => (
                    <BusinessCard key={biz.id} business={biz} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ── 4. CATEGORIES ── */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Browse by Category</h2>
          <p className="text-muted-foreground">Find the right automotive service for your needs</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <Link href={cat.href} key={cat.value}>
              <div
                className={`hover-elevate rounded-md border flex flex-col items-center gap-3 p-4 cursor-pointer transition-colors ${cat.color}`}
                data-testid={`card-category-${cat.value}`}
              >
                <div className="w-10 h-10 rounded-md bg-current/10 flex items-center justify-center">
                  <cat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-center leading-tight">{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 5. CAR BRANDS ── */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="brands-heading">Popular Car Brands</h2>
            <p className="text-muted-foreground">Browse cars by your favorite brand</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
            {POPULAR_BRANDS.map(brand => (
              <Link href={`/brand/${encodeURIComponent(brand.name)}`} key={brand.name}>
                <div
                  className="flex flex-col items-center gap-2.5 p-3 md:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-400 dark:hover:border-red-500 hover:shadow-md transition-all cursor-pointer group"
                  data-testid={`brand-${brand.name.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                    <img
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      className="w-full h-full object-contain"
                      onError={e => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-lg font-bold text-gray-400">${brand.name[0]}</span>`;
                        }
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 leading-tight">{brand.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FEATURED SERVICES ── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1" data-testid="popular-services-heading">Featured Services</h2>
              <p className="text-muted-foreground">Popular garage and automotive services</p>
            </div>
            <Link href="/garages/services">
              <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all-services">
                All Services <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-md" />)}
            </div>
          ) : popularServices && popularServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularServices.slice(0, 6).map(svc => <GarageServiceCard key={svc.id} service={svc} />)}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-muted-foreground">No services listed yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. FEATURED CARS ── */}
      <section className="py-14 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1" data-testid="featured-cars-heading">Featured Cars for Sale</h2>
              <p className="text-muted-foreground">Browse verified vehicles from trusted dealers</p>
            </div>
            <Link href="/cars">
              <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all-cars">
                View All Cars <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {carsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-md" />)}
            </div>
          ) : featuredCars && featuredCars.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredCars.slice(0, 6).map(car => <CarCard key={car.id} car={car} />)}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Car className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-muted-foreground">No car listings yet. Check back soon!</p>
              <Link href="/businesses?category=car_dealer">
                <Button variant="outline" className="mt-4">Browse Car Dealers</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 8. REVIEWS ── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="recent-reviews-heading">What Customers Say</h2>
            <p className="text-muted-foreground">Real reviews from verified customers</p>
          </div>
          {reviewsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md" />)}
            </div>
          ) : recentReviews && recentReviews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentReviews.slice(0, 6).map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No reviews yet. Be the first to review a business!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 9. HOW IT WORKS ── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-2">Simple Process</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Get your business in front of thousands of customers in three easy steps</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-red-200 via-red-400 to-red-200 dark:from-red-900 dark:via-red-700 dark:to-red-900" />
            {STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-7 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-5 shadow-lg shadow-red-200 dark:shadow-red-900/50 z-10">
                  <span className="text-white text-2xl font-black">{step.num}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <h3 className="font-bold text-gray-900 dark:text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="md:hidden w-5 h-5 text-red-400 mt-5 mx-auto" />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register-business">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8">
                Get Listed Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. CTA ── */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-red-800 via-red-700 to-red-900 text-white">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        {/* Decorative rings */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10 hidden lg:block" />
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full border border-white/10 hidden lg:block" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-white/10 hidden lg:block" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs font-semibold text-orange-300 uppercase tracking-widest mb-3">Start Today — It's Free</span>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Register Your Automotive Business Today</h2>
          <p className="text-red-100 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
            Reach thousands of customers across Kenya who are searching for trusted automotive services.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register-business">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-400 text-white px-10 text-base font-semibold shadow-xl shadow-red-900/50" data-testid="button-cta-register">
                Create Business Listing
              </Button>
            </Link>
            <Link href="/businesses">
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 px-10 text-base">
                Browse Businesses
              </Button>
            </Link>
          </div>
          <p className="text-red-300 text-sm mt-5">No payment required to register · Admin-reviewed listings</p>
        </div>
      </section>

    </div>
  );
}
