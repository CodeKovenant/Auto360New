import { Link } from "wouter";
import { MapPin, MessageCircle, Building2, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StarRating from "./StarRating";
import type { Business } from "@shared/schema";
import { BUSINESS_CATEGORIES } from "@shared/schema";

interface BusinessCardProps {
  business: Business & { avgRating?: number; reviewCount?: number };
}

function getCategoryLabel(cat: string) {
  return BUSINESS_CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function getCategoryColor(cat: string) {
  const colors: Record<string, string> = {
    car_dealer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    garage: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    spare_parts: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    car_wash: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    insurance: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return colors[cat] || colors.other;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-business-${business.id}`}>
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">{business.name}</h3>
                  {business.premium && (
                    <BadgeCheck className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Premium Business" data-testid={`icon-premium-${business.id}`} />
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getCategoryColor(business.category)}`}>
                  {getCategoryLabel(business.category)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">{business.city}</span>
              </div>
              {(business.avgRating !== undefined && business.avgRating > 0) ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StarRating rating={Math.round(business.avgRating)} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {business.avgRating.toFixed(1)} ({business.reviewCount || 0} reviews)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5">No reviews yet</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{business.description}</p>
        </div>
        <div className="border-t border-card-border px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
          <a
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium"
            data-testid={`link-whatsapp-${business.id}`}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
          <Link href={`/business/${business.id}`}>
            <Button size="sm" variant="outline" data-testid={`button-view-${business.id}`}>View Profile</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
