/**
 * 360CRM Enterprise Live GPS & Offline Location Tracking Service
 * Wraps navigator.geolocation.watchPosition with high accuracy.
 * Uses IndexedDB for resilient offline queueing during rural/weak network conditions.
 * Automatically flushes batch coordinates to server upon reconnect.
 */

import { api } from './api';

export interface LocationPing {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  recordedAt: string;
  workSessionId?: string;
}

type LocationListener = (location: LocationPing | null, accuracy: number, status: 'ACTIVE' | 'OFFLINE' | 'ERROR') => void;

class EmployeeTrackingService {
  private watchId: number | null = null;
  private activeSessionId: string | null = null;
  private latestLocation: LocationPing | null = null;
  private latestAccuracy = 0;
  private status: 'ACTIVE' | 'OFFLINE' | 'ERROR' = 'OFFLINE';

  private dbName = '360crm_tracking_offline_db';
  private storeName = 'offline_pings';
  private db: IDBDatabase | null = null;
  private listeners: Set<LocationListener> = new Set();

  private lastSentTime = 0;
  private minIntervalMs = 30000; // 30 seconds

  constructor() {
    this.initDb();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushOfflinePings();
      });
    }
  }

  private async initDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'recordedAt' });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
        this.flushOfflinePings();
      };
      req.onerror = () => reject(req.error);
    });
  }

  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.latestLocation, this.latestAccuracy, this.status);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => {
      try {
        l(this.latestLocation, this.latestAccuracy, this.status);
      } catch {}
    });
  }

  /**
   * Start watching live GPS
   */
  public start(workSessionId: string): void {
    this.activeSessionId = workSessionId;

    if (!('geolocation' in navigator)) {
      this.status = 'ERROR';
      this.notify();
      return;
    }

    this.status = 'ACTIVE';

    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        const now = Date.now();
        const ping: LocationPing = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          recordedAt: new Date(pos.timestamp || now).toISOString(),
          workSessionId: this.activeSessionId || undefined
        };

        this.latestLocation = ping;
        this.latestAccuracy = Math.round(pos.coords.accuracy);
        this.status = 'ACTIVE';
        this.notify();

        // Throttle transmission to server (e.g. every 30s)
        if (now - this.lastSentTime >= this.minIntervalMs) {
          this.lastSentTime = now;
          this.sendOrQueuePing(ping);
        }
      },
      err => {
        console.warn('[TrackingService] Geolocation watch error:', err.message);
        this.status = navigator.onLine ? 'ERROR' : 'OFFLINE';
        this.notify();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000
      }
    );
  }

  /**
   * Stop watching GPS
   */
  public stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.activeSessionId = null;
    this.status = 'OFFLINE';
    this.notify();
  }

  /**
   * Send ping online or store offline
   */
  private async sendOrQueuePing(ping: LocationPing): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await api.post('/employee-tracking/location', ping);
        if (!res.success) {
          await this.saveOfflinePing(ping);
        }
      } catch {
        await this.saveOfflinePing(ping);
      }
    } else {
      await this.saveOfflinePing(ping);
    }
  }

  private async saveOfflinePing(ping: LocationPing): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(ping);
    } catch (e) {
      console.warn('[TrackingService] Failed to save offline ping:', e);
    }
  }

  /**
   * Flush queued offline pings to server in batch
   */
  public async flushOfflinePings(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const db = await this.initDb();
      const pings: LocationPing[] = await new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (pings.length === 0) return;

      console.log(`[TrackingService] Syncing ${pings.length} offline GPS pings in batch...`);
      const res = await api.post('/employee-tracking/location/batch', { locations: pings });

      if (res.success) {
        // Clear offline store
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
        console.log('[TrackingService] Offline GPS pings synced successfully.');
      }
    } catch (err) {
      console.warn('[TrackingService] Batch sync failed, will retry on next reconnect:', err);
    }
  }

  public getLatestLocation(): LocationPing | null {
    return this.latestLocation;
  }

  public getLatestAccuracy(): number {
    return this.latestAccuracy;
  }
}

export const employeeTrackingService = new EmployeeTrackingService();
