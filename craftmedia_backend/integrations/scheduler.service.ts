/**
 * Central CRM Integration Scheduler
 * 
 * Manages recurring automated synchronization across all polling integrations
 * with concurrency locking, health checks, and error recovery.
 */

import { db } from '../database/db';
import { IntegrationDoc } from '../database/types';
import { getProviderAdapter } from './providers';

export class IntegrationSchedulerService {
  private static timerHandle: NodeJS.Timeout | null = null;
  private static readonly TICK_INTERVAL_MS = 60 * 1000; // Check every minute
  private static activeLocks: Map<string, number> = new Map(); // integrationId -> lockTimestamp

  private static getFrequencyMs(freq?: string): number {
    switch (freq) {
      case 'EVERY_5_MIN': return 5 * 60 * 1000;
      case 'EVERY_15_MIN': return 15 * 60 * 1000;
      case 'EVERY_30_MIN': return 30 * 60 * 1000;
      case 'HOURLY': return 60 * 60 * 1000;
      case 'EVERY_6_HOURS': return 6 * 60 * 60 * 1000;
      case 'DAILY': return 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  /**
   * Initializes and starts central scheduler loop
   */
  public static start(): void {
    if (this.timerHandle) {
      console.log('[Integration Scheduler] Central scheduler is already running.');
      return;
    }

    console.log('[Integration Scheduler] ⏱️ Central Integration Engine Scheduler Started (60s tick loop)');

    // Delayed initial cycle after 10s for database readiness
    setTimeout(() => {
      this.runSchedulerTick().catch(e => {
        console.error('[Integration Scheduler] Startup tick error:', e.message);
      });
    }, 10000);

    // Set recurring 60-second tick
    this.timerHandle = setInterval(() => {
      this.runSchedulerTick().catch(e => {
        console.error('[Integration Scheduler] Scheduler tick error:', e.message);
      });
    }, this.TICK_INTERVAL_MS);
  }

  /**
   * Main scheduler evaluation tick
   */
  public static async runSchedulerTick(): Promise<void> {
    if (!db.initialized || !db.integrations) return;

    const allIntegrations = db.integrations.getAll();
    const now = Date.now();

    for (const integration of allIntegrations) {
      // Only process active polling integrations
      if (integration.status !== 'ACTIVE') continue;
      if (integration.syncFrequency === 'MANUAL' || integration.syncFrequency === 'REALTIME') continue;

      const lockTime = this.activeLocks.get(integration._id);
      // If locked for less than 5 minutes, skip (concurrency guard)
      if (lockTime && now - lockTime < 5 * 60 * 1000) {
        continue;
      }

      // Check if due for execution
      const freqMs = this.getFrequencyMs(integration.syncFrequency);
      const lastSync = integration.lastSyncedAt ? new Date(integration.lastSyncedAt).getTime() : 0;

      if (now - lastSync >= freqMs) {
        // Execute sync in background
        this.executeIntegrationSync(integration).catch(err => {
          console.error(`[Integration Scheduler] ❌ Sync failure on '${integration.name}':`, err.message);
        });
      }
    }
  }

  /**
   * Executes sync for a single integration with lock management
   */
  public static async executeIntegrationSync(integration: IntegrationDoc, manualTrigger = false, triggeredBy = 'System Scheduler'): Promise<any> {
    const adapter = getProviderAdapter(integration.code);
    if (!adapter || !adapter.sync) {
      return { success: false, message: `No sync provider registered for code '${integration.code}'` };
    }

    const startTime = Date.now();
    this.activeLocks.set(integration._id, startTime);

    try {
      console.log(`[Integration Scheduler] 🚀 Triggering ${manualTrigger ? 'Manual' : 'Scheduled'} Sync for '${integration.name}' (${integration.code})`);
      const result = await adapter.sync(integration, { manualTrigger, triggeredBy });
      return result;
    } finally {
      this.activeLocks.delete(integration._id);
    }
  }

  /**
   * Stops the central scheduler
   */
  public static stop(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
      console.log('[Integration Scheduler] Central scheduler stopped.');
    }
  }

  public static isRunning(): boolean {
    return this.timerHandle !== null;
  }
}
