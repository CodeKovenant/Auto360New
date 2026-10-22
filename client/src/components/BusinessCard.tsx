import { Link } from "wouter";
import { MapPin, MessageCircle, Building2, BadgeCheck, ArrowRight, Star } from "lucide-react";
import StarRating from "./StarRating";
import type { Business } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

interface BusinessCardProps {
  business: Business & { avgRating?: number; reviewCount?: number; galleryImage?: string | null };
}

function getCategoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find(c => c.value === cat)?.label || cat;
}

const CATEGORY_STYLES: Record<string, { pill: string; bar: string }> = {
  car_dealer:  { pill: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",     bar: "bg-red-500" },
  garage:      { pill: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", bar: "bg-green-500" },
  spare_parts: { pill: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", bar: "bg-orange-500" },
  car_wash:    { pill: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",  bar: "bg-cyan-500" },
  insurance:   { pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", bar: "bg-purple-500" },
  other:       { pill: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",     bar: "bg-gray-400" },
};

export default function BusinessCard({ business }: BusinessCardProps) {
  const style = CATEGORY_STYLES[business.category] ?? CATEGORY_STYLES.other;

  return (
    <div
      className="group relative flex h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
      data-testid={`card-business-${business.id}`}
    >
      {/* Category accent bar */}
      <div className={`h-1 w-full ${style.bar}`} />

      <Link href={`/business/${business.id}`} className="group/image relative block h-44 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {business.galleryImage || business.banner ? (
          <img src={business.galleryImage || business.banner || ""} alt={business.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover/image:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-800">
            <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
          <span className={`inline-flex max-w-[70%] items-center truncate rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${style.pill}`}>
            {getCategoryLabel(business.category)}
          </span>
          {business.featured && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-950/10" aria-hidden="true">
                <Star className="h-2.5 w-2.5 fill-amber-50 text-amber-900" />
              </span>
              Featured
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/business/${business.id}`} className="flex flex-col flex-1">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 dark:text-white">
              {business.name}
              {business.premium && (
                <span title="Premium Business">
                  <BadgeCheck className="ml-1 inline-block h-4 w-4 text-yellow-500" aria-hidden="true" data-testid={`icon-premium-${business.id}`} />
                </span>
              )}
            </h3>
            <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{getCategoryLabel(business.category)}</span>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-xs text-gray-600 dark:text-gray-300">{business.city}</span>
          </div>
          {(business.avgRating !== undefined && business.avgRating > 0) ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <StarRating rating={Math.round(business.avgRating)} size="sm" />
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                {business.avgRating.toFixed(1)} <span className="font-normal text-gray-400">({business.reviewCount || 0})</span>
              </span>
            </div>
          ) : (
            <span className="shrink-0 text-[11px] text-gray-400">No reviews yet</span>
          )}
        </div>

        <p className="mt-3 min-h-10 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {business.description}
        </p>
        </Link>

        <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          {business.whatsapp?.trim() && (
          <a
            href={`https://wa.me/${business.whatsapp?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
            data-testid={`link-whatsapp-${business.id}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          )}
          <Link
            href={`/business/${business.id}`}
            className="group/btn flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            data-testid={`button-view-${business.id}`}
          >
            View Profile
            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
