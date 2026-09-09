/**
 * Integration Dynamic Response & Field Mapper Service
 * 
 * Extracts nested objects from dynamic JSON responses and translates
 * external fields to internal CRM Lead/Customer/Payment models.
 */

import { NormalizedLead } from './types';

export class IntegrationMapperService {
  /**
   * Resolves a nested value from an object using dot notation (e.g. 'data.leads' or 'user.contact.phone')
   */
  public static extractByJsonPath(obj: any, path?: string): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (!path || path.trim() === '' || path === '.') return obj;

    const segments = path.split('.').map(s => s.trim()).filter(Boolean);
    let current: any = obj;

    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;

      // Handle array indices if specified like 'leads[0]'
      const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        current = current[key];
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[segment];
      }
    }

    return current;
  }

  /**
   * Applies custom field mapping on a source record
   * mapping format: { 'external_field_name': 'crm_field_name' }
   */
  public static mapRecord(source: Record<string, any>, mapping?: Record<string, string>): Record<string, any> {
    if (!source || typeof source !== 'object') return {};
    if (!mapping || Object.keys(mapping).length === 0) return { ...source };

    const mapped: Record<string, any> = {};

    for (const [extField, crmField] of Object.entries(mapping)) {
      if (!crmField) continue;
      const val = this.extractByJsonPath(source, extField);
      if (val !== undefined && val !== null) {
        mapped[crmField] = val;
      }
    }

    return mapped;
  }

  /**
   * Normalizes an arbitrary record into a structured NormalizedLead
   */
  public static toNormalizedLead(
    rawRecord: Record<string, any>,
    options: {
      defaultSource: string;
      defaultChannel?: string;
      defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      defaultAssignedTo?: string;
      defaultAssignedToId?: string;
      fieldMapping?: Record<string, string>;
      externalIdField?: string;
    }
  ): NormalizedLead {
    const mapped = this.mapRecord(rawRecord, options.fieldMapping);

    // Resolve external ID using precedence: explicit field -> 'id' -> 'lead_id' -> 'sourceLeadId' -> fallback
    let extId = '';
    if (options.externalIdField) {
      extId = String(this.extractByJsonPath(rawRecord, options.externalIdField) || '');
    }
    if (!extId) {
      extId = String(
        mapped.externalLeadId ||
        mapped.sourceLeadId ||
        mapped.id ||
        rawRecord.externalLeadId ||
        rawRecord.sourceLeadId ||
        rawRecord.id ||
        rawRecord.lead_id ||
        rawRecord.query_id ||
        rawRecord.QUERY_ID ||
        rawRecord._id ||
        ''
      ).trim();
    }

    // Resolve name
    const name = String(
      mapped.name ||
      mapped.full_name ||
      mapped.buyer_name ||
      mapped.senderName ||
      rawRecord.name ||
      rawRecord.senderName ||
      rawRecord.SENDER_NAME ||
      rawRecord.customer_name ||
      rawRecord.buyer_name ||
      'Inbound Lead'
    ).trim();

    // Resolve phone
    const phone = String(
      mapped.phone ||
      mapped.mobile ||
      mapped.contact_number ||
      rawRecord.phone ||
      rawRecord.mobile ||
      rawRecord.SENDER_MOBILE ||
      rawRecord.sender_mobile ||
      rawRecord.contact_number ||
      ''
    ).trim();

    // Resolve email
    const email = String(
      mapped.email ||
      rawRecord.email ||
      rawRecord.SENDER_EMAIL ||
      rawRecord.sender_email ||
      ''
    ).trim();

    // Resolve company
    const companyName = String(
      mapped.companyName ||
      mapped.company ||
      mapped.organization ||
      rawRecord.companyName ||
      rawRecord.company ||
      rawRecord.SENDER_COMPANY ||
      rawRecord.sender_company ||
      ''
    ).trim();

    // Resolve product & requirement
    const productName = String(
      mapped.productName ||
      mapped.product ||
      rawRecord.productName ||
      rawRecord.product ||
      rawRecord.PRODUCT_NAME ||
      rawRecord.product_name ||
      'Industrial Sourcing Requirement'
    ).trim();

    const requirement = String(
      mapped.requirement ||
      mapped.message ||
      mapped.notes ||
      rawRecord.requirement ||
      rawRecord.message ||
      rawRecord.QUERY_MESSAGE ||
      rawRecord.queryMessage ||
      rawRecord.notes ||
      productName
    ).trim();

    // Resolve location
    const city = String(
      mapped.city ||
      rawRecord.city ||
      rawRecord.GLUSR_USR_CITY ||
      rawRecord.city_name ||
      'Varanasi'
    ).trim();

    const state = String(
      mapped.state ||
      rawRecord.state ||
      rawRecord.GLUSR_USR_STATE ||
      rawRecord.state_name ||
      'Uttar Pradesh'
    ).trim();

    const country = String(
      mapped.country ||
      rawRecord.country ||
      rawRecord.GLUSR_USR_COUNTRY ||
      'India'
    ).trim();

    // Resolve value
    const rawVal = mapped.estimatedValue || rawRecord.estimatedValue || rawRecord.budget || rawRecord.deal_value || 50000;
    const estimatedValue = Number(rawVal) || 50000;

    return {
      externalLeadId: extId || `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      companyName,
      email,
      phone,
      alternatePhone: mapped.alternatePhone || rawRecord.alternatePhone || rawRecord.SENDER_MOBILE_ALT,
      city,
      state,
      country,
      address: mapped.address || rawRecord.address || rawRecord.ENQ_ADDRESS,
      productName,
      quantity: mapped.quantity || rawRecord.quantity || rawRecord.QUANTITY || '',
      requirement,
      message: mapped.message || rawRecord.message || rawRecord.notes || '',
      source: options.defaultSource,
      channel: options.defaultChannel || 'B2B Portal',
      priority: options.defaultPriority || 'MEDIUM',
      estimatedValue,
      assignedTo: options.defaultAssignedTo,
      assignedToId: options.defaultAssignedToId,
      tags: [options.defaultSource, options.defaultChannel || 'API Sync'].filter(Boolean),
      externalCreatedAt: rawRecord.createdAt || rawRecord.leadDate || rawRecord.DATE_TIME_RE || new Date().toISOString(),
      raw: rawRecord
    };
  }
}
