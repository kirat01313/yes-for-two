import { DayForecast } from './destination';
import { Text, Translated } from './language';
import { ProgramType } from './program';

export interface Phrase {
  text: Translated;
  author?: string;
}

export interface Suggestion {
  type: ProgramType;
  name: Text;
  address: string;
  place: Text;
  category: string;
  icon: string;
  image: string | null;
  lat: number;
  lon: number;
  mapUrl: string;
  phrase: Phrase;
  distanceKm?: number;
  nights?: number;
  pricePerPerson?: number;
  forecast?: DayForecast[];
}