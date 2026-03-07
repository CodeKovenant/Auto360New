import { useEffect } from "react";
import { MapPin } from "lucide-react";

interface BusinessMapProps {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export default function BusinessMap({ lat, lng, name, address }: BusinessMapProps) {
  useEffect(() => {
    let map: any = null;
    let L: any = null;

    async function initMap() {
      const leaflet = await import("leaflet");
      L = leaflet.default;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const container = document.getElementById("business-map");
      if (!container || (container as any)._leaflet_id) return;

      map = L.map("business-map", { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;font-size:16px;">📍</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${name}</strong><br/><small>${address}</small>`, { maxWidth: 200 })
        .openPopup();
    }

    initMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [lat, lng, name, address]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">Location on Map</span>
        <span className="text-xs text-muted-foreground ml-auto">{address}</span>
      </div>
      <div
        id="business-map"
        data-testid="business-map"
        style={{ height: "280px", width: "100%" }}
      />
    </div>
  );
}
