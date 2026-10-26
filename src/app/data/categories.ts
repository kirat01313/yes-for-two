import { DestinationType } from '../models/destination';
import { Translated } from '../models/language';

type Tags = Record<string, string | undefined>;

export interface Cuisine {
  value: string;
  name: Translated;
  icon: string;
  image: string;
  matches: (tags: Tags) => boolean;
}

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

const cuisineIs = (pattern: RegExp) => (tags: Tags) => pattern.test(tags['cuisine'] ?? '');

export const CUISINES: Cuisine[] = [
  {
    value: 'regional',
    name: { en: 'Regional', pt: 'Regional' },
    icon: 'soup_kitchen',
    image: pexels(28191271),
    matches: cuisineIs(/regional|portuguese/),
  },
  {
    value: 'francesinha',
    name: { en: 'Francesinha', pt: 'Francesinha' },
    icon: 'lunch_dining',
    image: pexels(20095784),
    matches: cuisineIs(/francesinha/),
  },
  {
    value: 'seafood',
    name: { en: 'Fish and seafood', pt: 'Peixe e marisco' },
    icon: 'set_meal',
    image: pexels(19615775),
    matches: cuisineIs(/seafood|fish/),
  },
  {
    value: 'grill',
    name: { en: 'Grill', pt: 'Grelhados' },
    icon: 'outdoor_grill',
    image: pexels(38895885),
    matches: cuisineIs(/barbecue|chicken|grill|steak_house/),
  },
  {
    value: 'italian',
    name: { en: 'Italian', pt: 'Italiana' },
    icon: 'local_pizza',
    image: pexels(1438672),
    matches: cuisineIs(/italian|pizza/),
  },
  {
    value: 'japanese',
    name: { en: 'Japanese', pt: 'Japonesa' },
    icon: 'ramen_dining',
    image: pexels(14906573),
    matches: cuisineIs(/japanese|sushi|ramen/),
  },
  {
    value: 'asian',
    name: { en: 'Asian', pt: 'Asiática' },
    icon: 'rice_bowl',
    image: pexels(4223923),
    matches: cuisineIs(/chinese|thai|indian|asian|vietnamese|korean|nepalese/),
  },
  {
    value: 'vegetarian',
    name: { en: 'Vegetarian', pt: 'Vegetariana' },
    icon: 'eco',
    image: pexels(33323285),
    matches: (tags) =>
      /vegetarian|vegan/.test(tags['cuisine'] ?? '') ||
      ['yes', 'only'].includes(tags['diet:vegetarian'] ?? '') ||
      ['yes', 'only'].includes(tags['diet:vegan'] ?? ''),
  },
  {
    value: 'burgers',
    name: { en: 'Burgers', pt: 'Hambúrgueres' },
    icon: 'lunch_dining',
    image: pexels(33253821),
    matches: cuisineIs(/burger/),
  },
  {
    value: 'other',
    name: { en: 'Other', pt: 'Outras' },
    icon: 'restaurant',
    image: pexels(5911260),
    matches: () => false,
  },
];

export const CUISINE_NAMES: Record<string, Translated> = {
  regional: { en: 'Regional', pt: 'Regional' },
  portuguese: { en: 'Portuguese', pt: 'Portuguesa' },
  francesinha: { en: 'Francesinha', pt: 'Francesinha' },
  japanese: { en: 'Japanese', pt: 'Japonesa' },
  sushi: { en: 'Sushi', pt: 'Sushi' },
  ramen: { en: 'Ramen', pt: 'Ramen' },
  italian: { en: 'Italian', pt: 'Italiana' },
  pizza: { en: 'Pizza', pt: 'Pizzaria' },
  chinese: { en: 'Chinese', pt: 'Chinesa' },
  thai: { en: 'Thai', pt: 'Tailandesa' },
  indian: { en: 'Indian', pt: 'Indiana' },
  asian: { en: 'Asian', pt: 'Asiática' },
  vietnamese: { en: 'Vietnamese', pt: 'Vietnamita' },
  korean: { en: 'Korean', pt: 'Coreana' },
  nepalese: { en: 'Nepalese', pt: 'Nepalesa' },
  barbecue: { en: 'Barbecue', pt: 'Churrasqueira' },
  chicken: { en: 'Roast chicken', pt: 'Frango assado' },
  grill: { en: 'Grill', pt: 'Grelhados' },
  steak_house: { en: 'Steak house', pt: 'Carnes' },
  burger: { en: 'Burgers', pt: 'Hambúrgueres' },
  mexican: { en: 'Mexican', pt: 'Mexicana' },
  brazilian: { en: 'Brazilian', pt: 'Brasileira' },
  seafood: { en: 'Seafood', pt: 'Marisqueira' },
  fish: { en: 'Fish', pt: 'Peixe' },
  vegetarian: { en: 'Vegetarian', pt: 'Vegetariana' },
  vegan: { en: 'Vegan', pt: 'Vegana' },
  mediterranean: { en: 'Mediterranean', pt: 'Mediterrânica' },
  spanish: { en: 'Spanish', pt: 'Espanhola' },
  french: { en: 'French', pt: 'Francesa' },
};

export type ExperienceGroup = 'culture' | 'outdoors' | 'night';

export interface ExperienceType {
  value: string;
  name: Translated;
  group: ExperienceGroup;
  icon: string;
  tags: string[];
}

export const EXPERIENCE_GROUPS: { value: ExperienceGroup; name: Translated }[] = [
  { value: 'culture', name: { en: 'Culture', pt: 'Cultura' } },
  { value: 'outdoors', name: { en: 'Outdoors', pt: 'Ar livre' } },
  { value: 'night', name: { en: 'Night out', pt: 'Noite' } },
];

export const EXPERIENCE_TYPES: ExperienceType[] = [
  {
    value: 'museums',
    name: { en: 'Museums', pt: 'Museus' },
    group: 'culture',
    icon: 'museum',
    tags: ['museum'],
  },
  {
    value: 'galleries',
    name: { en: 'Galleries', pt: 'Galerias' },
    group: 'culture',
    icon: 'palette',
    tags: ['gallery', 'arts_centre'],
  },
  {
    value: 'theatre',
    name: { en: 'Theatre', pt: 'Teatro' },
    group: 'culture',
    icon: 'theater_comedy',
    tags: ['theatre'],
  },
  {
    value: 'parks',
    name: { en: 'Parks and gardens', pt: 'Parques e jardins' },
    group: 'outdoors',
    icon: 'park',
    tags: ['park', 'garden', 'nature_reserve'],
  },
  {
    value: 'viewpoints',
    name: { en: 'Viewpoints', pt: 'Miradouros' },
    group: 'outdoors',
    icon: 'landscape',
    tags: ['viewpoint'],
  },
  {
    value: 'bars',
    name: { en: 'Bars', pt: 'Bares' },
    group: 'night',
    icon: 'local_bar',
    tags: ['bar', 'pub'],
  },
  {
    value: 'cinema',
    name: { en: 'Cinema', pt: 'Cinema' },
    group: 'night',
    icon: 'movie',
    tags: ['cinema'],
  },
  {
    value: 'challenges',
    name: { en: 'Escape rooms and bowling', pt: 'Escape room e bowling' },
    group: 'night',
    icon: 'lock_open',
    tags: ['escape_game', 'bowling_alley'],
  },
];

export const experiencesQuery = (radius: number, lat: number, lon: number) =>
  `nwr["tourism"~"^(museum|gallery|viewpoint)$"]["name"](around:${radius},${lat},${lon});` +
  `nwr["amenity"~"^(theatre|arts_centre|bar|pub|cinema)$"]["name"](around:${radius},${lat},${lon});` +
  `nwr["leisure"~"^(park|garden|nature_reserve|escape_game|bowling_alley)$"]["name"](around:${radius},${lat},${lon});`;

export const PLACE_TYPES: Record<string, { name: Translated; icon: string }> = {
  museum: { name: { en: 'Museum', pt: 'Museu' }, icon: 'museum' },
  gallery: { name: { en: 'Gallery', pt: 'Galeria' }, icon: 'palette' },
  theatre: { name: { en: 'Theatre', pt: 'Teatro' }, icon: 'theater_comedy' },
  arts_centre: { name: { en: 'Arts centre', pt: 'Centro de artes' }, icon: 'palette' },
  park: { name: { en: 'Park', pt: 'Parque' }, icon: 'park' },
  garden: { name: { en: 'Garden', pt: 'Jardim' }, icon: 'local_florist' },
  nature_reserve: { name: { en: 'Nature reserve', pt: 'Reserva natural' }, icon: 'forest' },
  viewpoint: { name: { en: 'Viewpoint', pt: 'Miradouro' }, icon: 'landscape' },
  bar: { name: { en: 'Bar', pt: 'Bar' }, icon: 'local_bar' },
  pub: { name: { en: 'Pub', pt: 'Pub' }, icon: 'sports_bar' },
  cinema: { name: { en: 'Cinema', pt: 'Cinema' }, icon: 'movie' },
  escape_game: { name: { en: 'Escape room', pt: 'Escape room' }, icon: 'lock_open' },
  bowling_alley: { name: { en: 'Bowling', pt: 'Bowling' }, icon: 'sports_score' },
  attraction: { name: { en: 'Attraction', pt: 'Atração' }, icon: 'photo_camera' },
  zoo: { name: { en: 'Zoo', pt: 'Jardim zoológico' }, icon: 'pets' },
  theme_park: { name: { en: 'Theme park', pt: 'Parque temático' }, icon: 'attractions' },
  castle: { name: { en: 'Castle', pt: 'Castelo' }, icon: 'fort' },
  fort: { name: { en: 'Fort', pt: 'Forte' }, icon: 'fort' },
  monument: { name: { en: 'Monument', pt: 'Monumento' }, icon: 'account_balance' },
  church: { name: { en: 'Church', pt: 'Igreja' }, icon: 'church' },
  palace: { name: { en: 'Palace', pt: 'Palácio' }, icon: 'castle' },
  ruins: { name: { en: 'Ruins', pt: 'Ruínas' }, icon: 'temple_buddhist' },
  archaeological_site: {
    name: { en: 'Archaeological site', pt: 'Sítio arqueológico' },
    icon: 'history_edu',
  },
  city_gate: { name: { en: 'City gate', pt: 'Porta da cidade' }, icon: 'door_front' },
  place_of_worship: { name: { en: 'Church', pt: 'Igreja' }, icon: 'church' },
  marketplace: { name: { en: 'Market', pt: 'Mercado' }, icon: 'storefront' },
};

export const DESTINATION_TYPES: { value: DestinationType; name: Translated; icon: string }[] = [
  { value: 'city', name: { en: 'City', pt: 'Cidade' }, icon: 'location_city' },
  { value: 'beach', name: { en: 'Beach', pt: 'Praia' }, icon: 'beach_access' },
  { value: 'nature', name: { en: 'Nature', pt: 'Natureza' }, icon: 'forest' },
];
