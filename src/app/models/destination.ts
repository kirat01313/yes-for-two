export type DestinationType = 'city' | 'beach' | 'nature';

export interface Destination {
  name_en: string;
  name_pt: string;
  country_en: string;
  country_pt: string;
  wikipedia_en: string;
  image: string | null;
  lat: number;
  lon: number;
  phrase_en: string;
  phrase_pt: string;
  types: DestinationType[];
  iata: string | null;
  country_code: string | null;
}

export interface CountryCost {
  country_code: string;
  night: number;
}

export interface DayForecast {
  date: string;
  max: number;
  min: number;
  icon: string;
}
