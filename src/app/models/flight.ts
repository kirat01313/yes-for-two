import { Translated } from './language';

export interface FlightTrip {
  destination: string;
  price: number;
  departureAt: string;
  returnAt: string;
  link: string;
  name: Translated;
  countryCode: string;
  country: Translated;
  lat: number;
  lon: number;
}

export interface Airport {
  code: string;
  name: string;
  country: string;
}

export interface FlightsResponse {
  origin: { code: string; name: Translated };
  trips: FlightTrip[];
}
