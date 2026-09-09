/**
 * Central CRM Integration Engine
 * 
 * Orchestrates atomic record ingestion, strict duplicate prevention,
 * CRM workflow protection rules, activity logging, and integration telemetry.
 */

import { db } from '../database/db';
import { IntegrationDoc, IntegrationLogDoc, LeadDoc, PaymentDoc } from '../database/types';
import { NormalizedLead, NormalizedPayment } from './types';

export class IntegrationEngineService {
  /**
   * Ingests a normalized lead into the CRM pipeline with atomic duplicate protection
   * and CRM workflow state immutability.
   */
  public static async ingestLead(
    lead: NormalizedLead,
    integration: IntegrationDoc
  ): Promise<{ isNew: boolean; lead: LeadDoc; skipped?: boolean }> {
    if (!lead.phone && !lead.email && !lead.externalLeadId) {
      return { isNew: false, lead: null as any, skipped: true };
    }

    const extId = String(lead.externalLeadId || (lead as any).sourceLeadId || '').trim();
    let existing: LeadDoc | null = null;

    // 1. PRIMARY DUPLICATE CHECK: Composite Provider + External Lead ID (Strict non-empty check)
    if (extId) {
      existing = db.leads.findOne(l => {
        const matchesSource = (l.source && lead.source && l.source.toLowerCase() === lead.source.toLowerCase()) ||
                              (l.channel && lead.channel && l.channel === lead.channel);
        const matchesId = (Boolean(l.sourceLeadId) && l.sourceLeadId === extId) ||
                          (Boolean(l.externalLeadId) && l.externalLeadId === extId);
        return Boolean(matchesSource && matchesId);
      });
    }

    // Fallback duplicate check: If configured and external ID not found, match by phone + source
    if (!existing && integration.config?.duplicateStrategy === 'PHONE_SOURCE' && lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length >= 10) {
        existing = db.leads.findOne(l => {
          const lPhone = (l.phone || '').replace(/\D/g, '').slice(-10);
          return Boolean(lPhone && lPhone === cleanPhone && l.source && lead.source && l.source.toLowerCase() === lead.source.toLowerCase());
        });
      }
    }

    if (existing) {
      // =========================================================================
      // CASE 1: EXISTING LEAD -> SAFE METADATA UPDATE ONLY
      // =========================================================================
      // BUSINESS RULE: Never overwrite sales workflow state (status, stage,
      // priority, assigned representative, follow-ups, internal notes, conversion state).
      
      const updated = db.leads.updateById(existing._id, {
        name: lead.name || existing.name,
        companyName: lead.companyName || existing.companyName || '',
        email: lead.email || existing.email || '',
        phone: lead.phone || existing.phone,
        city: lead.city || existing.city,
        state: lead.state || existing.state,
        country: lead.country || existing.country,
        productName: lead.productName || existing.productName,
        quantity: lead.quantity || existing.quantity,
        requirement: lead.requirement || existing.requirement || existing.notes,
        rawSourceData: lead.raw,
        updatedAt: new Date().toISOString()
      });

      return { isNew: false, lead: updated || existing };
    }

    // =========================================================================
    // CASE 2: NEW INBOUND LEAD CREATION
    // =========================================================================
    const now = new Date().toISOString();
    const count = db.leads.countDocuments() + 1;
    const leadCode = `LD-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    // Assignment Logic - Unassigned by default unless explicitly configured
    let assignedName = lead.assignedTo;
    let assignedId = lead.assignedToId;

    if (!assignedName && integration.config?.autoAssignLead === true && integration.config?.defaultRep) {
      const targetRepId = integration.config.defaultRep;
      const rep = db.users.findById(targetRepId);
      if (rep) {
        assignedName = rep.name;
        assignedId = rep._id;
      }
    }

    // Lead Score heuristic calculation
    let score = 50;
    if (lead.phone && lead.email) score += 20;
    if (lead.companyName) score += 15;
    if (lead.quantity) score += 10;

    const notesContent = `Inbound lead captured via ${integration.name}: Product: ${lead.productName || 'General Requirement'}.${lead.quantity ? ' Qty: ' + lead.quantity + '.' : ''} Location: ${lead.city || 'Varanasi'}, ${lead.state || 'UP'}.${lead.message ? ' Message: ' + lead.message : ''}`;

    const newLead = db.leads.insertOne({
      leadCode,
      name: lead.name || 'Inbound Lead',
      companyName: lead.companyName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source,
      channel: lead.channel || 'B2B Portal',
      status: 'NEW',
      priority: lead.priority || integration.config?.defaultPriority || 'MEDIUM',
      stage: 'LEAD_CAPTURED',
      leadScore: Math.min(score, 100),
      assignedTo: assignedName || undefined,
      assignedToId: assignedId || undefined,
      estimatedValue: lead.estimatedValue || 50000,
      probability: 30,
      city: lead.city || 'Varanasi',
      state: lead.state || 'Uttar Pradesh',
      country: lead.country || 'India',
      productName: lead.productName || 'Industrial Sourcing Requirement',
      quantity: lead.quantity || '',
      requirement: lead.requirement || lead.productName || 'Inquiry Requirement',
      sourceLeadId: lead.externalLeadId,
      externalLeadId: lead.externalLeadId,
      rawSourceData: lead.raw || {},
      notes: notesContent,
      tags: lead.tags || [lead.source, 'Inbound API'],
      createdAt: lead.externalCreatedAt || now,
      updatedAt: now
    });

    // Update Lead Source Counters in CRM Marketing module
    try {
      const sourceRecord = db.leadSources?.findOne(s => s.name.toUpperCase().includes(lead.source.toUpperCase()));
      if (sourceRecord) {
        db.leadSources.updateById(sourceRecord._id, {
          leadsCount: (sourceRecord.leadsCount || 0) + 1,
          updatedAt: now
        });
      }
    } catch {}

    // Add entry to CRM Activity Timeline
    try {
      db.activityTimeline?.insertOne({
        entityType: 'LEAD',
        entityId: newLead._id,
        action: 'SYNC',
        activityType: 'LEAD_CREATED',
        description: `New lead auto-ingested from ${integration.name} (${newLead.name} - ${newLead.productName})`,
        performedBy: `${integration.name} Gateway`,
        timestamp: now
      });
    } catch {}

    console.log(`[Integration Engine] ✨ Created new lead ${leadCode} (${newLead.name}) from ${integration.name}`);
    return { isNew: true, lead: newLead };
  }

  /**
   * Ingests a payment record and updates corresponding invoices/accounts
   */
  public static async ingestPayment(
    payment: NormalizedPayment,
    integration: IntegrationDoc
  ): Promise<{ isNew: boolean; payment: PaymentDoc }> {
    const now = new Date().toISOString();

    // Check duplicate by external payment ID
    let existing = db.payments.findOne(p =>
      p.referenceNumber === payment.externalPaymentId ||
      p.transactionReference === payment.externalPaymentId
    );

    if (existing) {
      return { isNew: false, payment: existing };
    }

    // Match customer if available
    let customer = payment.customerId ? db.customers.findById(payment.customerId) : null;
    if (!customer && payment.customerPhone) {
      customer = db.customers.findOne(c => c.phone === payment.customerPhone);
    }
    if (!customer && payment.customerEmail) {
      customer = db.customers.findOne(c => c.email === payment.customerEmail);
    }

    // Match invoice if orderId or invoiceId provided
    let invoice = payment.invoiceId ? db.invoices.findById(payment.invoiceId) : null;
    if (!invoice && payment.orderId) {
      invoice = db.invoices.findOne(inv => inv.salesOrderId === payment.orderId || inv.invoiceNumber === payment.orderId);
    }

    const count = db.payments.countDocuments() + 1;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newPayment = db.payments.insertOne({
      paymentNumber,
      partyId: customer?._id,
      partyName: customer?.name || payment.customerName || 'Online Customer',
      type: 'INFLOW',
      customerId: customer?._id,
      customerName: customer?.name || payment.customerName,
      invoiceId: invoice?._id,
      invoiceNumber: invoice?.invoiceNumber,
      amount: payment.amount,
      paymentMode: payment.paymentMethod || 'ONLINE_GATEWAY',
      paymentMethod: (payment.paymentMethod?.toUpperCase() as any) || 'UPI',
      referenceNumber: payment.externalPaymentId,
      transactionReference: payment.externalPaymentId,
      paymentDate: payment.transactionDate || now,
      date: (payment.transactionDate || now).split('T')[0],
      notes: `Captured via ${integration.name} (${payment.description || 'Online Payment Hook'})`,
      receivedBy: `${integration.provider || 'Gateway'} Hook`,
      createdAt: now
    });

    // Auto-settle invoice if matched and configured
    if (invoice && integration.config?.autoSettleInvoice !== false) {
      const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
      const newDueAmount = Math.max(0, invoice.grandTotal - newPaidAmount);
      const paymentStatus = newDueAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');

      db.invoices.updateById(invoice._id, {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        paymentStatus,
        updatedAt: now
      });

      console.log(`[Integration Engine] 💳 Settled invoice ${invoice.invoiceNumber} (${paymentStatus}, Paid: ₹${newPaidAmount})`);
    }

    // Add Activity Timeline
    try {
      db.activityTimeline?.insertOne({
        entityType: 'PAYMENT',
        entityId: newPayment._id,
        action: 'PAYMENT_RECEIVED',
        description: `Payment ₹${payment.amount.toLocaleString()} received via ${integration.name} [Ref: ${payment.externalPaymentId}]`,
        performedBy: `${integration.name} Hook`,
        timestamp: now
      });
    } catch {}

    return { isNew: true, payment: newPayment };
  }

  /**
   * Records execution log into the integrationLogs collection
   */
  public static recordLog(log: Omit<IntegrationLogDoc, '_id' | 'createdAt'>): IntegrationLogDoc {
    const doc = db.integrationLogs.insertOne({
      ...log,
      createdAt: new Date().toISOString()
    });
    return doc;
  }

  /**
   * Updates integration telemetry stats
   */
  public static updateTelemetry(
    integrationId: string,
    updates: Partial<IntegrationDoc>
  ): IntegrationDoc | null {
    return db.integrations.updateById(integrationId, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }
}
