import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Car, Wrench, Package, Droplets, Shield, MoreHorizontal, ChevronRight, CheckCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BusinessCard from "@/components/BusinessCard";
import type { Business } from "@shared/schema";

const CATEGORIES = [
  { value: "car_dealer", label: "Car Dealers", icon: Car, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800" },
  { value: "garage", label: "Professional Garages", icon: Wrench, color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" },
  { value: "spare_parts", label: "Spare Parts", icon: Package, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800" },
  { value: "car_wash", label: "Car Wash", icon: Droplets, color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800" },
  { value: "insurance", label: "Insurance", icon: Shield, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800" },
  { value: "other", label: "Other Services", icon: MoreHorizontal, color: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
];

const STEPS = [
  { num: "01", title: "Business Registers", desc: "Car businesses register and submit their listing for review." },
  { num: "02", title: "Admin Approves", desc: "Our team reviews and approves legitimate businesses." },
  { num: "03", title: "Customers Connect", desc: "Users find and contact your business via phone or WhatsApp." },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: businesses } = useQuery<(Business & { avgRating: number; reviewCount: number })[]>({
    queryKey: ["/api/businesses/featured"],
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/businesses?q=${encodeURIComponent(search.trim())}`);
    } else {
      navigate("/businesses");
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-950 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Trusted Car Services Near You
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5" data-testid="hero-heading">
              Find Trusted Car Services
              <span className="block text-orange-400">Near You</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl">
              Dealers, garages, spare parts, car wash and more — all in one place.
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
              <Button type="submit" size="lg" className="bg-orange-500 text-white h-12 px-6 flex-shrink-0" data-testid="button-search-hero">
                Search
              </Button>
            </form>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/businesses">
                <Button variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm" data-testid="button-browse-hero">
                  Browse Businesses
                </Button>
              </Link>
              <Link href="/register-business">
                <Button className="bg-orange-500 text-white" data-testid="button-register-hero">
                  Register Your Business
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
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

      {/* Featured Businesses */}
      <section className="py-14 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">Featured Businesses</h2>
              <p className="text-muted-foreground">Trusted and verified car service providers</p>
            </div>
            <Link href="/businesses">
              <Button variant="outline" className="flex items-center gap-1" data-testid="button-view-all">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {businesses && businesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.slice(0, 6).map(biz => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-muted-foreground">No businesses listed yet. Be the first!</p>
              <Link href="/register-business">
                <Button className="mt-4 bg-orange-500 text-white">Register Your Business</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">How It Works</h2>
          <p className="text-muted-foreground">Simple process to get your business listed</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-start p-6 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-4xl font-black text-blue-100 dark:text-blue-900 mb-3">{step.num}</span>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-gradient-to-r from-blue-800 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Register Your Car Business Today</h2>
          <p className="text-blue-100 mb-7 max-w-lg mx-auto">
            Reach thousands of customers looking for trusted automotive services.
          </p>
          <Link href="/register-business">
            <Button size="lg" className="bg-orange-500 text-white px-8" data-testid="button-cta-register">
              Create Business Listing
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">AutoDirectory</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AutoDirectory. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
