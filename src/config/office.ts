// Office location configuration
export const OFFICE_CONFIG = {
  // Office coordinates (latitude, longitude)
  // Location: 11°36'13.4"N 76°12'33.3"E
  coordinates: {
    lat: 11.603722,  // Your office latitude
    lng: 76.209250   // Your office longitude
  },
  
  // Allowed radius in meters (e.g., 100 meters = 0.1 km)
  allowedRadius: 100, // 100 meters
  
  // Whether to enforce location check for in-office employees
  enforceLocationCheck: true,
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if employee is within allowed office radius
 * @param employeeLat Employee's current latitude
 * @param employeeLng Employee's current longitude
 * @returns Object with isWithinRange boolean and distance in meters
 */
export function isWithinOfficeRange(
  employeeLat: number,
  employeeLng: number
): { isWithinRange: boolean; distance: number } {
  const distance = calculateDistance(
    employeeLat,
    employeeLng,
    OFFICE_CONFIG.coordinates.lat,
    OFFICE_CONFIG.coordinates.lng
  );

  return {
    isWithinRange: distance <= OFFICE_CONFIG.allowedRadius,
    distance: Math.round(distance),
  };
}
