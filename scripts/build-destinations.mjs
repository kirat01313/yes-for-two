import { existsSync, readFileSync, writeFileSync } from 'node:fs';

process.loadEnvFile('.env');

const { SUPABASE_URL, SUPABASE_KEY, TRAVELPAYOUTS_TOKEN } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY || !TRAVELPAYOUTS_TOKEN) {
  console.error('Missing SUPABASE_URL, SUPABASE_KEY or TRAVELPAYOUTS_TOKEN in .env.');
  process.exit(1);
}

const ORIGINS = ['OPO', 'LIS', 'FAO', 'FNC', 'PDL'];
const USER_AGENT = 'yes-for-two/1.0 (https://github.com/kirat01313/yes-for-two)';
const OUTPUT = 'supabase/destinations-flights.sql';
const CACHE_FILE = '.destinations-cache.json';

const cache = existsSync(CACHE_FILE)
  ? JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
  : { wikipedia: {} };
const saveCache = () => writeFileSync(CACHE_FILE, JSON.stringify(cache));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': USER_AGENT, ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${url.split('?')[0]}`);
  return response.json();
}

const travelpayouts = (path) =>
  getJson(`https://api.travelpayouts.com/${path}`, {
    headers: { 'X-Access-Token': TRAVELPAYOUTS_TOKEN },
  });

const supabase = (path) =>
  getJson(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY } });

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const byCode = (list) => Object.fromEntries(list.map((item) => [item.code, item]));

async function reachableCodes() {
  const codes = new Set(ORIGINS);
  for (const origin of ORIGINS) {
    const cheap = await travelpayouts(`v1/prices/cheap?origin=${origin}&currency=eur`);
    const dated = await travelpayouts(
      `aviasales/v3/prices_for_dates?origin=${origin}&currency=eur&sorting=price&limit=1000&one_way=false`,
    );
    Object.keys(cheap.data).forEach((code) => codes.add(code));
    dated.data.forEach((trip) => codes.add(trip.destination));
  }
  return codes;
}

async function findWikipedia(name, country, lat, lon) {
  for (const title of [name, `${name}, ${country}`]) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      titles: title,
      prop: 'pageimages|coordinates|langlinks',
      pithumbsize: '960',
      lllang: 'pt',
    });
    const response = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const page = Object.values(response.query?.pages ?? {})[0];
    const point = page?.coordinates?.[0];
    if (page && !('missing' in page) && point && distanceKm(lat, lon, point.lat, point.lon) < 60) {
      return {
        en: page.title,
        pt: page.langlinks?.[0]?.['*'] ?? '',
        image: page.thumbnail?.source ?? null,
      };
    }
    await wait(200);
  }
  return { en: '', pt: '', image: null };
}

async function elevations(places) {
  cache.heights ??= {};
  const missing = places.filter((place) => cache.heights[place.code] === undefined);
  for (let start = 0; start < missing.length; start += 100) {
    const batch = missing.slice(start, start + 100);
    const latitude = batch.map((place) => place.lat.toFixed(4)).join(',');
    const longitude = batch.map((place) => place.lon.toFixed(4)).join(',');
    const response = await getJson(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`,
    );
    batch.forEach((place, index) => (cache.heights[place.code] = response.elevation[index]));
    saveCache();
  }
  return places.map((place) => cache.heights[place.code]);
}

const BEACH_WORDS =
  /\b(beach|beaches|seaside|resort town|coastal|coast|riviera|bay|island|archipelago|surf)/i;
const NATURE_WORDS =
  /\b(mountain|mountains|alps|alpine|ski|national park|nature reserve|volcan\w*|fjord|glacier|safari|rainforest|waterfall)/i;

async function wikipediaTexts(places) {
  const missing = places.filter(
    (place) => place.wikipedia.en && cache.texts?.[place.code] === undefined,
  );
  cache.texts ??= {};
  for (let start = 0; start < missing.length; start += 20) {
    const batch = missing.slice(start, start + 20);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      prop: 'extracts|description',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      exlimit: '20',
      titles: batch.map((place) => place.wikipedia.en).join('|'),
    });
    const response = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const pages = Object.values(response.query?.pages ?? {});
    for (const place of batch) {
      const page = pages.find((item) => item.title === place.wikipedia.en);
      cache.texts[place.code] = page ? `${page.description ?? ''} ${page.extract ?? ''}` : '';
    }
    saveCache();
    await wait(300);
  }
  return places.map((place) => cache.texts?.[place.code] ?? '');
}

async function coastal(places) {
  const result = [];
  for (let start = 0; start < places.length; start += 100) {
    const batch = places.slice(start, start + 100);
    const latitude = batch.map((place) => place.lat.toFixed(4)).join(',');
    const longitude = batch.map((place) => place.lon.toFixed(4)).join(',');
    const response = await getJson(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&current=wave_height`,
    );
    const list = Array.isArray(response) ? response : [response];
    result.push(...list.map((point) => point.current?.wave_height != null));
  }
  return result;
}

const sql = (value) =>
  value === null
    ? 'null'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replaceAll("'", "''")}'`;

const sqlArray = (values) => `array[${values.map(sql).join(', ')}]`;

async function main() {
  console.log('Reading cities, countries and flights…');
  const [citiesEn, citiesPt, countriesEn, countriesPt] = await Promise.all(
    ['en/cities', 'pt/cities', 'en/countries', 'pt/countries'].map((file) =>
      getJson(`https://api.travelpayouts.com/data/${file}.json`).then(byCode),
    ),
  );
  const codes = await reachableCodes();
  const curated = await supabase('destinations?select=id,name_en,lat,lon&order=id');
  const costs = Object.fromEntries(
    (await supabase('country_costs?select=country_code,region')).map((row) => [
      row.country_code,
      row.region,
    ]),
  );
  console.log(`${codes.size} destinations with flights from ${ORIGINS.join(', ')}.`);

  const updates = [];
  const taken = new Set();
  for (const destination of curated) {
    let best = null;
    for (const code of codes) {
      const city = citiesEn[code];
      if (!city || taken.has(code)) continue;
      const km = distanceKm(
        destination.lat,
        destination.lon,
        city.coordinates.lat,
        city.coordinates.lon,
      );
      if (km < 50 && (!best || km < best.km)) best = { code, km };
    }
    if (best) {
      taken.add(best.code);
      updates.push(
        `update public.destinations set iata = ${sql(best.code)}, country_code = ${sql(citiesEn[best.code].country_code)} where id = ${destination.id};`,
      );
      console.log(`${destination.name_en} → ${best.code}`);
    }
  }

  const places = [...codes]
    .filter((code) => !taken.has(code) && citiesEn[code] && costs[citiesEn[code].country_code])
    .map((code) => {
      const city = citiesEn[code];
      const countryCode = city.country_code;
      return {
        code,
        countryCode,
        nameEn: city.name,
        namePt: citiesPt[code]?.name ?? city.name,
        countryEn: countriesEn[countryCode]?.name ?? countryCode,
        countryPt: countriesPt[countryCode]?.name ?? countryCode,
        lat: city.coordinates.lat,
        lon: city.coordinates.lon,
        region: costs[countryCode],
      };
    });

  console.log(`Looking up ${places.length} new destinations on Wikipedia…`);
  for (const place of places) {
    if (!cache.wikipedia[place.code]) {
      cache.wikipedia[place.code] = await findWikipedia(
        place.nameEn,
        place.countryEn,
        place.lat,
        place.lon,
      );
      saveCache();
      await wait(200);
    }
    place.wikipedia = cache.wikipedia[place.code];
  }

  console.log('Reading elevations…');
  const heights = await elevations(places);

  console.log('Checking which destinations are by the sea…');
  const bySea = await coastal(places);

  console.log('Reading the Wikipedia descriptions…');
  const texts = await wikipediaTexts(places);

  const rows = places.map((place, index) => {
    const types = ['city'];
    if (bySea[index] || BEACH_WORDS.test(texts[index])) types.push('beach');
    if (heights[index] >= 600 || NATURE_WORDS.test(texts[index])) types.push('nature');
    return `  (${[
      sql(place.nameEn),
      sql(place.namePt),
      sql(place.countryEn),
      sql(place.countryPt),
      sql(place.wikipedia.en),
      sql(place.wikipedia.pt),
      sql(place.wikipedia.image),
      place.lat,
      place.lon,
      sqlArray(types),
      sql(place.region),
      sql(place.code),
      sql(place.countryCode),
    ].join(', ')})`;
  });

  const content = [
    ...updates,
    '',
    'insert into public.destinations (name_en, name_pt, country_en, country_pt, wikipedia_en, wikipedia_pt, image, lat, lon, types, region, iata, country_code) values',
    rows.join(',\n'),
    'on conflict (iata) do update set',
    '  name_en = excluded.name_en, name_pt = excluded.name_pt,',
    '  country_en = excluded.country_en, country_pt = excluded.country_pt,',
    '  wikipedia_en = excluded.wikipedia_en, wikipedia_pt = excluded.wikipedia_pt,',
    '  image = excluded.image, lat = excluded.lat, lon = excluded.lon,',
    '  types = excluded.types, region = excluded.region, country_code = excluded.country_code;',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, content);
  console.log(
    `Done: ${updates.length} curated destinations linked and ${rows.length} new ones in ${OUTPUT}.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
