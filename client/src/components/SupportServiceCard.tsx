import { Phone, MessageCircle, Shield, Droplets, Star } from "lucide-react";
import type { SupportService } from "@shared/schema";

interface SupportServiceCardProps {
  service: SupportService;
  businessName: string;
  businessPhone: string;
  businessWhatsapp: string;
}

function getServiceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("insurance") || lower.includes("cover") || lower.includes("comprehensive") || lower.includes("third")) {
    return { icon: Shield, bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" };
  }
  if (lower.includes("wash") || lower.includes("clean") || lower.includes("detail") || lower.includes("wax") || lower.includes("polish")) {
    return { icon: Droplets, bg: "bg-cyan-100 dark:bg-cyan-900/30", color: "text-cyan-600 dark:text-cyan-400" };
  }
  return { icon: Star, bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-500 dark:text-orange-400" };
}

export default function SupportServiceCard({ service, businessName, businessPhone, businessWhatsapp }: SupportServiceCardProps) {
  const waMessage = `Hi, I'm interested in your "${service.name}" service. Please provide more details.`;
  const waLink = `https://wa.me/${businessWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`;
  const { icon: ServiceIcon, bg, color } = getServiceIcon(service.name);

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col"
      data-testid={`card-support-service-${service.id}`}
    >
      {/* Icon + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <ServiceIcon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug" data-testid={`text-service-name-${service.id}`}>
            {service.name}
          </h3>
          {service.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
              {service.description}
            </p>
          )}
        </div>
      </div>

      {/* Price */}
      {service.startingPrice && (
        <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Starting from</span>
          <p className="text-lg font-extrabold text-orange-500 dark:text-orange-400 leading-none mt-0.5" data-testid={`text-service-price-${service.id}`}>
            KSh {service.startingPrice}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <a href={`tel:${businessPhone}`} className="flex-1">
          <button
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            data-testid={`button-call-service-${service.id}`}
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </button>
        </a>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1">
          <button
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm shadow-green-200 dark:shadow-none"
            data-testid={`button-whatsapp-service-${service.id}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </a>
      </div>
    </div>
  );
}
