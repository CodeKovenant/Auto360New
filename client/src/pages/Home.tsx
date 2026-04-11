import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Car, Wrench, Package, Droplets, Shield, MoreHorizontal, ChevronRight, CheckCircle, Building2, BadgeCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessCard from "@/components/BusinessCard";
import CarCard from "@/components/CarCard";
import GarageServiceCard from "@/components/GarageServiceCard";
import ReviewCard from "@/components/ReviewCard";
import type { Business, Car as CarType, GarageService } from "@shared/schema";

const CATEGORIES = [
  { value: "car_dealer", label: "Car Dealers", icon: Car, color: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800" },
  { value: "garage", label: "Professional Garages", icon: Wrench, color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" },
  { value: "spare_parts", label: "Spare Parts", icon: Package, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800" },
  { value: "car_wash", label: "Car Wash", icon: Droplets, color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800" },
  { value: "insurance", label: "Insurance", icon: Shield, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800" },
  { value: "other", label: "Other Services", icon: MoreHorizontal, color: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
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

  const { data: businesses } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: ["/api/businesses/featured"],
  });

  const { data: premiumBusinesses } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: ["/api/businesses/premium"],
  });

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

  const sparePartsBusinesses = businesses?.filter(b => b.category === "spare_parts") ?? [];
  const garageBusinesses = businesses?.filter(b => b.category === "garage") ?? [];

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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-5 drop-shadow-lg" data-testid="hero-heading">
              All Your Automobile Needs. One Platform.
              <span className="block text-orange-400">Your One-Stop Auto Solution.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl drop-shadow">
              Connect with trusted dealers, spare parts &amp; garage services near you.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {premiumBusinesses.map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. CATEGORIES ── */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Browse by Category</h2>
          <p className="text-muted-foreground">Find the right automotive service for your needs</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <Link href={`/businesses?category=${cat.value}`} key={cat.value}>
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

      {/* ── 4. CAR BRANDS ── */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="brands-heading">Popular Car Brands</h2>
            <p className="text-muted-foreground">Browse cars by your favorite brand</p>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
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

      {/* ── 5. FEATURED PRODUCTS (Spare Parts) ── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1" data-testid="featured-products-heading">Featured Spare Parts Shops</h2>
              <p className="text-muted-foreground">Genuine and quality parts for all vehicle makes</p>
            </div>
            <Link href="/businesses?category=spare_parts">
              <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all-parts">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {sparePartsBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sparePartsBusinesses.slice(0, 6).map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-muted-foreground">No spare parts shops listed yet.</p>
              <Link href="/register-business">
                <Button variant="outline" className="mt-4">Register Your Shop</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. FEATURED GARAGES ── */}
      <section className="py-14 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1" data-testid="featured-garages-heading">Featured Garages</h2>
              <p className="text-muted-foreground">Trusted mechanics and auto repair shops near you</p>
            </div>
            <Link href="/businesses?category=garage">
              <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all-garages">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {garageBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {garageBusinesses.slice(0, 6).map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-muted-foreground">No garages listed yet.</p>
              <Link href="/register-business">
                <Button variant="outline" className="mt-4">Register Your Garage</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. FEATURED SERVICES ── */}
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

      {/* ── 8. FEATURED CARS ── */}
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

      {/* ── 9. REVIEWS ── */}
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

      {/* ── 10. HOW IT WORKS ── */}
      <section className="py-14 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">How It Works</h2>
            <p className="text-muted-foreground">Simple process to get your business listed</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-start p-6 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <span className="text-4xl font-black text-red-100 dark:text-red-900 mb-3">{step.num}</span>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. CTA ── */}
      <section className="py-14 bg-gradient-to-r from-red-800 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Register Your Automotive Business Today</h2>
          <p className="text-orange-100 mb-7 max-w-lg mx-auto">
            Reach thousands of customers looking for trusted automotive services.
          </p>
          <Link href="/register-business">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8" data-testid="button-cta-register">
              Create Business Listing
            </Button>
          </Link>
        </div>
      </section>

      {/* ── 12. FOOTER ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <Link href="/">
              <img src="/logo.png" alt="Auto360" className="h-9 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-6 flex-wrap">
              <Link href="/businesses?category=car_dealer" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Car Dealers</Link>
              <Link href="/businesses?category=spare_parts" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Spare Parts</Link>
              <Link href="/businesses?category=garage" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Garages</Link>
              <Link href="/automotive-support" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Automotive Support</Link>
              <Link href="/cars" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Cars for Sale</Link>
              <Link href="/register-business" className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">Register</Link>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Auto360 Kenya. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">hello@auto360.co.ke</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
