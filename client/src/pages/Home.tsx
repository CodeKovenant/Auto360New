import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Car, Wrench, Package, Droplets, Shield, MoreHorizontal, ChevronRight, CheckCircle, Building2, BadgeCheck, Store, MapPin, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import ReviewCard from "@/components/ReviewCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Business, Car as CarType, GarageService, SparePart, SupportService } from "@shared/schema";

type BusinessRated = Business & { avgRating: number; reviewCount: number; galleryImage: string | null };
type HomeSections = Record<string, BusinessRated[]>;

const HOME_SPOTLIGHT_SECTIONS: {
  category: "car_dealer" | "spare_parts" | "garage" | "automotive_support";
  businessCategories: readonly string[];
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { category: "car_dealer", businessCategories: ["car_dealer"], title: "Featured Car Dealers", subtitle: "Trusted dealers and showrooms near you", href: "/automobile-dealers", icon: Car },
  { category: "spare_parts", businessCategories: ["spare_parts"], title: "Featured AutoSpares", subtitle: "Genuine and quality parts for all vehicle makes", href: "/autospares-dealers", icon: Package },
  { category: "garage", businessCategories: ["garage"], title: "Featured Garages", subtitle: "Trusted mechanics and auto repair shops near you", href: "/autogarage-repair", icon: Wrench },
  { category: "automotive_support", businessCategories: ["car_wash", "insurance", "other"], title: "Featured Automotive Support Businesses", subtitle: "Featured automotive support providers across Kenya", href: "/automotive-support", icon: Shield },
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

const HERO_SERVICE_SLIDES = [
  { label: "Automobile Dealers", lead: "Automobile", accent: "Dealers" },
  { label: "Autospares Dealers", lead: "Autospares", accent: "Dealers" },
  { label: "Autogarage Repair", lead: "Autogarage", accent: "Repair" },
  { label: "Automotive Support", lead: "Automotive", accent: "Support" },
] as const;

type CarWithDealer = CarType & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null; dealerBanner: string | null; galleryImage: string | null };
type ServiceWithGarage = GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; garageBanner: string | null; galleryImage: string | null };
type RecentReview = { id: string; name: string; rating: number; comment: string; businessId: string; businessName: string; createdAt: string | Date | null };

type FeaturedSparePart = SparePart & { businessName: string; businessCity: string; businessLogo: string | null; businessBanner: string | null; galleryImage: string | null };
type FeaturedSupportService = SupportService & { businessName: string; businessCity: string; businessLogo: string | null; businessBanner: string | null; businessSubcategory: string | null; galleryImage: string | null };
type FeaturedHomeOffers = { spareParts: FeaturedSparePart[]; supportServices: FeaturedSupportService[] };

type FeaturedListingCardProps = {
  label: string;
  title: string;
  details?: string | null;
  business?: string | null;
  image?: string | null;
  price?: string | null;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
  testId: string;
  isFeatured?: boolean;
};

function formatFeaturedPrice(price: string | number | null | undefined) {
  if (price === null || price === undefined || String(price).trim() === "") return null;
  const value = String(price).trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return "KSh " + Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 });
  }
  return value;
}

function FeaturedListingCard({ label, title, details, business, image, price, href, icon, actionLabel, testId, isFeatured = false }: FeaturedListingCardProps) {
  const Icon = icon;
  return (
    <Link href={href} className="group block h-full">
      <article className="flex h-[370px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950" data-testid={testId}>
        <div className="relative h-40 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {image ? (
            <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm dark:bg-gray-950/90 dark:text-gray-100">{label}</span>
          {isFeatured && <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 shadow-sm">★ Featured</span>}
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <h3 className="h-[2.75rem] shrink-0 line-clamp-2 font-bold leading-snug text-gray-900 dark:text-white">{title}</h3>
          <div className="mt-2 h-10 shrink-0">
            {details && <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{details}</p>}
          </div>
          <div className="mt-2 h-4 shrink-0">
            {business && <p className="line-clamp-1 text-xs font-medium text-gray-600 dark:text-gray-300">{business}</p>}
          </div>
          <div className="mt-auto flex items-end justify-between gap-2 pt-4">
            {price ? <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{price}</p> : <span className="text-xs text-gray-400">See available listings</span>}
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-red-600 transition-colors group-hover:text-red-700 dark:text-red-400">{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </article>
    </Link>
  );
}
export default function Home() {
  const [search, setSearch] = useState("");
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroSlidePhase, setHeroSlidePhase] = useState<"idle" | "leaving" | "off-right" | "entering">("idle");
  const [, navigate] = useLocation();
  const activeHeroSlide = HERO_SERVICE_SLIDES[heroSlideIndex];

  useEffect(() => {
    let exitTimeout: number | undefined;
    let offRightFrame: number | undefined;
    let enterFrame: number | undefined;
    const interval = window.setInterval(() => {
      setHeroSlidePhase("leaving");
      exitTimeout = window.setTimeout(() => {
        setHeroSlideIndex((current) => (current + 1) % HERO_SERVICE_SLIDES.length);
        setHeroSlidePhase("off-right");
        offRightFrame = window.requestAnimationFrame(() => {
          enterFrame = window.requestAnimationFrame(() => setHeroSlidePhase("entering"));
        });
      }, 750);
    }, 5000);

    return () => {
      window.clearInterval(interval);
      if (exitTimeout !== undefined) window.clearTimeout(exitTimeout);
      if (offRightFrame !== undefined) window.cancelAnimationFrame(offRightFrame);
      if (enterFrame !== undefined) window.cancelAnimationFrame(enterFrame);
    };
  }, []);

  const SPOTLIGHT_LIMIT = 6;

  const { data: homeSections, isLoading: homeSectionsLoading } = useQuery<HomeSections>({
    queryKey: ["/api/businesses/home-sections?limit=6"],
    staleTime: 0,
  });

  const { data: premiumBusinesses, isLoading: premiumLoading } = useQuery<BusinessRated[]>({
    queryKey: ["/api/businesses/premium"],
    staleTime: 0,
  });

  /** Site-wide Featured and Homepage Premium are independent statuses. */
  const spotlightByCategory = useMemo(() => {
    const out: Record<string, BusinessRated[]> = {};
    for (const block of HOME_SPOTLIGHT_SECTIONS) {
      const seen = new Set<string>();
      const merged: BusinessRated[] = [];
      for (const category of block.businessCategories) {
        const featuredInCategory = (homeSections?.[category] ?? []).filter(business => business.featured);
        for (const business of featuredInCategory) {
          if (merged.length >= SPOTLIGHT_LIMIT) break;
          if (!seen.has(business.id)) {
            seen.add(business.id);
            merged.push(business);
          }
        }
      }
      out[block.category] = merged;
    }
    return out;
  }, [homeSections]);

  const premiumFeaturedBusinesses = premiumBusinesses ?? [];

  const { data: featuredCars, isLoading: carsLoading } = useQuery<CarWithDealer[]>({
    queryKey: ["/api/cars/featured"],
  });

  const { data: featuredGarageServices, isLoading: servicesLoading } = useQuery<ServiceWithGarage[]>({
    queryKey: ["/api/services/featured"],
  });
  const { data: featuredHomeOffers, isLoading: featuredOffersLoading } = useQuery<FeaturedHomeOffers>({
    queryKey: ["/api/home/featured-offers"],
    staleTime: 0,
  });

  const { data: recentReviews, isLoading: reviewsLoading } = useQuery<RecentReview[]>({
    queryKey: ["/api/reviews/recent"],
  });

  const featuredListings: FeaturedListingCardProps[] = [
    ...(featuredCars ?? []).map((car, index) => ({
      label: "Car for sale",
      title: car.title,
      details: [car.year, car.condition === "new" ? "Brand new" : "Used"].join(" · "),
      business: car.dealerName + " · " + car.location,
      image: car.images?.[0] || car.galleryImage || car.dealerBanner || car.dealerLogo,
      price: formatFeaturedPrice(car.price),
      href: "/cars/" + car.id,
      icon: Car,
      actionLabel: "View listing",
      testId: index === 0 ? "featured-home-car" : `featured-home-car-${car.id}`,
      isFeatured: true,
    })),
    ...(featuredHomeOffers?.spareParts ?? []).map((part, index) => ({
      label: "Spare part",
      title: part.partName,
      details: [part.carBrand, part.carModel, part.condition === "new" ? "New" : "Used"].join(" · "),
      business: part.businessName + " · " + part.businessCity,
      image: part.galleryImage || part.image || part.businessBanner || part.businessLogo,
      price: formatFeaturedPrice(part.price),
      href: "/parts/" + part.id,
      icon: Package,
      actionLabel: "View listing",
      testId: index === 0 ? "featured-home-spare-part" : `featured-home-spare-part-${part.id}`,
      isFeatured: true,
    })),
    ...(featuredGarageServices ?? []).map((service, index) => ({
      label: "Garage service",
      title: service.name,
      details: service.description || undefined,
      business: service.garageName + " · " + service.garageCity,
      image: service.galleryImage || service.garageBanner || service.garageLogo,
      price: formatFeaturedPrice(service.price),
      href: "/services/" + service.id,
      icon: Wrench,
      actionLabel: "View listing",
      testId: index === 0 ? "featured-home-garage-service" : `featured-home-garage-service-${service.id}`,
      isFeatured: true,
    })),
    ...(featuredHomeOffers?.supportServices ?? []).map((service, index) => {
      const isVehicleFinance = service.businessSubcategory === "vehicle_finance" ||
        /loan|financ/i.test(service.name + " " + (service.description || ""));
      return {
        label: isVehicleFinance ? "Vehicle finance" : "Automotive support",
        title: service.name,
        details: service.description || "Support from an approved automotive provider",
        business: service.businessName + " · " + service.businessCity,
        image: service.galleryImage || service.businessBanner || service.businessLogo,
        price: formatFeaturedPrice(service.startingPrice),
        href: "/support-services/" + service.id,
        icon: Shield,
        actionLabel: "View listing",
        testId: index === 0 ? "featured-home-support-service" : `featured-home-support-service-${service.id}`,
        isFeatured: true,
      };
    }),
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(search.trim() ? `/businesses?q=${encodeURIComponent(search.trim())}` : "/businesses");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[85vh] overflow-hidden bg-gray-950 text-white">
        <div
          className={`hero-banner-slide relative flex min-h-[85vh] items-center justify-start text-left hero-banner-slide--${heroSlidePhase}`}
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

          <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
            <div className="w-full max-w-3xl text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium mb-5 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Trusted Car Services Near You
              </div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-5 drop-shadow-lg"
                data-testid="hero-heading"
                aria-label={activeHeroSlide.label}
              >
                {activeHeroSlide.lead}{" "}
                <span className="text-orange-400">{activeHeroSlide.accent}</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-xl drop-shadow leading-relaxed">
                Connect with verified dealers, spare parts shops &amp; garage services across Kenya's 47 counties.
              </p>
              <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-xl mb-6">
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
                  <Button variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20" data-testid="button-browse-cars-hero">
                    <Car className="w-4 h-4 mr-1.5" />
                    Cars for Sale
                  </Button>
                </Link>
                <Link href="/businesses">
                  <Button variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20" data-testid="button-browse-hero">
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
        </div>
      </section>

      {/* ── 1a. TRUST / STATS BAR ── */}
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

      {/* ── 1b. FEATURED PRODUCTS & SERVICES ── */}
      {(carsLoading || servicesLoading || featuredOffersLoading || featuredListings.length > 0) && (
        <section className="py-12 bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Featured Products &amp; Services</h2>
                <p className="text-muted-foreground">Featured cars, spare parts, garage services, and automotive support listings from approved businesses.</p>
              </div>
              <Link href="/businesses">
                <Button variant="outline" className="flex items-center gap-1">View all featured listings <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            {carsLoading || servicesLoading || featuredOffersLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
              </div>
            ) : (
              <Carousel autoScroll opts={{ align: "start" }} className="px-1 pb-16" data-testid="featured-products-carousel">
                <CarouselContent>
                  {featuredListings.map(listing => (
                    <CarouselItem key={listing.testId} className="basis-[88%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <FeaturedListingCard {...listing} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </div>
        </section>
      )}

      {/* ── 2. PREMIUM BUSINESSES ── */}
      {premiumFeaturedBusinesses.length > 0 && (
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
                  View all Premium Businesses <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <Carousel autoScroll opts={{ align: "start" }} className="px-1 pb-10" data-testid="premium-businesses-carousel">
              <CarouselContent>
                {premiumFeaturedBusinesses.map(business => (
                  <CarouselItem key={business.id} className="basis-[88%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <BusinessCard business={business} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {premiumFeaturedBusinesses.length > 1 && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          </div>
        </section>
      )}

      {/* ── 3. SITE-WIDE FEATURED BUSINESSES BY CATEGORY ── */}
      {HOME_SPOTLIGHT_SECTIONS.map(block => {
        const list = spotlightByCategory[block.category] ?? [];
        const Icon = block.icon;
        const emptyMessage = block.category === "spare_parts"
          ? "No spare parts shops listed yet."
          : block.category === "garage"
            ? "No garages listed yet."
            : block.category === "automotive_support"
              ? "No automotive support businesses featured yet."
              : "No car dealers listed yet.";
        const emptyCta =
          block.category === "garage"
            ? "Register Your Garage"
            : block.category === "spare_parts"
              ? "Register Your Shop"
              : block.category === "automotive_support"
                ? "Register Your Business"
              : "Register Your Business";
        const testHeading = block.category === "spare_parts"
          ? "featured-products-heading"
          : block.category === "garage"
            ? "featured-garages-heading"
            : block.category === "automotive_support"
              ? "featured-automotive-support-heading"
            : undefined;

        return (
          <section key={block.category} className="py-14">
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
                    View all {block.title} <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              {list.length === 0 && homeSectionsLoading ? (
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
                <Carousel autoScroll opts={{ align: "start" }} className="px-1 pb-16" data-testid={`featured-${block.category}-carousel`}>
                  <CarouselContent>
                    {list.map(biz => (
                      <CarouselItem key={biz.id} className="basis-[88%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <BusinessCard business={biz} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {list.length > 1 && (
                    <>
                      <CarouselPrevious />
                      <CarouselNext />
                    </>
                  )}
                </Carousel>
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

      {/* ── 6. REVIEWS ── */}
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

      {/* ── 7. HOW IT WORKS ── */}
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

      {/* ── 8. CTA ── */}
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
