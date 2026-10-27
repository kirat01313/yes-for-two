import { distanceKm, googleMapsLink, pickRandom } from './geo';

describe('geo utils', () => {
  it('distanceKm measures the distance between Porto and Lisbon', () => {
    const km = distanceKm(41.1579, -8.6291, 38.7223, -9.1393);
    expect(km).toBeGreaterThan(270);
    expect(km).toBeLessThan(280);
  });

  it('distanceKm is zero for the same point', () => {
    expect(distanceKm(41.55, -8.42, 41.55, -8.42)).toBe(0);
  });

  it('googleMapsLink searches for the name and the city', () => {
    expect(googleMapsLink('Taberna Belga', 'Braga')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Taberna%20Belga%20Braga',
    );
  });

  it('pickRandom always returns one of the items', () => {
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) expect(items).toContain(pickRandom(items));
  });
});
