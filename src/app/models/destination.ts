export type DestinationType = 'city' | 'beach' | 'nature';

export type Region = 'portugal' | 'europe' | 'beyond';

export interface Destination {
  id: number;
  name_en: string;
  name_pt: string;
  country_en: string;
  country_pt: string;
  wikipedia_en: string;
  wikipedia_pt: string;
  image: string | null;
  lat: number;
  lon: number;
  flight: number;
  night: number;
  phrase_en: string;
  phrase_pt: string;
  types: DestinationType[];
  region: Region;
}

export interface DayForecast {
  date: string;
  max: number;
  min: number;
  code: number;
  icon: string;
}
