import { apiRequest } from "@/lib/queryClient";

export interface GeocodedBusinessLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function findBusinessLocations(address: string, city: string): Promise<GeocodedBusinessLocation[]> {
  const params = new URLSearchParams({ address, city });
  const response = await apiRequest("GET", `/api/geocode/business-location?${params.toString()}`);
  const data = await response.json() as { results: GeocodedBusinessLocation[] };
  return data.results;
}
