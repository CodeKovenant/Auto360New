import { Link } from "wouter";
import { MapPin, Wrench, MessageCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GarageService } from "@shared/schema";

interface GarageServiceCardProps {
  service: GarageService & { garageName: string; garageWhatsapp: string; garageCity: string };
  garageId?: string;
}

export default function GarageServiceCard({ service, garageId }: GarageServiceCardProps) {
  return (
    <Card className="hover-elevate cursor-pointer flex flex-col" data-testid={`card-service-${service.id}`}>
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight" data-testid={`service-name-${service.id}`}>
              {service.name}
            </h3>
            {service.popular && (
              <Badge className="mt-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Popular</Badge>
            )}
          </div>
        </div>

        {service.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
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
        </div>
      </CardContent>
    </Card>
  );
}
