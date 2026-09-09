/**
 * IndiaMART Lead Sync Provider Adapter
 */

import { IntegrationDoc } from '../../database/types';
import { IntegrationEngineService } from '../engine.service';
import { IProviderAdapter, NormalizedLead, SyncOptions, SyncResult, TestResult, WebhookResult } from '../types';

export class IndiaMartAdapter implements IProviderAdapter {
  public readonly code = 'indiamart';
  public readonly name = 'IndiaMART Lead Sync API';
  public readonly provider = 'IndiaMART';

  private resolveCredentials(integration: IntegrationDoc) {
    const config = integration.config || {};
    const apiUrl = config.apiUrl || integration.endpointUrl || 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';
    const crmKey = String(integration.apiKey || config.crmKey || config.apiKey || config.key || '').trim();
    const glusrMobile = String(config.glusrMobile || config.mobile || '').trim();

    const isConfigured = Boolean(crmKey && crmKey !== 'YOUR_INDIAMART_KEY');
    return { apiUrl, crmKey, glusrMobile, isConfigured };
  }

  public async testConnection(integration: IntegrationDoc): Promise<TestResult> {
    const startTime = Date.now();
    const { apiUrl, crmKey, glusrMobile, isConfigured } = this.resolveCredentials(integration);

    if (!isConfigured) {
      return {
        success: true,
        statusCode: 200,
        latencyMs: 50,
        message: 'IndiaMART connector ready. Enter your IndiaMART CRM Key to enable automatic synchronization.'
      };
    }

    try {
      const url = new URL(apiUrl);
      url.searchParams.set('glusr_crm_key', crmKey);
      if (glusrMobile) url.searchParams.set('glusr_mobile', glusrMobile);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });

      const latencyMs = Date.now() - startTime;
      const rawText = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // text
      }

      if (!response.ok || (parsed && (parsed.STATUS === 'FAILURE' || parsed.CODE === 401 || parsed.CODE === 403))) {
        const errorMsg = parsed?.MESSAGE || `IndiaMART HTTP ${response.status}: ${response.statusText}`;
        return {
          success: false,
          statusCode: response.status || 400,
          latencyMs,
          message: `IndiaMART: ${errorMsg}`,
          error: errorMsg
        };
      }

      return {
        success: true,
        statusCode: 200,
        latencyMs,
        message: `IndiaMART CRM API connection verified successfully (${latencyMs}ms). Endpoint active.`,
        sampleData: rawText.slice(0, 200)
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Failed to connect to IndiaMART API: ${err.message}`,
        error: err.message
      };
    }
  }

  public async sync(integration: IntegrationDoc, options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const { apiUrl, crmKey, glusrMobile, isConfigured } = this.resolveCredentials(integration);

    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      durationMs: 0
    };

    if (!isConfigured) {
      stats.durationMs = Date.now() - startTime;
      return {
        success: true,
        message: 'IndiaMART credentials are not configured.',
        stats
      };
    }

    try {
      const url = new URL(apiUrl);
      url.searchParams.set('glusr_crm_key', crmKey);
      if (glusrMobile) url.searchParams.set('glusr_mobile', glusrMobile);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      const rawText = await response.text();
      let records: any[] = [];
      let parsed: any = null;

      try {
        parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) records = parsed;
        else if (Array.isArray(parsed.RESPONSE)) records = parsed.RESPONSE;
        else if (Array.isArray(parsed.response)) records = parsed.response;
        else if (Array.isArray(parsed.data)) records = parsed.data;
      } catch {
        if (!rawText.toLowerCase().includes('no record') && rawText.trim()) {
          console.warn(`[IndiaMART Adapter] Received non-JSON response: ${rawText.slice(0, 100)}`);
        }
      }

      if (!response.ok || (parsed && (parsed.STATUS === 'FAILURE' || parsed.CODE === 401 || parsed.CODE === 403))) {
        const errorMsg = parsed?.MESSAGE || `IndiaMART HTTP ${response.status}: ${response.statusText}`;
        stats.durationMs = Date.now() - startTime;
        const now = new Date().toISOString();

        IntegrationEngineService.updateTelemetry(integration._id, {
          lastSyncedAt: now,
          lastSyncStatus: 'FAILED',
          lastSyncError: errorMsg,
          lastTestStatus: 'FAILED',
          lastTestResponse: `Sync error: ${errorMsg}`
        });

        IntegrationEngineService.recordLog({
          integrationId: integration._id,
          integrationName: integration.name,
          provider: this.provider,
          triggerType: options.manualTrigger ? 'MANUAL' : 'SCHEDULED',
          status: 'FAILED',
          startedAt: new Date(startTime).toISOString(),
          completedAt: now,
          durationMs: stats.durationMs,
          fetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          errorMessage: errorMsg,
          requestId: `im_sync_${Date.now()}`
        });

        return {
          success: false,
          message: `IndiaMART sync error: ${errorMsg}`,
          stats,
          error: errorMsg
        };
      }

      stats.fetched = records.length;

      for (const raw of records) {
        try {
          const leadId = String(raw.UNIQUE_QUERY_ID || raw.QUERY_ID || raw.query_id || raw.id || '');
          const normalized: NormalizedLead = {
            externalLeadId: leadId || `im_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: String(raw.SENDER_NAME || raw.sender_name || raw.name || 'IndiaMART Buyer').trim(),
            companyName: String(raw.SENDER_COMPANY || raw.sender_company || raw.company || '').trim(),
            email: String(raw.SENDER_EMAIL || raw.sender_email || raw.email || '').trim(),
            phone: String(raw.SENDER_MOBILE || raw.sender_mobile || raw.mobile || raw.phone || '').trim(),
            alternatePhone: String(raw.SENDER_MOBILE_ALT || raw.alt_mobile || '').trim(),
            city: String(raw.GLUSR_USR_CITY || raw.city || 'Varanasi').trim(),
            state: String(raw.GLUSR_USR_STATE || raw.state || 'Uttar Pradesh').trim(),
            country: String(raw.GLUSR_USR_COUNTRY || raw.country || 'India').trim(),
            address: String(raw.ENQ_ADDRESS || raw.address || '').trim(),
            productName: String(raw.PRODUCT_NAME || raw.SUBJECT || raw.subject || 'IndiaMART Requirement').trim(),
            quantity: String(raw.QUANTITY || raw.quantity || '').trim(),
            requirement: String(raw.PRODUCT_NAME || raw.QUERY_MESSAGE || raw.message || 'IndiaMART Buyer Enquiry').trim(),
            message: String(raw.QUERY_MESSAGE || raw.message || '').trim(),
            source: 'IndiaMART',
            channel: 'B2B Portal',
            priority: integration.config?.defaultPriority || 'MEDIUM',
            externalCreatedAt: raw.DATE_TIME_RE || raw.inquiryDate || new Date().toISOString(),
            tags: ['IndiaMART', 'B2B Portal', 'Enquiry'],
            raw
          };

          const result = await IntegrationEngineService.ingestLead(normalized, integration);
          if (result.isNew) stats.created++;
          else if (result.skipped) stats.skipped++;
          else stats.updated++;
        } catch (leadErr) {
          stats.failed++;
        }
      }

      stats.durationMs = Date.now() - startTime;
      const now = new Date().toISOString();
      const nextSync = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      IntegrationEngineService.updateTelemetry(integration._id, {
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
        totalSyncedEvents: (integration.totalSyncedEvents || 0) + stats.created + stats.updated,
        totalFetched: (integration.totalFetched || 0) + stats.fetched,
        totalCreated: (integration.totalCreated || 0) + stats.created,
        totalUpdated: (integration.totalUpdated || 0) + stats.updated,
        totalFailed: (integration.totalFailed || 0) + stats.failed
      });

      IntegrationEngineService.recordLog({
        integrationId: integration._id,
        integrationName: integration.name,
        provider: this.provider,
        triggerType: options.manualTrigger ? 'MANUAL' : 'SCHEDULED',
        status: 'SUCCESS',
        startedAt: new Date(startTime).toISOString(),
        completedAt: now,
        durationMs: stats.durationMs,
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        requestId: `im_sync_${Date.now()}`
      });

      return {
        success: true,
        message: `IndiaMART synchronization complete: ${stats.created} new leads created, ${stats.updated} updated in ${(stats.durationMs / 1000).toFixed(1)}s.`,
        stats
      };
    } catch (err: any) {
      stats.durationMs = Date.now() - startTime;
      const now = new Date().toISOString();

      IntegrationEngineService.updateTelemetry(integration._id, {
        lastSyncedAt: now,
        lastSyncStatus: 'FAILED',
        lastSyncError: err.message
      });

      IntegrationEngineService.recordLog({
        integrationId: integration._id,
        integrationName: integration.name,
        provider: this.provider,
        triggerType: options.manualTrigger ? 'MANUAL' : 'SCHEDULED',
        status: 'FAILED',
        startedAt: new Date(startTime).toISOString(),
        completedAt: now,
        durationMs: stats.durationMs,
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        errorMessage: err.message
      });

      return {
        success: false,
        message: `IndiaMART synchronization error: ${err.message}`,
        stats,
        error: err.message
      };
    }
  }

  public async handleWebhook(integration: IntegrationDoc, reqBody: any): Promise<WebhookResult> {
    const raw = reqBody || {};
    const leadId = String(raw.UNIQUE_QUERY_ID || raw.QUERY_ID || raw.query_id || raw.id || `im_wh_${Date.now()}`);

    const normalized: NormalizedLead = {
      externalLeadId: leadId,
      name: String(raw.SENDER_NAME || raw.sender_name || raw.name || 'IndiaMART Buyer').trim(),
      companyName: String(raw.SENDER_COMPANY || raw.company || '').trim(),
      email: String(raw.SENDER_EMAIL || raw.email || '').trim(),
      phone: String(raw.SENDER_MOBILE || raw.phone || raw.mobile || '').trim(),
      city: String(raw.GLUSR_USR_CITY || raw.city || 'Varanasi').trim(),
      state: String(raw.GLUSR_USR_STATE || raw.state || 'Uttar Pradesh').trim(),
      productName: String(raw.PRODUCT_NAME || raw.SUBJECT || 'IndiaMART Requirement').trim(),
      requirement: String(raw.PRODUCT_NAME || raw.QUERY_MESSAGE || 'IndiaMART Webhook Lead').trim(),
      message: String(raw.QUERY_MESSAGE || raw.message || '').trim(),
      source: 'IndiaMART',
      channel: 'B2B Portal',
      priority: integration.config?.defaultPriority || 'MEDIUM',
      raw
    };

    const res = await IntegrationEngineService.ingestLead(normalized, integration);
    return {
      success: true,
      statusCode: 200,
      message: res.isNew ? 'IndiaMART lead created successfully' : 'IndiaMART lead updated',
      leadId: res.lead?._id
    };
  }
}
