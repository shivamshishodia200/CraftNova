/**
 * Geodesic & Navigation Mathematical Computation Service
 * 
 * Provides Haversine distance, speed calculation, bearing,
 * and GPS jump anomaly detection.
 */

export class GeodesicService {
  private static readonly EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

  /**
   * Calculates the Great-Circle distance between two coordinates using Haversine formula
   * @returns Distance in meters
   */
  public static calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    if (lat1 === lat2 && lng1 === lng2) return 0;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(this.EARTH_RADIUS_METERS * c * 10) / 10;
  }

  /**
   * Calculates speed in km/h based on distance and time delta
   */
  public static calculateSpeedKmh(distanceMeters: number, timeDeltaSeconds: number): number {
    if (timeDeltaSeconds <= 0 || distanceMeters <= 0) return 0;
    const speedMps = distanceMeters / timeDeltaSeconds;
    const speedKmh = speedMps * 3.6;
    return Math.round(speedKmh * 10) / 10;
  }

  /**
   * Calculates the forward azimuth / compass bearing from point 1 to point 2 (0 - 360 degrees)
   */
  public static calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    if (lat1 === lat2 && lng1 === lng2) return 0;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lng2 - lng1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (toDeg(θ) + 360) % 360;
    return Math.round(bearing);
  }

  /**
   * Evaluates if a coordinate update is an impossible GPS jump / spoof anomaly
   */
  public static detectGpsJump(
    prevPoint: { latitude: number; longitude: number; recordedAt: string; accuracy?: number },
    currPoint: { latitude: number; longitude: number; recordedAt: string; accuracy?: number },
    maxAllowableSpeedKmh: number = 140
  ): { isJump: boolean; speedKmh: number; distanceMeters: number; reason?: string } {
    const timeDeltaSec = Math.max(
      1,
      (new Date(currPoint.recordedAt).getTime() - new Date(prevPoint.recordedAt).getTime()) / 1000
    );

    const distanceMeters = this.calculateDistanceMeters(
      prevPoint.latitude,
      prevPoint.longitude,
      currPoint.latitude,
      currPoint.longitude
    );

    // If points are within combined GPS uncertainty, not a jump
    const combinedAccuracy = (prevPoint.accuracy || 20) + (currPoint.accuracy || 20);
    if (distanceMeters <= combinedAccuracy) {
      return { isJump: false, speedKmh: 0, distanceMeters };
    }

    const speedKmh = this.calculateSpeedKmh(distanceMeters, timeDeltaSec);

    // If speed exceeds human commercial road/train transport limits (e.g. >140km/h for short urban trips)
    if (speedKmh > maxAllowableSpeedKmh && distanceMeters > 500) {
      return {
        isJump: true,
        speedKmh,
        distanceMeters,
        reason: `Implausible velocity of ${speedKmh.toFixed(1)} km/h over ${(timeDeltaSec).toFixed(0)}s (${(distanceMeters / 1000).toFixed(2)} km jump)`
      };
    }

    return { isJump: false, speedKmh, distanceMeters };
  }
}
