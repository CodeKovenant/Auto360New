import { BadgeCheck, Star } from "lucide-react";
import type { RatedBusiness } from "@/hooks/useFeaturedBusinessSplit";
import BusinessCard from "@/components/BusinessCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type FeaturedBusinessCarouselProps = {
  businesses: RatedBusiness[];
  title: string;
  tone?: "red" | "orange" | "green" | "blue";
};

const TONE_STYLES = {
  red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
};

export default function FeaturedBusinessCarousel({
  businesses,
  title,
  tone = "red",
}: FeaturedBusinessCarouselProps) {
  if (businesses.length === 0) return null;

  return (
    <section className="mb-9" aria-label={title} data-testid="featured-businesses-section">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[tone]}`}>
            <Star className="h-5 w-5 fill-current" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm text-muted-foreground">Highlighted listings from trusted providers</p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 sm:inline-flex">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          Featured
        </span>
      </div>

      <div className="relative px-0 sm:px-10">
        <Carousel
          opts={{ align: "start", loop: false }}
          aria-label={title}
          data-testid="featured-businesses-carousel"
        >
          <CarouselContent className="-ml-4">
            {businesses.map((business) => (
              <CarouselItem
                key={business.id}
                className="basis-[88%] sm:basis-1/2 lg:basis-1/3"
              >
                <BusinessCard business={business} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {businesses.length > 1 && (
            <>
              <CarouselPrevious
                aria-label="Previous featured listings"
                className="left-1 z-10 border-gray-200 bg-white/95 shadow-md dark:border-gray-700 dark:bg-gray-900/95"
              />
              <CarouselNext
                aria-label="Next featured listings"
                className="right-1 z-10 border-gray-200 bg-white/95 shadow-md dark:border-gray-700 dark:bg-gray-900/95"
              />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
}
