/**
 * Custom Enterprise REST API Provider Adapter
 * 
 * Generic poller supporting dynamic authentication, custom headers/params,
 * multi-strategy pagination, nested response root extraction, and dynamic field mapping.
 */

import { IntegrationDoc } from '../../database/types';
import { IntegrationEngineService } from '../engine.service';
import { IntegrationMapperService } from '../mapper.service';
import { IntegrationSecurityService } from '../security.service';
import { IProviderAdapter, NormalizedLead, SyncOptions, SyncResult, TestResult } from '../types';

export class CustomRestAdapter implements IProviderAdapter {
  public readonly code = 'custom_rest_api';
  public readonly name = 'Custom REST API Connector';
  public readonly provider = 'Custom REST';

  /**
   * Prepares request options (URL, headers, body) for a given page/offset
   */
  private buildRequest(
    integration: IntegrationDoc,
    pageNo = 1,
    limit = 50
  ): { url: string; method: string; headers: Record<string, string>; body?: string } {
    const config = integration.config || {};
    const baseUrl = integration.endpointUrl || config.apiUrl || '';
    const method = (integration.method || config.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': '360CRM-Custom-Connector/1.0',
      ...(config.headers || {})
    };

    // Apply Authentication Method
    const authType = integration.authType || config.authType || 'API_KEY';
    const apiKey = integration.apiKey || config.apiKey || '';
    const apiSecret = integration.apiSecret || config.apiSecret || '';

    let finalUrl = baseUrl;
    try {
      const urlObj = new URL(baseUrl);

      // Add custom query parameters from config
      if (config.queryParams && typeof config.queryParams === 'object') {
        for (const [k, v] of Object.entries(config.queryParams)) {
          if (v !== undefined && v !== null) urlObj.searchParams.set(k, String(v));
        }
      }

      // Handle Auth Type - protect against masked bullet strings in headers
      const isCleanKey = apiKey && !apiKey.includes('•') && !apiKey.includes('\u2022');
      const isCleanSecret = apiSecret && !apiSecret.includes('•') && !apiSecret.includes('\u2022');

      if (authType === 'BEARER_TOKEN' && isCleanKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'BASIC_AUTH' && isCleanKey) {
        const credentials = Buffer.from(`${apiKey}:${isCleanSecret ? apiSecret : ''}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (authType === 'API_KEY' && isCleanKey) {
        const headerName = config.apiKeyHeaderName || 'x-api-key';
        headers[headerName] = apiKey;
      } else if (authType === 'QUERY_PARAM' && isCleanKey) {
        const paramName = config.apiKeyParamName || 'api_key';
        urlObj.searchParams.set(paramName, apiKey);
      }

      // Handle Pagination Parameters
      const paginationType = config.paginationType || 'PAGE_NUMBER';
      if (paginationType === 'PAGE_NUMBER') {
        const pageParam = config.pageParam || 'page';
        const limitParam = config.limitParam || 'limit';
        urlObj.searchParams.set(pageParam, String(pageNo));
        urlObj.searchParams.set(limitParam, String(limit));
      } else if (paginationType === 'OFFSET') {
        const offsetParam = config.offsetParam || 'offset';
        const limitParam = config.limitParam || 'limit';
        const offset = (pageNo - 1) * limit;
        urlObj.searchParams.set(offsetParam, String(offset));
        urlObj.searchParams.set(limitParam, String(limit));
      }

      finalUrl = urlObj.toString();
    } catch {
      // url might be relative or malformed
    }

    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['Content-Type'] = 'application/json';
      if (config.requestBody) {
        body = typeof config.requestBody === 'string' ? config.requestBody : JSON.stringify(config.requestBody);
      }
    }

    return { url: finalUrl, method, headers, body };
  }

  public async testConnection(integration: IntegrationDoc): Promise<TestResult> {
    const startTime = Date.now();
    const config = integration.config || {};
    const url = integration.endpointUrl || config.apiUrl;

    if (!url) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Endpoint URL is required to test connection.'
      };
    }

    // SSRF Security Check
    const ssrfCheck = IntegrationSecurityService.validateSafeUrl(url);
    if (!ssrfCheck.isValid) {
      return {
        success: false,
        latencyMs: 0,
        message: `Security validation blocked connection: ${ssrfCheck.error}`,
        error: ssrfCheck.error
      };
    }

    try {
      const req = this.buildRequest(integration, 1, 5);
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      const rawText = await response.text();

      let parsedBody: any;
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        parsedBody = rawText.slice(0, 300);
      }

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          latencyMs,
          message: `Endpoint returned HTTP ${response.status}: ${response.statusText}`,
          sampleData: parsedBody,
          error: `HTTP ${response.status}`
        };
      }

      // Extract records to verify root path
      const rootPath = config.responseRootPath;
      const extracted = IntegrationMapperService.extractByJsonPath(parsedBody, rootPath);
      const isArray = Array.isArray(extracted);
      const count = isArray ? extracted.length : (extracted ? 1 : 0);

      return {
        success: true,
        statusCode: response.status,
        latencyMs,
        message: `Connection successful (${latencyMs}ms)! ${count} record(s) resolved at root path '${rootPath || '.'}'.`,
        sampleData: isArray ? extracted.slice(0, 3) : extracted
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Failed to connect to custom REST API: ${err.message}`,
        error: err.message
      };
    }
  }

  public async sync(integration: IntegrationDoc, options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const config = integration.config || {};
    const url = integration.endpointUrl || config.apiUrl;

    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      durationMs: 0,
      pagesProcessed: 0
    };

    if (!url) {
      return { success: false, message: 'Endpoint URL is missing', stats };
    }

    // SSRF Check
    const ssrfCheck = IntegrationSecurityService.validateSafeUrl(url);
    if (!ssrfCheck.isValid) {
      return { success: false, message: `SSRF validation failed: ${ssrfCheck.error}`, stats, error: ssrfCheck.error };
    }

    const paginationType = config.paginationType || 'PAGE_NUMBER';
    const limit = options.limitPerPage || Number(config.limit) || 50;
    const maxPages = paginationType === 'NO_PAGINATION' ? 1 : (Number(config.maxPages) || 15);

    let pageNo = 1;
    let keepGoing = true;

    try {
      while (keepGoing && pageNo <= maxPages) {
        stats.pagesProcessed++;
        const req = this.buildRequest(integration, pageNo, limit);

        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          console.warn(`[Custom REST Adapter] Page ${pageNo} returned HTTP ${response.status}`);
          break;
        }

        const rawText = await response.text();
        let parsedPayload: any;
        try {
          parsedPayload = JSON.parse(rawText);
        } catch {
          console.warn(`[Custom REST Adapter] Failed to parse JSON on page ${pageNo}`);
          break;
        }

        const extracted = IntegrationMapperService.extractByJsonPath(parsedPayload, config.responseRootPath);
        let records: any[] = [];

        if (Array.isArray(extracted)) {
          records = extracted;
        } else if (extracted && typeof extracted === 'object') {
          records = [extracted];
        }

        stats.fetched += records.length;
        if (records.length === 0) break;

        for (const raw of records) {
          try {
            const normalized = IntegrationMapperService.toNormalizedLead(raw, {
              defaultSource: config.defaultSource || integration.name || 'Custom REST API',
              defaultChannel: config.defaultChannel || 'Enterprise API',
              defaultPriority: config.defaultPriority || 'MEDIUM',
              defaultAssignedTo: config.defaultRep,
              fieldMapping: integration.fieldMapping,
              externalIdField: config.externalIdField
            });

            const result = await IntegrationEngineService.ingestLead(normalized, integration);
            if (result.isNew) stats.created++;
            else if (result.skipped) stats.skipped++;
            else stats.updated++;
          } catch {
            stats.failed++;
          }
        }

        if (paginationType === 'NO_PAGINATION' || records.length < limit) {
          keepGoing = false;
        } else {
          pageNo++;
        }
      }

      stats.durationMs = Date.now() - startTime;
      const now = new Date().toISOString();
      const nextSync = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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
        requestId: `rest_sync_${Date.now()}`
      });

      return {
        success: true,
        message: `Custom REST sync completed: ${stats.created} new leads created, ${stats.updated} updated in ${(stats.durationMs / 1000).toFixed(1)}s.`,
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
        message: `Custom REST sync error: ${err.message}`,
        stats,
        error: err.message
      };
    }
  }
}
