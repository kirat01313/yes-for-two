import { Translated } from '../models/language';

export type Continent = 'europe' | 'americas' | 'africa' | 'asia' | 'oceania';
export type TripRegion = 'national' | Continent;

export const TRIP_REGIONS: { value: TripRegion; name: Translated; icon: string }[] = [
  { value: 'national', name: { en: 'My country', pt: 'Nacional' }, icon: 'home' },
  { value: 'europe', name: { en: 'Europe', pt: 'Europa' }, icon: 'euro' },
  { value: 'americas', name: { en: 'Americas', pt: 'Américas' }, icon: 'south_america' },
  { value: 'africa', name: { en: 'Africa', pt: 'África' }, icon: 'wb_sunny' },
  { value: 'asia', name: { en: 'Asia', pt: 'Ásia' }, icon: 'temple_buddhist' },
  { value: 'oceania', name: { en: 'Oceania', pt: 'Oceânia' }, icon: 'sailing' },
];

const COUNTRIES: Record<Continent, string> = {
  europe:
    'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT ' +
    'LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK',
  americas:
    'AG AI AR AW BB BL BM BO BQ BR BS BZ CA CL CO CR CU CW DM DO EC FK GD GF GL GP GT GY HN HT ' +
    'JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX TC TT US UY VC VE VG VI',
  africa:
    'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML ' +
    'MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  asia:
    'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV ' +
    'MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TW UZ VN YE',
  oceania: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS',
};

const CONTINENT_OF = new Map<string, Continent>(
  (Object.entries(COUNTRIES) as [Continent, string][]).flatMap(([continent, codes]) =>
    codes.split(' ').map((code) => [code, continent] as const),
  ),
);

export function continentOf(countryCode: string): Continent | null {
  return CONTINENT_OF.get(countryCode.toUpperCase()) ?? null;
}
