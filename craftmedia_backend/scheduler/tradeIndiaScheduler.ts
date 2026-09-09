/**
 * TradeIndia Automated 5-Minute Recurring Scheduler
 * 
 * Periodically triggers TradeIndia lead synchronization in the background.
 * Wrapped with rigorous try/catch blocks to ensure server uptime is never affected.
 */

import { TradeIndiaSyncService } from '../services/tradeIndiaSync.service';

export class TradeIndiaScheduler {
  private static intervalHandle: NodeJS.Timeout | null = null;
  private static readonly INTERVAL_MS = 5 * 60 * 1000; // 5 Minutes (*/5 * * * *)

  /**
   * Initializes and starts the background 5-minute recurring sync
   */
  public static start(): void {
    if (this.intervalHandle) {
      console.log('[TradeIndia Scheduler] Scheduler is already active.');
      return;
    }

    console.log(`[TradeIndia Scheduler] ⏱️ Initialized background lead sync job (Running every 5 minutes)`);

    // Initial delayed run after 10 seconds of server startup to let database warm up
    setTimeout(async () => {
      try {
        console.log('[TradeIndia Scheduler] Running startup sync...');
        await TradeIndiaSyncService.executeSync({ manualTrigger: false });
      } catch (err: any) {
        console.error('[TradeIndia Scheduler] Startup sync encountered error (safely caught):', err.message);
      }
    }, 10000);

    // Set recurring 5-minute interval
    this.intervalHandle = setInterval(async () => {
      try {
        await TradeIndiaSyncService.executeSync({ manualTrigger: false });
      } catch (err: any) {
        console.error('[TradeIndia Scheduler] Background sync encountered error (safely caught):', err.message);
      }
    }, this.INTERVAL_MS);
  }

  /**
   * Stops the background scheduler (for graceful shutdown or tests)
   */
  public static stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[TradeIndia Scheduler] Scheduler stopped.');
    }
  }

  /**
   * Checks if scheduler is currently running
   */
  public static isRunning(): boolean {
    return this.intervalHandle !== null;
  }
}
