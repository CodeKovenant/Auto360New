import { useEffect, useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusinessMap from "@/components/BusinessMap";
import {
  findBusinessLocations,
  type GeocodedBusinessLocation,
} from "@/lib/business-geocoding";

interface BusinessLocationPickerProps {
  address: string;
  city: string;
  businessName: string;
  value: GeocodedBusinessLocation | null;
  onChange: (location: GeocodedBusinessLocation | null) => void;
  mapId: string;
}

export default function BusinessLocationPicker({
  address,
  city,
  businessName,
  value,
  onChange,
  mapId,
}: BusinessLocationPickerProps) {
  const [matches, setMatches] = useState<GeocodedBusinessLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatches([]);
    setError("");
  }, [address, city]);

  async function searchAddress() {
    if (!address.trim() || !city.trim()) {
      setError("Enter the street address and county first.");
      return;
    }

    setIsSearching(true);
    setError("");
    try {
      const results = await findBusinessLocations(address, city);
      setMatches(results);
      onChange(results[0] ?? null);
      if (results.length === 0) {
        setError("No matching map location found. Check the address and try again.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Address lookup is temporarily unavailable.");
      onChange(null);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Map Location</p>
          <p className="text-xs text-muted-foreground">
            Find a map pin from the street address and county. You can change the match if needed.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={searchAddress} disabled={isSearching}>
          {isSearching ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
          {isSearching ? "Finding location..." : "Find on map"}
        </Button>
      </div>

      {error && <p className="text-sm text-amber-700 dark:text-amber-300" role="status">{error}</p>}

      {matches.length > 1 && (
        <div className="space-y-2" role="group" aria-label="Choose the matching map location">
          <p className="text-xs font-medium text-muted-foreground">Choose the correct match:</p>
          {matches.map((match, index) => {
            const selected = value?.latitude === match.latitude && value?.longitude === match.longitude;
            return (
              <button
                key={`${match.latitude}-${match.longitude}-${index}`}
                type="button"
                onClick={() => onChange(match)}
                aria-pressed={selected}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
                    : "border-gray-200 hover:border-red-300 dark:border-gray-700"
                }`}
              >
                {match.displayName}
              </button>
            );
          })}
        </div>
      )}

      {value && (
        <>
          <p className="text-xs text-muted-foreground">
            Selected location: {value.displayName}
          </p>
          <BusinessMap
            mapId={mapId}
            lat={value.latitude}
            lng={value.longitude}
            name={businessName || "Business location"}
            address={value.displayName}
          />
        </>
      )}
    </div>
  );
}
