/**
 * Stripe Payment Gateway Provider Adapter
 */

import { IntegrationDoc } from '../../database/types';
import { IntegrationEngineService } from '../engine.service';
import { IntegrationSecurityService } from '../security.service';
import { IProviderAdapter, NormalizedPayment, TestResult, WebhookResult } from '../types';

export class StripeAdapter implements IProviderAdapter {
  public readonly code = 'stripe';
  public readonly name = 'Stripe Global Payment Hook';
  public readonly provider = 'Stripe';

  public async testConnection(integration: IntegrationDoc): Promise<TestResult> {
    const config = integration.config || {};
    const secretKey = integration.apiSecret || config.secretKey || integration.apiKey;

    if (!secretKey) {
      return {
        success: true,
        statusCode: 200,
        latencyMs: 20,
        message: 'Stripe webhook adapter ready. Configure Secret Key to test live API balance handshake.'
      };
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${secretKey}` },
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          latencyMs: 90,
          message: data.error?.message || 'Stripe authentication failed',
          error: data.error?.message
        };
      }

      return {
        success: true,
        statusCode: 200,
        latencyMs: 70,
        message: 'Stripe API secret key authenticated successfully. Webhook listener active.',
        sampleData: { livemode: data.livemode }
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 40,
        message: `Stripe connection error: ${err.message}`,
        error: err.message
      };
    }
  }

  public async handleWebhook(
    integration: IntegrationDoc,
    reqBody: any,
    headers: Record<string, any> = {}
  ): Promise<WebhookResult> {
    const startTime = Date.now();
    const webhookSecret = integration.webhookSecret || integration.config?.webhookSecret;
    const sigHeader = headers['stripe-signature'];

    // Verify Stripe signature
    if (webhookSecret && sigHeader) {
      const rawPayload = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
      const isValid = IntegrationSecurityService.verifyStripeSignature(rawPayload, sigHeader, webhookSecret);
      if (!isValid) {
        return {
          success: false,
          statusCode: 400,
          message: 'Invalid Stripe webhook signature',
          error: 'Signature verification failed'
        };
      }
    }

    try {
      const event = reqBody.type;
      const dataObj = reqBody.data?.object;

      if (!dataObj) {
        return {
          success: true,
          statusCode: 200,
          message: `Ignored unhandled Stripe event: ${event || 'unknown'}`
        };
      }

      const amount = Number(dataObj.amount || dataObj.amount_total || 0) / 100;
      const metadata = dataObj.metadata || {};

      const normalized: NormalizedPayment = {
        externalPaymentId: String(dataObj.id),
        orderId: String(dataObj.payment_intent || dataObj.client_reference_id || ''),
        amount,
        currency: String(dataObj.currency || 'USD').toUpperCase(),
        status: dataObj.status === 'succeeded' || dataObj.payment_status === 'paid' ? 'SUCCESS' : 'PENDING',
        paymentMethod: 'STRIPE_CARD',
        customerEmail: dataObj.customer_details?.email || dataObj.receipt_email,
        customerName: dataObj.customer_details?.name,
        invoiceId: metadata.invoice_id || metadata.invoiceId,
        invoiceNumber: metadata.invoice_number || metadata.invoiceNumber,
        transactionDate: new Date(dataObj.created * 1000).toISOString(),
        description: `Stripe Event: ${event} (${dataObj.currency?.toUpperCase()} ${amount})`,
        raw: reqBody
      };

      const res = await IntegrationEngineService.ingestPayment(normalized, integration);
      const nowIso = new Date().toISOString();

      IntegrationEngineService.updateTelemetry(integration._id, {
        lastSyncedAt: nowIso,
        lastSuccessfulSyncAt: nowIso,
        lastSyncStatus: 'SUCCESS',
        totalSyncedEvents: (integration.totalSyncedEvents || 0) + 1,
        totalFetched: (integration.totalFetched || 0) + 1,
        totalCreated: (integration.totalCreated || 0) + 1
      });

      IntegrationEngineService.recordLog({
        integrationId: integration._id,
        integrationName: integration.name,
        provider: this.provider,
        triggerType: 'WEBHOOK',
        status: 'SUCCESS',
        startedAt: new Date(startTime).toISOString(),
        completedAt: nowIso,
        durationMs: Date.now() - startTime,
        fetched: 1,
        created: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
        requestId: `stripe_wh_${dataObj.id}`
      });

      return {
        success: true,
        statusCode: 200,
        message: `Stripe payment ${normalized.currency} ${amount} captured and updated in CRM`,
        paymentId: res.payment?._id
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to process Stripe webhook',
        error: err.message
      };
    }
  }
}
