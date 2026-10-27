export interface PhotonResponse {
  features: {
    geometry: { coordinates: [number, number] };
    properties: {
      name?: string;
      type?: string;
      osm_value?: string;
      city?: string;
      town?: string;
      village?: string;
      street?: string;
      housenumber?: string;
      state?: string;
      country?: string;
    };
  }[];
}

export interface OverpassResponse {
  elements: {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags: Record<string, string | undefined>;
  }[];
}

export interface NominatimResult {
  osm_type: string;
  osm_id: number;
  name: string;
  lat: string;
  lon: string;
  category: string;
  type: string;
  extratags?: Record<string, string | undefined>;
  address?: { road?: string; house_number?: string };
}

export interface WikipediaSummary {
  thumbnail?: { source: string };
}

export interface WikipediaGeoResponse {
  query?: {
    pages: Record<
      string,
      {
        pageid: number;
        title: string;
        index?: number;
        description?: string;
        thumbnail?: { source: string };
        coordinates?: { lat: number; lon: number }[];
      }
    >;
  };
}

export interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}
