import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Wrench, Building2, MessageCircle, ChevronDown, ChevronUp, Images, Flame } from "lucide-react";
import BusinessGallery from "@/components/BusinessGallery";
import type { GarageService } from "@shared/schema";

interface GarageServiceCardProps {
  service: GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo?: string | null };
  garageId?: string;
  canManage?: boolean;
}

export default function GarageServiceCard({ service, garageId, canManage = false }: GarageServiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
        expanded
          ? "border-orange-200 dark:border-orange-800 shadow-md"
          : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
      }`}
      data-testid={`card-service-${service.id}`}
    >
      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div
          className="flex items-start gap-3 mb-3 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
          data-testid={`toggle-service-${service.id}`}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-200 dark:shadow-none overflow-hidden">
            {service.garageLogo ? (
              <img src={service.garageLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Wrench className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <Link
                href={`/business/${service.garageId}`}
                onClick={e => e.stopPropagation()}
                className="flex-1 min-w-0"
              >
                <h3
                  className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-1"
                  data-testid={`service-name-${service.id}`}
                >
                  {service.name}
                </h3>
              </Link>
              {service.popular && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 flex-shrink-0">
                  <Flame className="w-2.5 h-2.5" /> Popular
                </span>
              )}
            </div>
          </div>
          <button
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Description */}
        {service.description && (
          <p className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3 ${expanded ? "" : "line-clamp-2"}`}>
            {service.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Wrench className="w-3 h-3 text-orange-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{service.garageName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 text-orange-400" />
            {service.garageCity}
          </div>
        </div>

        {service.price && (
          <div className="mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Starting from</span>
            <p className="text-xl font-extrabold text-orange-500 dark:text-orange-400 leading-none mt-0.5" data-testid={`service-price-${service.id}`}>
              {service.price}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link href={`/business/${service.garageId}`} className="flex-1">
            <button
              className="w-full text-xs font-semibold py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`button-contact-service-${service.id}`}
            >
              Contact Garage
            </button>
          </Link>
          {service.garageWhatsapp && (
            <a
              href={`https://wa.me/${service.garageWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I need help with: ${service.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`button-whatsapp-service-${service.id}`}
            >
              <button className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm shadow-green-200 dark:shadow-none">
                <MessageCircle className="w-4 h-4" />
              </button>
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
              expanded
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                : "text-gray-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
            data-testid={`button-expand-service-${service.id}`}
          >
            <Images className="w-3.5 h-3.5" />
            Photos
          </button>
        </div>

        {/* Gallery */}
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
      </div>
    </div>
  );
}
