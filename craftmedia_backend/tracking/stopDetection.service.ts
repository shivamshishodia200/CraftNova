/**
 * Intelligent Stop & Movement Analyzer
 * 
 * Accurately detects stationary employee stops (client meetings, lunch breaks, site inspections)
 * while filtering out GPS spatial jitter and traffic signals.
 */

import { GeodesicService } from './geodesic.service';
import { LocationHistoryDoc, TrackingPolicyDoc } from '../database/types';

export class StopDetectionService {
  /**
   * Evaluates if latest coordinate packet represents an ongoing or new stop
   */
  public static analyzeStop(
    currentPoint: { latitude: number; longitude: number; recordedAt: string; speedKmh?: number },
    recentHistory: LocationHistoryDoc[],
    policy: TrackingPolicyDoc,
    previousStopState?: { isStop: boolean; stoppedSince?: string; currentStopDurationMinutes?: number }
  ): {
    isStop: boolean;
    stoppedSince?: string;
    stopDurationMinutes: number;
    movementStatus: 'TRAVELLING' | 'STOPPED' | 'STATIONARY';
  } {
    const stopRadiusMeters = policy.stopRadiusMeters || 60;
    const stopMinDurationMinutes = policy.stopMinDurationMinutes || 10;
    const nowTime = new Date(currentPoint.recordedAt).getTime();

    // 1. If explicit speed is recorded and > 5 km/h, employee is moving
    if (currentPoint.speedKmh && currentPoint.speedKmh > 5.0) {
      return {
        isStop: false,
        stoppedSince: undefined,
        stopDurationMinutes: 0,
        movementStatus: 'TRAVELLING'
      };
    }

    // 2. Look back at recent history to compute dwell time within radius
    const relevantTrail = recentHistory.filter(h => {
      const hTime = new Date(h.recordedAt).getTime();
      return nowTime - hTime <= 4 * 3600 * 1000; // Look back up to 4 hours
    }).sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    if (relevantTrail.length === 0) {
      return {
        isStop: false,
        stoppedSince: undefined,
        stopDurationMinutes: 0,
        movementStatus: 'STATIONARY'
      };
    }

    // Find earliest contiguous point that stays within stopRadiusMeters from currentPoint
    let stopStartIndex = relevantTrail.length - 1;
    for (let i = relevantTrail.length - 1; i >= 0; i--) {
      const pt = relevantTrail[i];
      const dist = GeodesicService.calculateDistanceMeters(
        currentPoint.latitude,
        currentPoint.longitude,
        pt.latitude,
        pt.longitude
      );

      if (dist <= stopRadiusMeters) {
        stopStartIndex = i;
      } else {
        // Point is outside radius, break contiguous stationary streak
        break;
      }
    }

    const firstPointInCluster = relevantTrail[stopStartIndex];
    const firstPointTime = new Date(firstPointInCluster.recordedAt).getTime();
    const durationMinutes = Math.max(0, Math.round((nowTime - firstPointTime) / 60000));

    if (durationMinutes >= stopMinDurationMinutes) {
      return {
        isStop: true,
        stoppedSince: firstPointInCluster.recordedAt,
        stopDurationMinutes: durationMinutes,
        movementStatus: 'STOPPED'
      };
    }

    return {
      isStop: false,
      stoppedSince: previousStopState?.stoppedSince,
      stopDurationMinutes: durationMinutes,
      movementStatus: 'STATIONARY'
    };
  }
}
