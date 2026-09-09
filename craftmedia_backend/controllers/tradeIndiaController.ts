/**
 * TradeIndia Integration Controller
 * 
 * Provides HTTP endpoints for manual synchronization triggers
 * and real-time integration status queries without exposing secrets.
 */

import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { TradeIndiaSyncService } from '../services/tradeIndiaSync.service';

/**
 * POST /api/integrations/tradeindia/sync
 * Manually triggers TradeIndia lead synchronization
 */
export async function manualTradeIndiaSync(req: AuthenticatedRequest, res: Response) {
  try {
    const { fromDate, toDate, limit } = req.body || {};

    const result = await TradeIndiaSyncService.executeSync({
      manualTrigger: true,
      triggeredBy: req.user?.name || 'Admin',
      fromDate,
      toDate,
      limitPerPage: limit ? Number(limit) : undefined
    });

    if (result.success) {
      recordAuditLog(
        req,
        'MANUAL_SYNC',
        'integrations',
        'TradeIndia Connector',
        'int_1',
        undefined,
        result.data
      );

      return res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result.data,
        error: result.error
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal error during TradeIndia sync'
    });
  }
}

/**
 * GET /api/integrations/tradeindia/status
 * Returns sanitized telemetry, health metrics, and timestamps
 */
export async function getTradeIndiaStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const status = TradeIndiaSyncService.getStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch TradeIndia integration status'
    });
  }
}

import fs from 'fs';
import path from 'path';

/**
 * Persists updated configuration into the 360_backend .env file
 * so credentials survive server restarts and reloads.
 */
function persistEnvVariables(vars: Record<string, string>) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    for (const [key, val] of Object.entries(vars)) {
      if (val === undefined || val === null) continue;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
    console.log('[TradeIndia Controller] 💾 Saved TradeIndia credentials to .env file successfully');
  } catch (err: any) {
    console.error('[TradeIndia Controller] Failed to persist .env file:', err.message);
  }
}

/**
 * POST /api/integrations/tradeindia/config
 * Updates TradeIndia API credentials directly from the UI and saves them permanently
 */
export async function updateTradeIndiaConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, profileId, apiKey, apiUrl, syncDaysBack, autoAssignLead } = req.body || {};

    const integration = TradeIndiaSyncService.getIntegrationRecord();
    const updatedConfig = {
      ...integration.config,
      ...(userId !== undefined && { userId: String(userId).trim() }),
      ...(profileId !== undefined && { profileId: String(profileId).trim() }),
      ...(apiKey !== undefined && { apiKey: String(apiKey).trim() }),
      ...(apiUrl !== undefined && { apiUrl: String(apiUrl).trim() }),
      ...(syncDaysBack !== undefined && { initialSyncDaysBack: Number(syncDaysBack) }),
      ...(autoAssignLead !== undefined && { autoAssignLead: Boolean(autoAssignLead) })
    };

    const envUpdates: Record<string, string> = {};
    if (userId) {
      const clean = String(userId).trim();
      process.env.TRADEINDIA_USER_ID = clean;
      envUpdates.TRADEINDIA_USER_ID = clean;
    }
    if (profileId) {
      const clean = String(profileId).trim();
      process.env.TRADEINDIA_PROFILE_ID = clean;
      envUpdates.TRADEINDIA_PROFILE_ID = clean;
    }
    if (apiKey) {
      const clean = String(apiKey).trim();
      process.env.TRADEINDIA_API_KEY = clean;
      envUpdates.TRADEINDIA_API_KEY = clean;
    }
    if (apiUrl) {
      const clean = String(apiUrl).trim();
      process.env.TRADEINDIA_API_URL = clean;
      envUpdates.TRADEINDIA_API_URL = clean;
    }

    // Save permanently to .env file
    if (Object.keys(envUpdates).length > 0) {
      persistEnvVariables(envUpdates);
    }

    db.integrations.updateById(integration._id, {
      config: updatedConfig,
      apiKey: apiKey ? String(apiKey).trim() : integration.apiKey,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE_CONFIG', 'integrations', 'TradeIndia Connector', integration._id);

    // Trigger an immediate initial sync in the background so leads arrive right away
    setTimeout(() => {
      TradeIndiaSyncService.executeSync({ manualTrigger: false }).catch(err => {
        console.warn('[TradeIndia Auto-Sync] Initial sync notice:', err.message);
      });
    }, 1200);

    return res.json({
      success: true,
      message: 'TradeIndia API credentials saved permanently. Background synchronization is active.',
      data: TradeIndiaSyncService.getStatus()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to save TradeIndia configuration'
    });
  }
}
