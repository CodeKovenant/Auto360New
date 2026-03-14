import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Wrench, MessageCircle, ChevronDown, ChevronUp, Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BusinessGallery from "@/components/BusinessGallery";
import type { GarageService } from "@shared/schema";

interface GarageServiceCardProps {
  service: GarageService & { garageName: string; garageWhatsapp: string; garageCity: string };
  garageId?: string;
  canManage?: boolean;
}

export default function GarageServiceCard({ service, garageId, canManage = false }: GarageServiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`flex flex-col transition-shadow duration-200 ${expanded ? "shadow-md ring-1 ring-orange-200 dark:ring-orange-800" : "hover-elevate"}`}
      data-testid={`card-service-${service.id}`}
    >
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header row — icon + title + expand toggle */}
        <div
          className="flex items-start gap-3 mb-3 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
          data-testid={`toggle-service-${service.id}`}
        >
          <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Clickable title → business profile */}
            <Link
              href={`/business/${service.garageId}`}
              onClick={e => e.stopPropagation()}
            >
              <h3
                className="font-semibold text-gray-900 dark:text-white text-base leading-tight hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                data-testid={`service-name-${service.id}`}
              >
                {service.name}
              </h3>
            </Link>
            {service.popular && (
              <Badge className="mt-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Popular</Badge>
            )}
          </div>
          {/* Expand toggle */}
          <button
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Description — always visible (2 lines collapsed, full when expanded) */}
        {service.description && (
          <p className={`text-sm text-muted-foreground mb-3 ${expanded ? "" : "line-clamp-2"}`}>
            {service.description}
          </p>
        )}

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{service.garageName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{service.garageCity}</span>
          </div>
          {service.price && (
            <p className="text-base font-bold text-orange-600 dark:text-orange-400" data-testid={`service-price-${service.id}`}>
              From {service.price}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-auto flex-wrap">
          <Link href={`/business/${service.garageId}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full" data-testid={`button-contact-service-${service.id}`}>
              Contact Garage
            </Button>
          </Link>
          {service.garageWhatsapp && (
            <a
              href={`https://wa.me/${service.garageWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I need help with: ${service.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`button-whatsapp-service-${service.id}`}
            >
              <Button size="sm" className="bg-green-600 text-white">
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
              expanded
                ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20"
                : "text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10"
            }`}
            data-testid={`button-expand-service-${service.id}`}
          >
            <Images className="w-3.5 h-3.5" />
            Photos
          </button>
        </div>

        {/* Gallery — only visible when expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <BusinessGallery
              entityType="garage_service"
              entityId={service.id}
              canManage={canManage}
              title="Service Photos"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
