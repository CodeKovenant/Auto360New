import { Star } from "lucide-react";
import type { Business } from "@shared/schema";
import BusinessCard from "@/components/BusinessCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type RatedBusiness = Business & { avgRating: number; reviewCount: number };

interface FeaturedBusinessCarouselProps {
  businesses: RatedBusiness[];
  title: string;
}

export default function FeaturedBusinessCarousel({ businesses, title }: FeaturedBusinessCarouselProps) {
  if (businesses.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="featured-businesses-heading" data-testid="featured-businesses-section">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden="true" />
        <div>
          <h2 id="featured-businesses-heading" className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {businesses.length} featured listing{businesses.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <Carousel opts={{ align: "start" }} className="px-1 pb-12" data-testid="featured-businesses-carousel">
        <CarouselContent>
          {businesses.map((business) => (
            <CarouselItem key={business.id} className="basis-[88%] sm:basis-1/2 lg:basis-1/3">
              <BusinessCard business={business} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {businesses.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </section>
  );
}
