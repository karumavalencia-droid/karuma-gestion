export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type AttendanceLocation = GeoPoint & {
  accuracy: number;
};

export type StoreGeofence = GeoPoint & {
  radiusMeters: number;
  maximumAccuracyMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_STORE_LATITUDE = 39.4690812;
const DEFAULT_STORE_LONGITUDE = -0.3751925;
const DEFAULT_RADIUS_METERS = 150;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInMeters(from: GeoPoint, to: GeoPoint): number {
  const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function finiteNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getStoreGeofence(): StoreGeofence | null {
  const latitude =
    finiteNumber(process.env.KARUMA_STORE_LATITUDE) ?? DEFAULT_STORE_LATITUDE;
  const longitude =
    finiteNumber(process.env.KARUMA_STORE_LONGITUDE) ?? DEFAULT_STORE_LONGITUDE;
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const configuredRadius = finiteNumber(
    process.env.KARUMA_ATTENDANCE_RADIUS_METERS,
  );
  const configuredAccuracy = finiteNumber(
    process.env.KARUMA_ATTENDANCE_MAX_ACCURACY_METERS,
  );

  return {
    latitude,
    longitude,
    radiusMeters:
      configuredRadius && configuredRadius > 0
        ? configuredRadius
        : DEFAULT_RADIUS_METERS,
    maximumAccuracyMeters:
      configuredAccuracy && configuredAccuracy > 0 ? configuredAccuracy : 100,
  };
}

export function validateAttendanceLocation(
  location: AttendanceLocation,
  geofence: StoreGeofence,
):
  | { valid: true; distanceMeters: number }
  | {
      valid: false;
      reason: "invalid" | "inaccurate" | "outside";
      distanceMeters: number | null;
    } {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    !Number.isFinite(location.accuracy) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180 ||
    location.accuracy < 0
  ) {
    return { valid: false, reason: "invalid", distanceMeters: null };
  }

  const distanceMeters = distanceInMeters(location, geofence);
  if (location.accuracy > geofence.maximumAccuracyMeters) {
    return { valid: false, reason: "inaccurate", distanceMeters };
  }
  if (distanceMeters > geofence.radiusMeters) {
    return { valid: false, reason: "outside", distanceMeters };
  }

  return { valid: true, distanceMeters };
}
