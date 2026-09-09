import { db } from '../database/db';
import { AuthenticatedRequest } from './auth';

export function recordAuditLog(
  req: AuthenticatedRequest,
  action: string,
  module: string,
  description: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) {
  try {
    const userId = req.user?.userId || 'system';
    const userName = req.user?.name || 'System / Visitor';
    const userRole = req.user?.role || 'SYSTEM';
    const ipAddress = (req.headers?.['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip || '127.0.0.1';

    db.auditLogs.insertOne({
      userId,
      userName,
      userRole,
      action,
      module,
      description,
      recordId,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress).split(',')[0].trim(),
      userAgent: req.headers?.['user-agent'] || '360CRM-Client',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}
