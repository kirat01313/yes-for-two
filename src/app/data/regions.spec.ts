import { TRIP_REGIONS, continentOf } from './regions';

describe('regions', () => {
  it('finds the continent of a country code', () => {
    expect(continentOf('PT')).toBe('europe');
    expect(continentOf('br')).toBe('americas');
    expect(continentOf('CV')).toBe('africa');
    expect(continentOf('JP')).toBe('asia');
    expect(continentOf('AU')).toBe('oceania');
  });

  it('returns null for an unknown code', () => {
    expect(continentOf('XX')).toBeNull();
  });

  it('offers six regions, starting with the home country', () => {
    expect(TRIP_REGIONS.map((region) => region.value)).toEqual([
      'national',
      'europe',
      'americas',
      'africa',
      'asia',
      'oceania',
    ]);
  });
});
