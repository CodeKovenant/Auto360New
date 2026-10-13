import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface BusinessMapProps {
  name: string;
  address: string;
  city: string;
}

interface Coordinates {
  lat: number;
  lon: number;
}

type MapStatus = "loading" | "ready" | "not-found" | "error";

function readCachedCoordinates(locationText: string): Coordinates | null {
  try {
    const cached = window.localStorage.getItem("business-map-geocode:v1:" + locationText.toLowerCase());
    if (!cached) return null;
    const coordinates = JSON.parse(cached) as Coordinates;
    return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon) ? coordinates : null;
  } catch {
    return null;
  }
}

function cacheCoordinates(locationText: string, coordinates: Coordinates) {
  try {
    window.localStorage.setItem("business-map-geocode:v1:" + locationText.toLowerCase(), JSON.stringify(coordinates));
  } catch {
    // The map can still work if browser storage is unavailable.
  }
}

export default function BusinessMap({ name, address, city }: BusinessMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const locationText = [address, city].map((value) => value.trim()).filter(Boolean).join(", ");

  useEffect(() => {
    let map: any = null;
    let cancelled = false;
    const controller = new AbortController();

    async function initMap() {
      setStatus("loading");
      if (!locationText) {
        setStatus("not-found");
        return;
      }

      try {
        let coordinates = readCachedCoordinates(locationText);
        if (!coordinates) {
          const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
          geocodeUrl.searchParams.set("q", locationText);
          geocodeUrl.searchParams.set("format", "jsonv2");
          geocodeUrl.searchParams.set("limit", "1");

          const response = await fetch(geocodeUrl.toString(), {
            signal: controller.signal,
            headers: { "Accept-Language": "en" },
          });
          if (!response.ok) throw new Error("Address lookup failed");

          const results = await response.json();
          const result = Array.isArray(results) ? results[0] : null;
          if (!result) {
            if (!cancelled) setStatus("not-found");
            return;
          }

          coordinates = { lat: Number(result.lat), lon: Number(result.lon) };
          if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lon)) {
            throw new Error("Address lookup returned invalid coordinates");
          }
          cacheCoordinates(locationText, coordinates);
        }

        const leaflet = await import("leaflet");
        if (cancelled || !mapRef.current) return;
        const L = leaflet.default;

        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
          .setView([coordinates.lat, coordinates.lon], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const icon = L.divIcon({
          html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;font-size:16px;">📍</div>',
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const popup = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = name;
        const lineBreak = document.createElement("br");
        const addressText = document.createElement("small");
        addressText.textContent = locationText;
        popup.append(title, lineBreak, addressText);

        L.marker([coordinates.lat, coordinates.lon], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 240 })
          .openPopup();

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void initMap();
    return () => {
      cancelled = true;
      controller.abort();
      if (map) map.remove();
    };
  }, [locationText, name]);

  const message = status === "loading"
    ? "Finding this address on the map…"
    : status === "not-found"
      ? "This address could not be located automatically."
      : "The map could not load right now.";

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <MapPin className="w-4 h-4 text-red-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">Location on Map</span>
        <span className="text-xs text-muted-foreground ml-auto">{locationText}</span>
      </div>
      <div className="relative">
        <div
          ref={mapRef}
          data-testid="business-map"
          aria-label={"Map for " + name + " at " + locationText}
          style={{ height: "280px", width: "100%" }}
        />
        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gray-900 px-4 text-center" role="status" aria-live="polite">
            <span className="text-sm text-muted-foreground">{message}</span>
            {status !== "loading" && locationText && (
              <a
                href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(locationText)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              >
                Search this address on OpenStreetMap
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
