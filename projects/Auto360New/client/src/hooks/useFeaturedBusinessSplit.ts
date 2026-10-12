import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Business } from "@shared/schema";

export type RatedBusiness = Business & {
  avgRating: number;
  reviewCount: number;
};

export function useFeaturedBusinessSplit(businesses: RatedBusiness[] | undefined) {
  const { data: premiumBusinesses, isLoading: isFeaturedLoading } = useQuery<RatedBusiness[]>({
    queryKey: ["/api/businesses/premium"],
  });

  const visibleBusinessIds = useMemo(
    () => new Set((businesses ?? []).map((business) => business.id)),
    [businesses],
  );

  const featuredBusinesses = useMemo(
    () => (premiumBusinesses ?? []).filter((business) => visibleBusinessIds.has(business.id)),
    [premiumBusinesses, visibleBusinessIds],
  );

  const featuredBusinessIds = useMemo(
    () => new Set(featuredBusinesses.map((business) => business.id)),
    [featuredBusinesses],
  );

  const regularBusinesses = useMemo(
    () => (businesses ?? []).filter((business) => !featuredBusinessIds.has(business.id)),
    [businesses, featuredBusinessIds],
  );

  return { featuredBusinesses, regularBusinesses, isFeaturedLoading };
}
