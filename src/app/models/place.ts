export interface City {
  name: string;
  lat: number;
  lon: number;
}

export interface FoundPlace {
  name: string;
  description: string;
  city: string;
  lat: number;
  lon: number;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string | undefined>;
}

export interface NearbyPlace extends Place {
  street: string;
  distance: number;
  category: string;
  icon: string;
}