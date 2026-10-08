import { Link } from "wouter";
import { MapPin, MessageCircle, Building2, BadgeCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StarRating from "./StarRating";
import type { Business } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

interface BusinessCardProps {
  business: Business & { avgRating?: number; reviewCount?: number };
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
      className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
      data-testid={`card-business-${business.id}`}
    >
      {/* Category accent bar */}
      <div className={`h-1 w-full ${style.bar}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug truncate pr-1">
                {business.name}
                {business.premium && (
                  <BadgeCheck className="inline-block w-4 h-4 text-yellow-500 ml-1 mb-0.5" title="Premium Business" data-testid={`icon-premium-${business.id}`} />
                )}
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${style.pill}`}>
                {getCategoryLabel(business.category)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{business.city}</span>
            </div>
            {(business.avgRating !== undefined && business.avgRating > 0) ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <StarRating rating={Math.round(business.avgRating)} size="sm" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {business.avgRating.toFixed(1)} <span className="text-gray-400">({business.reviewCount || 0})</span>
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-400 mt-1.5 block">No reviews yet</span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed flex-1">
          {business.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <a
            href={`https://wa.me/${business.whatsapp?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 px-3 py-1.5 rounded-lg transition-colors"
            data-testid={`link-whatsapp-${business.id}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <Link href={`/business/${business.id}`} className="flex-1">
            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors group/btn"
              data-testid={`button-view-${business.id}`}
            >
              View Profile
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
