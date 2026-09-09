/**
 * 360CRM Enterprise App Activity & Telemetry Tracker
 * Tracks internal CRM navigation (SCREEN_ENTER/SCREEN_EXIT), tab visibility,
 * and coarse user idle detection (5 min inactivity threshold) with strict event deduplication.
 * Strictly preserves privacy: does NOT capture keystrokes, form inputs, passwords, or external sites.
 */

import { api } from './api';

export interface ActivityEvent {
  eventId?: string;
  eventType: 'SCREEN_ENTER' | 'SCREEN_EXIT' | 'TAB_ACTIVE' | 'TAB_BACKGROUND' | 'USER_ACTIVE' | 'USER_IDLE';
  screen?: string;
  route?: string;
  entityType?: string;
  entityId?: string;
  enteredAt?: string;
  exitedAt?: string;
  durationSeconds?: number;
  dedupeKey?: string;
  timestamp: string;
}

class AppActivityTracker {
  private activeSessionId: string | null = null;
  private currentScreen: string = 'dashboard';
  private screenEnteredAt: number = Date.now();
  private isTabVisible = true;
  private isIdle = false;
  private lastActivityRecordedAt = 0;
  private lastRecordedRoute: string = '';

  private idleTimer: NodeJS.Timeout | null = null;
  private idleThresholdMs = 5 * 60 * 1000; // 5 minutes

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private activityBuffer: ActivityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private userActivityHandler: () => void;

  constructor() {
    this.userActivityHandler = this.onUserInteraction.bind(this);
  }

  /**
   * Start tracking activity for a work session (idempotent, prevents duplicate initial events)
   */
  public start(sessionId: string, initialScreen?: string): void {
    if (this.activeSessionId === sessionId) {
      // Already actively tracking this session, avoid duplicate SCREEN_ENTER
      return;
    }

    this.activeSessionId = sessionId;
    this.screenEnteredAt = Date.now();
    this.isTabVisible = !document.hidden;
    const startScreen = initialScreen || this.currentScreen || 'dashboard';
    this.currentScreen = startScreen;
    this.lastRecordedRoute = startScreen;

    // 1. Initial screen enter with dedupe key
    this.recordActivity({
      eventId: `enter_${sessionId}_${startScreen}_${Date.now()}`,
      eventType: 'SCREEN_ENTER',
      screen: startScreen,
      route: startScreen,
      enteredAt: new Date(this.screenEnteredAt).toISOString(),
      dedupeKey: `enter_${sessionId}_${startScreen}`,
      timestamp: new Date().toISOString()
    });

    // 2. Tab visibility change listener
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // 3. Setup coarse user interaction listeners for idle detection
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
      window.removeEventListener(evt, this.userActivityHandler);
      window.addEventListener(evt, this.userActivityHandler, { passive: true });
    });
    this.resetIdleTimer();

    // 4. Periodic heartbeat (every 60s)
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 60000);

    // 5. Buffer flush timer (every 15s)
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), 15000);
  }

  /**
   * Stop tracking activity cleanly
   */
  public stop(): void {
    if (this.activeSessionId) {
      const now = Date.now();
      const dur = Math.max(1, Math.round((now - this.screenEnteredAt) / 1000));
      this.recordActivity({
        eventId: `exit_${this.activeSessionId}_${this.currentScreen}_${now}`,
        eventType: 'SCREEN_EXIT',
        screen: this.currentScreen,
        route: this.currentScreen,
        enteredAt: new Date(this.screenEnteredAt).toISOString(),
        exitedAt: new Date(now).toISOString(),
        durationSeconds: dur,
        dedupeKey: `exit_${this.activeSessionId}_${this.currentScreen}_${now}`,
        timestamp: new Date().toISOString()
      });
      this.flush();
    }

    this.activeSessionId = null;

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
      window.removeEventListener(evt, this.userActivityHandler);
    });

    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  /**
   * Navigating to a different CRM screen/route with route comparison & throttling
   */
  public onNavigate(screen: string, entityType?: string, entityId?: string): void {
    if (!this.activeSessionId || !screen) return;
    if (screen === this.currentScreen && screen === this.lastRecordedRoute) return;

    const now = Date.now();
    const durationSeconds = Math.max(1, Math.round((now - this.screenEnteredAt) / 1000));

    // Record exit from previous screen
    this.recordActivity({
      eventId: `exit_${this.activeSessionId}_${this.currentScreen}_${now}`,
      eventType: 'SCREEN_EXIT',
      screen: this.currentScreen,
      route: this.currentScreen,
      enteredAt: new Date(this.screenEnteredAt).toISOString(),
      exitedAt: new Date(now).toISOString(),
      durationSeconds,
      dedupeKey: `exit_${this.activeSessionId}_${this.currentScreen}_${now}`,
      timestamp: new Date().toISOString()
    });

    // Record enter on new screen
    this.currentScreen = screen;
    this.lastRecordedRoute = screen;
    this.screenEnteredAt = now;

    this.recordActivity({
      eventId: `enter_${this.activeSessionId}_${screen}_${now}`,
      eventType: 'SCREEN_ENTER',
      screen,
      route: screen,
      entityType,
      entityId,
      enteredAt: new Date(now).toISOString(),
      dedupeKey: `enter_${this.activeSessionId}_${screen}_${Math.floor(now / 3000)}`,
      timestamp: new Date().toISOString()
    });

    // Prompt immediate flush on navigation
    this.flush();
  }

  private onVisibilityChange = (): void => {
    if (!this.activeSessionId) return;

    const isVisible = !document.hidden;
    if (isVisible !== this.isTabVisible) {
      this.isTabVisible = isVisible;
      const eventType = isVisible ? 'TAB_ACTIVE' : 'TAB_BACKGROUND';
      this.recordActivity({
        eventId: `tab_${eventType}_${Date.now()}`,
        eventType,
        screen: this.currentScreen,
        route: this.currentScreen,
        timestamp: new Date().toISOString()
      });
      this.flush();
    }
  };

  private onUserInteraction(): void {
    if (!this.activeSessionId) return;

    if (this.isIdle) {
      this.isIdle = false;
      this.recordActivity({
        eventId: `user_active_${Date.now()}`,
        eventType: 'USER_ACTIVE',
        screen: this.currentScreen,
        timestamp: new Date().toISOString()
      });
    }

    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.activeSessionId && !this.isIdle) {
        this.isIdle = true;
        this.recordActivity({
          eventId: `user_idle_${Date.now()}`,
          eventType: 'USER_IDLE',
          screen: this.currentScreen,
          timestamp: new Date().toISOString()
        });
      }
    }, this.idleThresholdMs);
  }

  private recordActivity(event: ActivityEvent): void {
    this.activityBuffer.push(event);
  }

  public async flush(): Promise<void> {
    if (!this.activeSessionId || this.activityBuffer.length === 0) return;

    const eventsToSend = [...this.activityBuffer];
    this.activityBuffer = [];

    for (const evt of eventsToSend) {
      try {
        await api.post(`/employee/work-session/${this.activeSessionId}/activity`, evt);
      } catch (err) {
        console.warn('[ActivityTracker] Failed to send activity:', err);
      }
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.activeSessionId) return;

    try {
      await api.post(`/employee/work-session/${this.activeSessionId}/heartbeat`, {
        timestamp: new Date().toISOString(),
        tabVisibility: this.isTabVisible ? 'VISIBLE' : 'HIDDEN',
        recordingStatus: 'ACTIVE',
        trackingStatus: 'ACTIVE',
        networkStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE'
      });
    } catch (err) {
      console.warn('[ActivityTracker] Heartbeat pulse failed:', err);
    }
  }
}

export const appActivityTracker = new AppActivityTracker();
