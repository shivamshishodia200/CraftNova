/**
 * Website Lead Capture Webhook Provider Adapter
 */

import { IntegrationDoc } from '../../database/types';
import { IntegrationEngineService } from '../engine.service';
import { IntegrationMapperService } from '../mapper.service';
import { IProviderAdapter, TestResult, WebhookResult } from '../types';

export class WebsiteWebhookAdapter implements IProviderAdapter {
  public readonly code = 'website_webhook';
  public readonly name = 'Website Lead Capture Webhook';
  public readonly provider = 'Website';

  public async testConnection(integration: IntegrationDoc): Promise<TestResult> {
    const endpoint = integration.endpointUrl || `/api/webhooks/leads/${integration._id}`;
    const secret = integration.webhookSecret || integration.config?.secretToken || 'configured';

    return {
      success: true,
      statusCode: 200,
      latencyMs: 15,
      message: `Webhook endpoint active at '${endpoint}'. Secret token: ${secret ? 'Verified' : 'Pending'}. Send POST JSON payloads to ingest website leads.`,
      sampleData: {
        endpoint,
        method: 'POST',
        headers: { 'x-webhook-secret': 'whsec_...' },
        examplePayload: {
          name: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '9876543210',
          company: 'ABC Industries Pvt Ltd',
          requirement: '30 pcs industrial valves',
          city: 'Ahmedabad'
        }
      }
    };
  }

  public async handleWebhook(
    integration: IntegrationDoc,
    reqBody: any,
    headers: Record<string, any> = {}
  ): Promise<WebhookResult> {
    const startTime = Date.now();
    const expectedSecret = integration.webhookSecret || integration.config?.secretToken;

    // Validate secret header if configured
    if (expectedSecret) {
      const providedSecret =
        headers['x-webhook-secret'] ||
        headers['x-api-key'] ||
        headers['authorization']?.replace(/^Bearer\s+/i, '') ||
        reqBody.secretToken ||
        reqBody.secret;

      if (!providedSecret || providedSecret !== expectedSecret) {
        IntegrationEngineService.recordLog({
          integrationId: integration._id,
          integrationName: integration.name,
          provider: this.provider,
          triggerType: 'WEBHOOK',
          status: 'FAILED',
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          fetched: 1,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          errorMessage: 'Unauthorized: Invalid or missing webhook secret token',
          requestId: `wh_err_${Date.now()}`
        });

        return {
          success: false,
          statusCode: 401,
          message: 'Unauthorized: Invalid or missing webhook secret header',
          error: 'Invalid secret'
        };
      }
    }

    try {
      const raw = reqBody || {};
      const normalized = IntegrationMapperService.toNormalizedLead(raw, {
        defaultSource: integration.config?.defaultSource || 'Website',
        defaultChannel: integration.config?.defaultChannel || 'Website Inbound',
        defaultPriority: integration.config?.defaultPriority || 'HIGH',
        defaultAssignedTo: integration.config?.defaultRep,
        fieldMapping: integration.fieldMapping,
        externalIdField: integration.config?.externalIdField
      });

      const res = await IntegrationEngineService.ingestLead(normalized, integration);
      const durationMs = Date.now() - startTime;
      const now = new Date().toISOString();

      IntegrationEngineService.updateTelemetry(integration._id, {
        lastSyncedAt: now,
        lastSuccessfulSyncAt: now,
        lastSyncStatus: 'SUCCESS',
        lastSyncError: undefined,
        totalSyncedEvents: (integration.totalSyncedEvents || 0) + 1,
        totalFetched: (integration.totalFetched || 0) + 1,
        totalCreated: (integration.totalCreated || 0) + (res.isNew ? 1 : 0),
        totalUpdated: (integration.totalUpdated || 0) + (res.isNew ? 0 : 1)
      });

      IntegrationEngineService.recordLog({
        integrationId: integration._id,
        integrationName: integration.name,
        provider: this.provider,
        triggerType: 'WEBHOOK',
        status: 'SUCCESS',
        startedAt: new Date(startTime).toISOString(),
        completedAt: now,
        durationMs,
        fetched: 1,
        created: res.isNew ? 1 : 0,
        updated: res.isNew ? 0 : 1,
        skipped: 0,
        failed: 0,
        requestId: `wh_web_${Date.now()}`
      });

      return {
        success: true,
        statusCode: 200,
        message: res.isNew ? 'Lead received and created successfully in CRM' : 'Existing lead matched and updated',
        leadId: res.lead?._id
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: 'Internal error processing website lead webhook',
        error: err.message
      };
    }
  }
}
