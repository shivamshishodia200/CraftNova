/**
 * Central Enterprise Webhook Ingestion Controller
 * 
 * Handles incoming webhooks for Website Forms, WhatsApp Cloud API,
 * Razorpay & Stripe Payment Notifications, and Portal push payloads.
 */

import { Request, Response } from 'express';
import { db } from '../database/db';
import { getProviderAdapter } from '../integrations/providers';
import { WhatsAppAdapter } from '../integrations/providers/whatsapp.adapter';

/**
 * POST /api/webhooks/leads/:integrationId
 * Ingests leads from website forms or custom webhook callers
 */
export async function handleLeadWebhook(req: Request, res: Response) {
  try {
    const integrationId = req.params.integrationId || 'int_3';
    let integration = db.integrations.findById(integrationId) ||
      db.integrations.findOne(i => i.code === 'website_webhook' || i.code === 'website');

    if (!integration) {
      integration = db.integrations.getAll()[0];
    }

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Webhook integration target not configured' });
    }

    const adapter = getProviderAdapter(integration.code || 'website_webhook');
    if (!adapter || !adapter.handleWebhook) {
      return res.status(400).json({ success: false, message: 'Provider does not support inbound webhooks' });
    }

    const result = await adapter.handleWebhook(integration, req.body, req.headers as Record<string, any>);
    return res.status(result.statusCode || 200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Internal error during webhook ingestion' });
  }
}

/**
 * GET /api/webhooks/whatsapp/:integrationId
 * Responds to Meta WhatsApp Cloud webhook verification challenge
 */
export async function handleWhatsAppVerify(req: Request, res: Response) {
  try {
    const integrationId = req.params.integrationId || 'int_4';
    const integration = db.integrations.findById(integrationId) ||
      db.integrations.findOne(i => i.code === 'whatsapp');

    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const adapter = new WhatsAppAdapter();
    const result = adapter.verifyChallenge(integration || ({} as any), mode, token, challenge);

    if (result.valid && result.challenge) {
      return res.status(200).send(result.challenge);
    }
    return res.status(403).send('Forbidden: Token mismatch');
  } catch (err: any) {
    return res.status(500).send('Internal verification error');
  }
}

/**
 * POST /api/webhooks/whatsapp/:integrationId
 * Ingests inbound WhatsApp messages and auto-creates leads or timeline activities
 */
export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    const integrationId = req.params.integrationId || 'int_4';
    const integration = db.integrations.findById(integrationId) ||
      db.integrations.findOne(i => i.code === 'whatsapp');

    if (!integration) {
      return res.status(404).json({ success: false, message: 'WhatsApp integration target not found' });
    }

    const adapter = new WhatsAppAdapter();
    const result = await adapter.handleWebhook(integration, req.body, req.headers as Record<string, any>);
    return res.status(result.statusCode || 200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to process WhatsApp event' });
  }
}

/**
 * POST /api/webhooks/razorpay/:integrationId
 * Ingests payment captures and settles invoices
 */
export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const integrationId = req.params.integrationId || 'int_5';
    const integration = db.integrations.findById(integrationId) ||
      db.integrations.findOne(i => i.code === 'razorpay');

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Razorpay integration target not found' });
    }

    const adapter = getProviderAdapter('razorpay');
    if (!adapter || !adapter.handleWebhook) {
      return res.status(400).json({ success: false, message: 'Razorpay adapter not available' });
    }

    const result = await adapter.handleWebhook(integration, req.body, req.headers as Record<string, any>);
    return res.status(result.statusCode || 200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to process Razorpay webhook' });
  }
}

/**
 * POST /api/webhooks/stripe/:integrationId
 * Ingests Stripe payment intents and updates CRM accounts
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const integrationId = req.params.integrationId || 'int_6';
    const integration = db.integrations.findById(integrationId) ||
      db.integrations.findOne(i => i.code === 'stripe');

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Stripe integration target not found' });
    }

    const adapter = getProviderAdapter('stripe');
    if (!adapter || !adapter.handleWebhook) {
      return res.status(400).json({ success: false, message: 'Stripe adapter not available' });
    }

    const result = await adapter.handleWebhook(integration, req.body, req.headers as Record<string, any>);
    return res.status(result.statusCode || 200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to process Stripe webhook' });
  }
}
