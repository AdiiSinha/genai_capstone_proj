/**
 * workplaceUtils.js — Default offices data and geo calculations for Workplace module.
 */
export const DEFAULT_OFFICES = [
  {
    name: "Capgemini DTP Campus",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Divyasree Technopark, EPIP Zone, Whitefield",
    latitude: 12.9847,
    longitude: 77.7289,
    distance_km: 0.04
  },
  {
    name: "Capgemini EPIP Campus",
    city: "Bengaluru",
    state: "Karnataka",
    address: "155, EPIP Phase II, Whitefield",
    latitude: 12.9780,
    longitude: 77.7260,
    distance_km: 0.81
  },
  {
    name: "Capgemini RMZ Ecoworld",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Plot No. 1, Campus 6B, Outer Ring Road",
    latitude: 12.9230,
    longitude: 77.6830,
    distance_km: 6.49
  },
  {
    name: "Capgemini Pritech Park",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Block 7A, Pritech Park SEZ, Bellandur",
    latitude: 12.9260,
    longitude: 77.6870,
    distance_km: 6.63
  }
];

export function getDirectionsUrl(destLat, destLng, destName, userLocation) {
  if (userLocation && userLocation.lat && userLocation.lng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destLat},${destLng}&destination_place_id=${encodeURIComponent(destName)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${encodeURIComponent(destName)}`;
}
