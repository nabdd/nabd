/** City centres (lat, lng). Donors and hospitals are located by city, so distances are approximate. */
export const CITIES: Record<string, [number, number]> = {
  Beirut: [33.8938, 35.5018],
  Jounieh: [33.9808, 35.6178],
  Tripoli: [34.4367, 35.8497],
  Saida: [33.5631, 35.3688],
  Tyre: [33.2705, 35.2038],
  Zahle: [33.8467, 35.9020],
  Baabda: [33.8339, 35.5440],
  Byblos: [34.1230, 35.6519],
  Nabatieh: [33.3772, 35.4836],
}
export const CITY_NAMES = Object.keys(CITIES)

const rad = (d: number) => (d * Math.PI) / 180

function haversineKm(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Distance between a hospital and a donor, both known only by city.
 * Inside the same city we spread donors over 1 to 9 km, deterministically per donor,
 * so radius filters stay meaningful.
 */
export function distanceKm(hospitalCity: string, donorCity: string, donorId: number) {
  const a = CITIES[hospitalCity]
  const b = CITIES[donorCity]
  if (!a || !b) return 999
  if (hospitalCity === donorCity) return 1 + ((donorId * 37) % 80) / 10
  return Math.round(haversineKm(a, b) * 10) / 10
}
