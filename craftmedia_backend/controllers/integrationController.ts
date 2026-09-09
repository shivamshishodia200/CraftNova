/**
 * Central Enterprise Integration Controller
 * 
 * Provides HTTP endpoints for managing connectors, credentials,
 * real-time tests, manual synchronization, logs, and telemetry.
 */

import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { IntegrationSecurityService } from '../integrations/security.service';
import { getProviderAdapter } from '../integrations/providers';
import { IntegrationSchedulerService } from '../integrations/scheduler.service';
import { CustomRestAdapter } from '../integrations/providers/customRest.adapter';

/**
 * GET /api/integrations
 * Returns all configured integrations with masked sensitive credentials
 */
export async function getIntegrations(req: AuthenticatedRequest, res: Response) {
  try {
    const list = db.integrations.getAll();
    const masked = list.map(int => IntegrationSecurityService.maskCredentials(int));
    return res.json({ success: true, data: masked });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/integrations/:id
 * Returns single integration record with masked credentials
 */
export async function getIntegrationById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const integration = db.integrations.findById(id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    return res.json({ success: true, data: IntegrationSecurityService.maskCredentials(integration) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations
 * Registers a new API connector / webhook gateway
 */
export async function createIntegration(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      name,
      code,
      provider,
      category,
      connectionMode,
      status = 'ACTIVE',
      endpointUrl,
      method = 'GET',
      authType = 'API_KEY',
      apiKey,
      apiSecret,
      webhookSecret,
      syncFrequency = 'EVERY_5_MIN',
      description,
      config = {},
      fieldMapping
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Connector name and code are required' });
    }

    // SSRF Check if endpoint URL provided
    if (endpointUrl && endpointUrl.startsWith('http')) {
      const check = IntegrationSecurityService.validateSafeUrl(endpointUrl);
      if (!check.isValid) {
        return res.status(400).json({ success: false, message: `Invalid endpoint URL: ${check.error}` });
      }
    }

    const count = db.integrations.countDocuments() + 1;
    const _id = `int_${Date.now()}_${count}`;
    const now = new Date().toISOString();

    const newDoc = db.integrations.insertOne({
      _id,
      name,
      code: code.toLowerCase().replace(/\s+/g, '_'),
      provider: provider || name,
      category: category || 'PORTAL',
      connectionMode: connectionMode || (code.includes('webhook') ? 'WEBHOOK' : 'POLLING'),
      status,
      endpointUrl: endpointUrl || (connectionMode === 'WEBHOOK' ? `/api/webhooks/leads/${_id}` : undefined),
      method,
      authType,
      apiKey,
      apiSecret,
      webhookSecret: webhookSecret || `whsec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      syncFrequency,
      description: description || '',
      config: config || {},
      fieldMapping: fieldMapping || {},
      totalSyncedEvents: 0,
      totalFetched: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
      createdBy: req.user?.name || 'Admin',
      createdAt: now,
      updatedAt: now
    });

    recordAuditLog(req, 'CREATE', 'integrations', 'Integration', _id, null, newDoc);

    return res.status(201).json({
      success: true,
      message: `API Connector '${name}' registered successfully`,
      data: IntegrationSecurityService.maskCredentials(newDoc)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/integrations/:id
 * Updates integration parameters while safely preserving existing masked secrets
 */
export async function updateIntegration(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.integrations.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    const {
      name,
      code,
      provider,
      category,
      connectionMode,
      status,
      endpointUrl,
      method,
      authType,
      apiKey,
      apiSecret,
      webhookSecret,
      syncFrequency,
      description,
      config,
      fieldMapping
    } = req.body;

    // Helper: preserve existing secret if user did not modify masked string
    const resolveSecret = (incoming: string | undefined, current: string | undefined) => {
      if (incoming === undefined) return current;
      if (incoming.includes('••••')) return current; // User didn't edit masked placeholder
      return incoming;
    };

    // Clean config object to preserve existing masked nested secrets
    const mergedConfig = { ...(existing.config || {}) };
    if (config && typeof config === 'object') {
      for (const [k, v] of Object.entries(config)) {
        if (typeof v === 'string' && v.includes('••••')) {
          // Keep existing value
        } else {
          mergedConfig[k] = v;
        }
      }
    }

    const updatedData = {
      ...(name && { name }),
      ...(code && { code }),
      ...(provider && { provider }),
      ...(category && { category }),
      ...(connectionMode && { connectionMode }),
      ...(status && { status }),
      ...(endpointUrl !== undefined && { endpointUrl }),
      ...(method && { method }),
      ...(authType && { authType }),
      apiKey: resolveSecret(apiKey, existing.apiKey),
      apiSecret: resolveSecret(apiSecret, existing.apiSecret),
      webhookSecret: resolveSecret(webhookSecret, existing.webhookSecret),
      ...(syncFrequency && { syncFrequency }),
      ...(description !== undefined && { description }),
      config: mergedConfig,
      ...(fieldMapping !== undefined && { fieldMapping }),
      updatedBy: req.user?.name || 'Admin',
      updatedAt: new Date().toISOString()
    };

    const updated = db.integrations.updateById(id, updatedData);
    recordAuditLog(req, 'UPDATE', 'integrations', 'Integration', id, existing, updatedData);

    return res.json({
      success: true,
      message: 'Integration updated successfully',
      data: updated ? IntegrationSecurityService.maskCredentials(updated) : null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/integrations/:id
 * Removes an integration connector
 */
export async function deleteIntegration(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.integrations.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Integration not found' });

    db.integrations.deleteById(id);
    recordAuditLog(req, 'DELETE', 'integrations', 'Integration', id, existing, null);

    return res.json({ success: true, message: `Connector '${existing.name}' deleted successfully` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations/:id/test
 * Triggers a live, non-destructive connection handshake test
 */
export async function testIntegrationConnection(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const integration = db.integrations.findById(id);
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    const adapter = getProviderAdapter(integration.code);
    if (!adapter) {
      return res.status(400).json({ success: false, message: `No adapter found for provider code '${integration.code}'` });
    }

    const testResult = await adapter.testConnection(integration);

    db.integrations.updateById(id, {
      lastTestStatus: testResult.success ? 'SUCCESS' : 'FAILED',
      lastTestResponse: testResult.message,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'TEST_CONNECTION', 'integrations', integration.name, id, null, testResult);

    return res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations/:id/sync
 * Triggers an immediate manual data synchronization run
 */
export async function syncIntegrationNow(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const integration = db.integrations.findById(id);
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    const result = await IntegrationSchedulerService.executeIntegrationSync(
      integration,
      true,
      req.user?.name || 'Admin'
    );

    const fresh = db.integrations.findById(id);
    recordAuditLog(req, 'MANUAL_SYNC', 'integrations', integration.name, id, null, result);

    return res.json({
      success: result.success,
      message: result.message,
      data: {
        result,
        integration: fresh ? IntegrationSecurityService.maskCredentials(fresh) : null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations/:id/activate
 */
export async function activateIntegration(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const updated = db.integrations.updateById(id, {
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Integration not found' });

    recordAuditLog(req, 'ACTIVATE', 'integrations', updated.name, id, null, { status: 'ACTIVE' });
    return res.json({ success: true, message: `Connector '${updated.name}' activated.`, data: IntegrationSecurityService.maskCredentials(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations/:id/pause
 */
export async function pauseIntegration(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const updated = db.integrations.updateById(id, {
      status: 'PAUSED',
      updatedAt: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Integration not found' });

    recordAuditLog(req, 'PAUSE', 'integrations', updated.name, id, null, { status: 'PAUSED' });
    return res.json({ success: true, message: `Connector '${updated.name}' paused.`, data: IntegrationSecurityService.maskCredentials(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/integrations/:id/logs
 * Returns execution and error logs for an integration
 */
export async function getIntegrationLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const limit = Number(req.query.limit) || 50;

    let logs = db.integrationLogs.find(l => !id || id === 'all' || l.integrationId === id);
    logs.sort((a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime());

    return res.json({
      success: true,
      data: logs.slice(0, limit)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/integrations/custom-rest/preview
 * Executes a test fetch and returns sample records for field mapping configuration
 * Supports all connector types (TradeIndia, IndiaMART, WhatsApp, Webhook, Razorpay, Stripe, Custom REST).
 */
export async function testCustomRestPreview(req: AuthenticatedRequest, res: Response) {
  try {
    const tempIntegration = { ...(req.body || {}) };

    // Resolve unmasked secrets if user left masked placeholders in form
    let existing: any = null;
    if (tempIntegration._id) {
      existing = db.integrations.findById(tempIntegration._id);
    } else if (tempIntegration.code) {
      existing = db.integrations.findOne(i => i.code === tempIntegration.code);
    }

    if (existing) {
      if (!tempIntegration.apiKey || tempIntegration.apiKey.includes('••••')) {
        tempIntegration.apiKey = existing.apiKey;
      }
      if (!tempIntegration.apiSecret || tempIntegration.apiSecret.includes('••••')) {
        tempIntegration.apiSecret = existing.apiSecret;
      }
      if (!tempIntegration.webhookSecret || tempIntegration.webhookSecret.includes('••••')) {
        tempIntegration.webhookSecret = existing.webhookSecret;
      }

      if (tempIntegration.config && typeof tempIntegration.config === 'object') {
        const mergedConfig = { ...(existing.config || {}) };
        for (const [k, v] of Object.entries(tempIntegration.config)) {
          if (typeof v === 'string' && v.includes('••••')) {
            // Keep existing value
          } else {
            mergedConfig[k] = v;
          }
        }
        tempIntegration.config = mergedConfig;
      }
    }

    // Check .env for TradeIndia if still masked or missing
    if (tempIntegration.code === 'tradeindia') {
      const cfg = tempIntegration.config || {};
      if ((!cfg.userId || cfg.userId.includes('••••')) && process.env.TRADEINDIA_USER_ID) {
        cfg.userId = process.env.TRADEINDIA_USER_ID.trim();
      }
      if ((!cfg.profileId || cfg.profileId.includes('••••')) && process.env.TRADEINDIA_PROFILE_ID) {
        cfg.profileId = process.env.TRADEINDIA_PROFILE_ID.trim();
      }
      if ((!tempIntegration.apiKey || tempIntegration.apiKey.includes('••••')) && process.env.TRADEINDIA_API_KEY) {
        tempIntegration.apiKey = process.env.TRADEINDIA_API_KEY.trim();
      }
      tempIntegration.config = cfg;
    }

    const adapter = getProviderAdapter(tempIntegration.code) || new CustomRestAdapter();
    const result = await adapter.testConnection(tempIntegration);

    return res.json({
      success: result.success,
      message: result.message,
      data: result.sampleData,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
