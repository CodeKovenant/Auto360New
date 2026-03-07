import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SupportService } from "@shared/schema";

interface SupportServiceCardProps {
  service: SupportService;
  businessName: string;
  businessPhone: string;
  businessWhatsapp: string;
}

export default function SupportServiceCard({ service, businessName, businessPhone, businessWhatsapp }: SupportServiceCardProps) {
  const waMessage = `Hi, I'm interested in your "${service.name}" service. Please provide more details.`;
  const waLink = `https://wa.me/${businessWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`;

  return (
    <Card
      className="group border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
      data-testid={`card-support-service-${service.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug" data-testid={`text-service-name-${service.id}`}>
            {service.name}
          </h3>
          {service.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}
        </div>

        {service.startingPrice && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">From</span>
            <span className="text-sm font-bold text-orange-500" data-testid={`text-service-price-${service.id}`}>
              KSh {service.startingPrice}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <a href={`tel:${businessPhone}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" data-testid={`button-call-service-${service.id}`}>
              <Phone className="w-3.5 h-3.5" />
              Call
            </Button>
          </a>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" className="w-full text-xs gap-1.5 bg-green-500 hover:bg-green-600 text-white" data-testid={`button-whatsapp-service-${service.id}`}>
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
