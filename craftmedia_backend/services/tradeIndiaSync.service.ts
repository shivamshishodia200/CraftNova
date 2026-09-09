/**
 * TradeIndia High-Level Synchronization Engine
 * 
 * Orchestrates automated and manual synchronization of TradeIndia Buy Leads,
 * managing date ranges, pagination, duplicate prevention, immutable CRM state rules,
 * database updates, and telemetry logging.
 */

import { db } from '../database/db';
import { TradeIndiaService, NormalizedTradeIndiaLead } from './tradeIndia.service';

export interface SyncExecutionStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  fromDate: string;
  toDate: string;
  pagesProcessed: number;
  durationMs: number;
}

export interface SyncServiceResult {
  success: boolean;
  message: string;
  data: SyncExecutionStats;
  error?: string;
}

export class TradeIndiaSyncService {
  private static isSyncRunning = false;

  /**
   * Helper to format Date to YYYY-MM-DD string
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Resolves the TradeIndia integration record from DB or creates it if missing.
   */
  public static getIntegrationRecord() {
    let integration = db.integrations.findOne(i => i.code === 'tradeindia' || i._id === 'int_1');
    if (!integration) {
      integration = db.integrations.insertOne({
        _id: 'int_1',
        name: 'TradeIndia Lead Sync Connector',
        code: 'tradeindia',
        category: 'PORTAL',
        status: 'ACTIVE',
        method: 'GET',
        authType: 'API_KEY',
        syncFrequency: 'EVERY_5_MIN',
        description: 'Automated 5-minute background synchronization of TradeIndia Buy Leads directly into CRM pipeline.',
        config: {
          autoAssignLead: false,
          defaultPriority: 'MEDIUM',
          syncRespondedLeads: true,
          initialSyncDaysBack: 14
        },
        totalSyncedEvents: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return integration;
  }

  /**
   * Calculates the sync date window:
   * to_date = today
   * from_date = (lastSuccessfulSync - 1 day overlap) OR (today - initialSyncDaysBack)
   */
  public static calculateDateRange(customFromDate?: string, customToDate?: string): { fromDate: string; toDate: string } {
    const today = new Date();
    const toDate = customToDate || this.formatDate(today);

    if (customFromDate) {
      return { fromDate: customFromDate, toDate };
    }

    const integration = this.getIntegrationRecord();
    const initialDaysBack = Number(integration.config?.initialSyncDaysBack) || 7;

    if (integration.lastSuccessfulSyncAt) {
      const lastSync = new Date(integration.lastSuccessfulSyncAt);
      if (!isNaN(lastSync.getTime())) {
        // Subtract 1 day for safe overlap window
        lastSync.setDate(lastSync.getDate() - 1);
        return {
          fromDate: this.formatDate(lastSync),
          toDate
        };
      }
    }

    // Default for first synchronization
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - initialDaysBack);
    return {
      fromDate: this.formatDate(defaultStart),
      toDate
    };
  }

  /**
   * Executes the full TradeIndia Synchronization pipeline
   */
  public static async executeSync(options: {
    manualTrigger?: boolean;
    triggeredBy?: string;
    fromDate?: string;
    toDate?: string;
    limitPerPage?: number;
  } = {}): Promise<SyncServiceResult> {
    if (this.isSyncRunning) {
      return {
        success: false,
        message: 'Synchronization is already in progress. Please wait for the current run to complete.',
        data: {
          fetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          fromDate: '',
          toDate: '',
          pagesProcessed: 0,
          durationMs: 0
        }
      };
    }

    this.isSyncRunning = true;
    const startTime = Date.now();
    const integration = this.getIntegrationRecord();
    const limit = options.limitPerPage || 50;
    const { fromDate, toDate } = this.calculateDateRange(options.fromDate, options.toDate);

    const stats: SyncExecutionStats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      fromDate,
      toDate,
      pagesProcessed: 0,
      durationMs: 0
    };

    console.log('====================================================');
    console.log(`[TradeIndia Sync] 🚀 Starting Synchronization (${options.manualTrigger ? 'Manual by ' + (options.triggeredBy || 'Admin') : 'Automated 5-min Cron'})`);
    console.log(`[TradeIndia Sync] Date Range: ${fromDate} to ${toDate} (Page Limit: ${limit})`);
    console.log('====================================================');

    try {
      // Step A: Sync Latest Normal Buy Leads (responded_buy_leads = 0)
      await this.syncLeadStream({
        fromDate,
        toDate,
        limit,
        isResponded: false,
        stats,
        integration
      });

      // Step B: Sync Responded Buy Leads (responded_buy_leads = 1) if enabled
      if (integration.config?.syncRespondedLeads !== false) {
        await this.syncLeadStream({
          fromDate,
          toDate,
          limit,
          isResponded: true,
          stats,
          integration
        });
      }

      const durationMs = Date.now() - startTime;
      stats.durationMs = durationMs;

      // Update Integration Telemetry Record
      const now = new Date().toISOString();
      const nextSync = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const newTotal = (integration.totalSyncedEvents || 0) + stats.created + stats.updated;

      db.integrations.updateById(integration._id, {
        status: 'ACTIVE',
        lastSyncedAt: now,
        lastSuccessfulSyncAt: now,
        nextSyncAt: nextSync,
        lastSyncStatus: 'SUCCESS',
        lastSyncError: undefined,
        lastSyncResult: {
          fetched: stats.fetched,
          created: stats.created,
          updated: stats.updated,
          skipped: stats.skipped,
          failed: stats.failed
        },
        totalSyncedEvents: newTotal,
        lastTestStatus: 'SUCCESS',
        lastTestResponse: `Sync completed in ${(durationMs / 1000).toFixed(1)}s: ${stats.created} new leads created, ${stats.updated} leads updated.`,
        updatedAt: now
      });

      // Update Lead Source Counters
      const tiSource = db.leadSources.findOne(s => s.name.toUpperCase().includes('TRADEINDIA'));
      if (tiSource) {
        db.leadSources.updateById(tiSource._id, {
          leadsCount: (tiSource.leadsCount || 0) + stats.created,
          updatedAt: now
        });
      }

      console.log('====================================================');
      console.log(`[TradeIndia Sync] ✅ Finished in ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`[TradeIndia Sync] Fetched: ${stats.fetched} | Created: ${stats.created} | Updated: ${stats.updated} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`);
      console.log('====================================================');

      return {
        success: true,
        message: `TradeIndia sync completed successfully: ${stats.created} new leads imported, ${stats.updated} updated.`,
        data: stats
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      stats.durationMs = durationMs;
      const errorMsg = err.message || 'Unknown sync error';

      console.error(`[TradeIndia Sync] ❌ Synchronization failed: ${errorMsg}`);

      const now = new Date().toISOString();
      const nextSync = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      db.integrations.updateById(integration._id, {
        lastSyncedAt: now,
        nextSyncAt: nextSync,
        lastSyncStatus: 'FAILED',
        lastSyncError: errorMsg,
        lastSyncResult: {
          fetched: stats.fetched,
          created: stats.created,
          updated: stats.updated,
          skipped: stats.skipped,
          failed: stats.failed
        },
        lastTestStatus: 'FAILED',
        lastTestResponse: `Sync error: ${errorMsg}`,
        updatedAt: now
      });

      return {
        success: false,
        message: `TradeIndia synchronization error: ${errorMsg}`,
        data: stats,
        error: errorMsg
      };
    } finally {
      this.isSyncRunning = false;
    }
  }

  /**
   * Handles multi-page stream fetching for either normal or responded leads
   */
  private static async syncLeadStream(params: {
    fromDate: string;
    toDate: string;
    limit: number;
    isResponded: boolean;
    stats: SyncExecutionStats;
    integration: any;
  }) {
    let pageNo = 1;
    let keepGoing = true;
    const maxPages = 50; // Safety guard to avoid runaway loops

    while (keepGoing && pageNo <= maxPages) {
      params.stats.pagesProcessed++;
      const result = await TradeIndiaService.fetchBuyLeads({
        fromDate: params.fromDate,
        toDate: params.toDate,
        limit: params.limit,
        pageNo,
        respondedBuyLeads: params.isResponded ? 1 : 0
      });

      if (!result.success) {
        console.warn(`[TradeIndia Sync] Stream (${params.isResponded ? 'Responded' : 'Normal'}) stopped at page ${pageNo}: ${result.error || 'Fetch failure'}`);
        break;
      }

      const leadsOnPage = result.data || [];
      params.stats.fetched += leadsOnPage.length;

      if (leadsOnPage.length === 0) {
        break;
      }

      // Process each individual lead in isolation
      for (const rawLead of leadsOnPage) {
        try {
          this.processSingleLead(rawLead, params.stats, params.integration);
        } catch (leadErr: any) {
          console.error(`[TradeIndia Sync] ❌ Error processing lead ${rawLead.sourceLeadId}:`, leadErr.message);
          params.stats.failed++;
        }
      }

      // If page had fewer items than limit or hasMore is false, finish stream
      if (!result.hasMore || leadsOnPage.length < params.limit) {
        keepGoing = false;
      } else {
        pageNo++;
      }
    }
  }

  /**
   * Core duplicate check and atomic upsert with strict CRM data immutability
   */
  private static processSingleLead(
    lead: NormalizedTradeIndiaLead,
    stats: SyncExecutionStats,
    integration: any
  ) {
    const srcId = String(lead.sourceLeadId || '').trim();
    if (!srcId) {
      stats.skipped++;
      return;
    }

    // Duplicate Check: Look for existing lead with source='TradeIndia' and sourceLeadId
    const existing = db.leads.findOne(l =>
      (l.source === 'TradeIndia' || l.source === 'TRADEINDIA') &&
      ((Boolean(l.sourceLeadId) && l.sourceLeadId === srcId) || (Boolean(l.externalLeadId) && l.externalLeadId === srcId))
    );

    if (existing) {
      // =========================================================================
      // CASE 1: EXISTING LEAD (SAFE UPDATE OF EXTERNAL SOURCE DATA ONLY)
      // =========================================================================
      // BUSINESS RULE: Never overwrite sales workflow state (status, priority,
      // assigned representative, internal follow-ups, converted state, internal notes).
      
      const updatedExternalData: Record<string, any> = {
        name: lead.senderName || existing.name,
        companyName: lead.companyName || existing.companyName || '',
        email: lead.email || existing.email || '',
        phone: lead.phone || existing.phone,
        city: lead.city || existing.city || 'Varanasi',
        state: lead.state || existing.state || 'Uttar Pradesh',
        country: lead.country || existing.country || 'India',
        productName: lead.productName || existing.productName || 'Industrial Sourcing Requirement',
        quantity: lead.quantity || existing.quantity || '',
        requirement: lead.productName || existing.requirement || existing.notes || 'TradeIndia Sourcing Inquiry',
        rawSourceData: lead.raw,
        updatedAt: new Date().toISOString()
      };

      db.leads.updateById(existing._id, updatedExternalData);
      stats.updated++;
      console.log(`[TradeIndia Sync] 🔄 Updated external info for existing lead ${existing.leadCode || existing._id} (Source ID: ${lead.sourceLeadId})`);
    } else {
      // =========================================================================
      // CASE 2: NEW LEAD (REGISTER NEW CRM LEAD)
      // =========================================================================
      const count = db.leads.countDocuments();
      const year = new Date().getFullYear();
      const leadCode = `LD-${year}-${String(count + 1).padStart(4, '0')}`;

      // Estimated value calculation from quantity/order value
      let estimatedVal = 50000;
      const rawQtyStr = String(lead.quantity || '').trim();
      const numQty = parseFloat(rawQtyStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(numQty) && numQty > 0) {
        estimatedVal = Math.min(Math.max(numQty * 500, 25000), 500000);
      }

      // Initial Lead Score
      let score = 40;
      if (lead.email && lead.email.includes('@')) score += 20;
      if (lead.companyName) score += 20;
      if (lead.quantity) score += 10;

      // Lead Assignment - Unassigned by default
      let assignedName: string | undefined = undefined;
      let assignedId: string | undefined = undefined;

      if (integration.config?.autoAssignLead === true && integration.config?.defaultRep) {
        const rep = db.users.findById(integration.config.defaultRep);
        if (rep) {
          assignedName = rep.name;
          assignedId = rep._id;
        }
      }

      const notesContent = `TradeIndia ${lead.leadType === 'RESPONDED_BUY_LEAD' ? 'Responded Buy Lead' : 'Direct Buy Lead'}: Product: ${lead.productName || 'General Requirement'}.${lead.quantity ? ' Qty: ' + lead.quantity + '.' : ''} Location: ${lead.city || 'Varanasi'}, ${lead.state || 'UP'}.${lead.queryMessage ? ' Buyer Message: ' + lead.queryMessage : ''}`;

      const newLead = db.leads.insertOne({
        leadCode,
        name: lead.senderName || 'TradeIndia Buyer',
        companyName: lead.companyName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: 'TradeIndia',
        channel: 'B2B Portal',
        status: 'NEW',
        priority: integration.config?.defaultPriority || 'MEDIUM',
        stage: 'LEAD_CAPTURED',
        leadScore: Math.min(score, 100),
        assignedTo: assignedName || undefined,
        assignedToId: assignedId || undefined,
        estimatedValue: estimatedVal,
        probability: 30,
        city: lead.city || 'Varanasi',
        state: lead.state || 'Uttar Pradesh',
        country: lead.country || 'India',
        productName: lead.productName || 'Industrial Sourcing Requirement',
        quantity: lead.quantity || '',
        requirement: lead.productName || 'TradeIndia Inquiry',
        sourceLeadId: lead.sourceLeadId,
        externalLeadId: lead.sourceLeadId,
        rawSourceData: lead.raw || {},
        notes: notesContent,
        tags: ['TradeIndia', 'B2B Portal', lead.leadType === 'RESPONDED_BUY_LEAD' ? 'Responded Lead' : 'Buy Lead'],
        createdAt: lead.leadDate || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Add to CRM Activity Timeline
      db.activityTimeline.insertOne({
        entityType: 'LEAD',
        entityId: newLead._id,
        action: 'SYNC',
        description: `New lead auto-ingested from TradeIndia Buy Leads API (${lead.productName || 'TradeIndia Lead'})`,
        performedBy: 'TradeIndia Sync Engine',
        timestamp: new Date().toISOString()
      });

      stats.created++;
      console.log(`[TradeIndia Sync] ✨ Created new lead ${leadCode} (${newLead.name} - ${lead.productName}) [Source ID: ${lead.sourceLeadId}]`);
    }
  }

  /**
   * Returns current integration status and telemetry without exposing sensitive credentials
   */
  public static getStatus() {
    const integration = this.getIntegrationRecord();
    const { isConfigured } = TradeIndiaService.getCredentials();

    return {
      active: integration.status === 'ACTIVE',
      status: integration.lastSyncStatus === 'FAILED' ? 'error' : (isConfigured ? 'healthy' : 'ready'),
      isConfigured,
      isRunning: this.isSyncRunning,
      lastSyncAt: integration.lastSyncedAt || null,
      lastSuccessfulSyncAt: integration.lastSuccessfulSyncAt || null,
      nextSyncAt: integration.nextSyncAt || null,
      totalSyncedEvents: integration.totalSyncedEvents || 0,
      lastResult: integration.lastSyncResult || {
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      },
      lastError: integration.lastSyncError || null,
      syncFrequency: integration.syncFrequency || 'EVERY_5_MIN'
    };
  }
}
