const TOKEN = Deno.env.get('TRAVELPAYOUTS_TOKEN') ?? '';
const FLIGHTS_CACHE_TIME = 3 * 60 * 60 * 1000;
const PLACES_CACHE_TIME = 24 * 60 * 60 * 1000;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface TravelpayoutsTrip {
  destination: string;
  price: number;
  departure_at: string;
  return_at: string;
  link: string;
}

interface TravelpayoutsPlace {
  code: string;
  name: string;
  country_code?: string;
  has_flightable_airport?: boolean;
  coordinates?: { lat: number; lon: number };
}

interface Places {
  time: number;
  cities: Record<string, Record<string, TravelpayoutsPlace>>;
  countries: Record<string, Record<string, TravelpayoutsPlace>>;
}

const flightsCache = new Map<string, { time: number; body: string }>();
let places: Places | null = null;

const reply = (body: string, status = 200) => new Response(body, { status, headers });

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function loadList(lang: string, file: string): Promise<Record<string, TravelpayoutsPlace>> {
  const response = await fetch(`https://api.travelpayouts.com/data/${lang}/${file}.json`);
  const list = (await response.json()) as TravelpayoutsPlace[];
  return Object.fromEntries(list.map((item) => [item.code, item]));
}

async function loadPlaces(): Promise<Places> {
  if (places && Date.now() - places.time < PLACES_CACHE_TIME) return places;
  const [citiesEn, citiesPt, countriesEn, countriesPt] = await Promise.all([
    loadList('en', 'cities'),
    loadList('pt', 'cities'),
    loadList('en', 'countries'),
    loadList('pt', 'countries'),
  ]);
  places = {
    time: Date.now(),
    cities: { en: citiesEn, pt: citiesPt },
    countries: { en: countriesEn, pt: countriesPt },
  };
  return places;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return reply('ok');
  }

  const origin = (new URL(request.url).searchParams.get('origin') ?? '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(origin)) {
    return reply(JSON.stringify({ error: 'Unknown origin.' }), 400);
  }

  const cached = flightsCache.get(origin);
  if (cached && Date.now() - cached.time < FLIGHTS_CACHE_TIME) {
    return reply(cached.body);
  }

  const { cities, countries } = await loadPlaces();
  const start = cities.en[origin];
  if (!start?.coordinates) {
    return reply(JSON.stringify({ error: 'Unknown origin.' }), 400);
  }

  const candidates = [
    origin,
    ...Object.values(cities.en)
      .filter((city) => city.code !== origin && city.has_flightable_airport && city.coordinates)
      .map((city) => ({ code: city.code, km: distanceKm(start.coordinates!, city.coordinates!) }))
      .filter((city) => city.km < 250)
      .sort((a, b) => a.km - b.km)
      .slice(0, 4)
      .map((city) => city.code),
  ];

  let used = origin;
  let data: TravelpayoutsTrip[] = [];
  for (const code of candidates) {
    const response = await fetch(
      'https://api.travelpayouts.com/aviasales/v3/prices_for_dates' +
        `?origin=${code}&currency=eur&sorting=price&limit=1000&one_way=false`,
      { headers: { 'X-Access-Token': TOKEN } },
    );
    if (!response.ok) {
      return reply(JSON.stringify({ error: 'Flights are not available right now.' }), 502);
    }
    data = ((await response.json()) as { data: TravelpayoutsTrip[] }).data;
    used = code;
    if (data.length > 0) break;
  }

  const trips = data
    .filter((trip) => cities.en[trip.destination]?.coordinates)
    .map((trip) => {
      const city = cities.en[trip.destination];
      const countryCode = city.country_code ?? '';
      return {
        destination: trip.destination,
        price: trip.price,
        departureAt: trip.departure_at,
        returnAt: trip.return_at,
        link: trip.link,
        name: { en: city.name, pt: cities.pt[trip.destination]?.name ?? city.name },
        countryCode,
        country: {
          en: countries.en[countryCode]?.name ?? countryCode,
          pt: countries.pt[countryCode]?.name ?? countryCode,
        },
        lat: city.coordinates!.lat,
        lon: city.coordinates!.lon,
      };
    });

  const body = JSON.stringify({
    origin: {
      code: used,
      name: { en: cities.en[used]?.name ?? used, pt: cities.pt[used]?.name ?? used },
    },
    trips,
  });
  flightsCache.set(origin, { time: Date.now(), body });
  return reply(body);
});
