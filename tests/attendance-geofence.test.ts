import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceInMeters,
  validateAttendanceLocation,
  type StoreGeofence,
} from "../lib/attendance/geofence";

const store: StoreGeofence = {
  latitude: 39.4699,
  longitude: -0.3763,
  radiusMeters: 120,
  maximumAccuracyMeters: 100,
};

test("distance is zero for the same coordinate", () => {
  assert.equal(distanceInMeters(store, store), 0);
});

test("a precise position inside the restaurant radius is accepted", () => {
  const result = validateAttendanceLocation(
    {
      latitude: 39.4702,
      longitude: -0.3763,
      accuracy: 20,
    },
    store,
  );
  assert.equal(result.valid, true);
  if (result.valid) assert.ok(result.distanceMeters < 120);
});

test("a position outside the radius is rejected", () => {
  const result = validateAttendanceLocation(
    {
      latitude: 39.472,
      longitude: -0.3763,
      accuracy: 15,
    },
    store,
  );
  assert.deepEqual(
    result.valid ? null : result.reason,
    "outside",
  );
});

test("an inaccurate GPS reading is rejected even when its center is nearby", () => {
  const result = validateAttendanceLocation(
    {
      latitude: store.latitude,
      longitude: store.longitude,
      accuracy: 180,
    },
    store,
  );
  assert.deepEqual(
    result.valid ? null : result.reason,
    "inaccurate",
  );
});

test("invalid coordinates are rejected", () => {
  const result = validateAttendanceLocation(
    { latitude: 100, longitude: 0, accuracy: 10 },
    store,
  );
  assert.deepEqual(
    result.valid ? null : result.reason,
    "invalid",
  );
});
