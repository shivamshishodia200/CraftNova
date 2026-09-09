/**
 * TradeIndia Buy Leads API Client Service
 * 
 * Handles authenticated communication with TradeIndia's REST API,
 * supporting pagination, date ranges, responded buy leads, timeout handling,
 * and robust normalization of response payloads.
 */

import dotenv from 'dotenv';
import { db } from '../database/db';
dotenv.config();

export interface TradeIndiaFetchParams {
  fromDate: string; // Format: YYYY-MM-DD
  toDate: string;   // Format: YYYY-MM-DD
  limit?: number;   // e.g. 50
  pageNo?: number;  // 1-indexed
  respondedBuyLeads?: boolean | number; // 0 or 1
}

export interface NormalizedTradeIndiaLead {
  sourceLeadId: string;
  senderName: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  productName: string;
  quantity: string;
  queryMessage: string;
  leadDate: string;
  leadType: 'BUY_LEAD' | 'RESPONDED_BUY_LEAD';
  raw: Record<string, any>;
}

export interface TradeIndiaFetchResult {
  success: boolean;
  data: NormalizedTradeIndiaLead[];
  totalRecordsFetched: number;
  hasMore: boolean;
  pageNo: number;
  limit: number;
  message?: string;
  error?: string;
}

export class TradeIndiaService {
  private static readonly DEFAULT_TIMEOUT_MS = 15000;

  /**
   * Reads credentials from environment variables or DB integration config.
   * Never exposes or logs secrets.
   */
  public static getCredentials() {
    let dbConfig: Record<string, any> = {};
    let dbApiKey = '';
    try {
      const integration = db.integrations?.findOne(i => i.code === 'tradeindia' || i._id === 'int_1');
      if (integration) {
        dbConfig = integration.config || {};
        dbApiKey = integration.apiKey || '';
      }
    } catch {
      // db might be initializing
    }

    const envApiUrl = process.env.TRADEINDIA_API_URL?.trim();
    const envUserId = process.env.TRADEINDIA_USER_ID && process.env.TRADEINDIA_USER_ID !== 'YOUR_USER_ID' ? process.env.TRADEINDIA_USER_ID.trim() : '';
    const envProfileId = process.env.TRADEINDIA_PROFILE_ID && process.env.TRADEINDIA_PROFILE_ID !== 'YOUR_PROFILE_ID' ? process.env.TRADEINDIA_PROFILE_ID.trim() : '';
    const envApiKey = process.env.TRADEINDIA_API_KEY && process.env.TRADEINDIA_API_KEY !== 'YOUR_API_KEY' ? process.env.TRADEINDIA_API_KEY.trim() : '';

    const apiUrl = envApiUrl || dbConfig.apiUrl || dbConfig.endpointUrl || 'https://www.tradeindia.com/utils/my_buy_leads.html';
    
    const userId = String(dbConfig.userId || dbConfig.userid || envUserId || '').trim();
    const profileId = String(dbConfig.profileId || dbConfig.profile_id || envProfileId || '').trim();
    const apiKey = String(dbApiKey || dbConfig.apiKey || dbConfig.key || envApiKey || '').trim();

    const isConfigured = Boolean(
      userId && profileId && apiKey &&
      userId !== 'YOUR_USER_ID' &&
      apiKey !== 'YOUR_API_KEY' &&
      profileId !== 'YOUR_PROFILE_ID'
    );

    return {
      apiUrl,
      userId,
      profileId,
      apiKey,
      isConfigured
    };
  }

  /**
   * Fetches a single page of Buy Leads from TradeIndia API
   */
  public static async fetchBuyLeads(params: TradeIndiaFetchParams): Promise<TradeIndiaFetchResult> {
    const { apiUrl, userId, profileId, apiKey, isConfigured } = this.getCredentials();
    const limit = Number(params.limit) || 50;
    const pageNo = Number(params.pageNo) || 1;
    const isResponded = Boolean(params.respondedBuyLeads);

    // If credentials are not configured or placeholder, return safe empty response with advisory message
    if (!isConfigured) {
      const isPlaceholder = userId === 'YOUR_USER_ID' || apiKey === 'YOUR_API_KEY' || profileId === 'YOUR_PROFILE_ID';
      if (isPlaceholder) {
        console.warn(`[TradeIndia API] ℹ️ Credentials are set to placeholder ('YOUR_USER_ID' / 'YOUR_API_KEY'). Configure live credentials in 360_backend/.env or via Integrations page to stream live leads.`);
      } else {
        console.warn(`[TradeIndia API] ℹ️ Missing TradeIndia credentials (UserId: ${userId ? 'Set' : 'Missing'}, ProfileId: ${profileId ? 'Set' : 'Missing'}, Key: ${apiKey ? 'Set' : 'Missing'}).`);
      }
      return {
        success: true,
        data: [],
        totalRecordsFetched: 0,
        hasMore: false,
        pageNo,
        limit,
        message: 'TradeIndia credentials are set to placeholder or not configured'
      };
    }

    // Bound date range to max 14 days (TradeIndia requirement)
    const today = new Date();
    const minFromDate = new Date(today);
    minFromDate.setDate(minFromDate.getDate() - 14);
    const minFromDateStr = minFromDate.toISOString().split('T')[0];

    let effectiveFromDate = params.fromDate;
    if (!effectiveFromDate || new Date(effectiveFromDate) < minFromDate) {
      effectiveFromDate = minFromDateStr;
    }
    const effectiveToDate = params.toDate || today.toISOString().split('T')[0];

    // Build URL query parameters
    const url = new URL(apiUrl);
    url.searchParams.set('userid', userId);
    url.searchParams.set('profile_id', profileId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('from_date', effectiveFromDate);
    url.searchParams.set('to_date', effectiveToDate);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page_no', String(pageNo));

    if (isResponded) {
      url.searchParams.set('responded_buy_leads', '1');
    }

    // Masked log for security
    console.log(`[TradeIndia API] Requesting Page ${pageNo} (Limit: ${limit}, Range: ${effectiveFromDate} to ${effectiveToDate}, Responded: ${isResponded ? 'YES' : 'NO'})`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT_MS)
      });

      const rawText = await response.text();

      // Parse JSON payload
      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(rawText);
      } catch (jsonErr) {
        if (rawText.toLowerCase().includes('no record') || rawText.toLowerCase().includes('no data') || !rawText.trim()) {
          return {
            success: true,
            data: [],
            totalRecordsFetched: 0,
            hasMore: false,
            pageNo,
            limit,
            message: 'No leads found for specified criteria'
          };
        }
        console.warn(`[TradeIndia API] Non-JSON response received: ${rawText.slice(0, 150)}`);
        return {
          success: false,
          data: [],
          totalRecordsFetched: 0,
          hasMore: false,
          pageNo,
          limit,
          error: `TradeIndia HTTP ${response.status}: ${rawText.slice(0, 100)}`
        };
      }

      if (!response.ok || (parsedPayload && (parsedPayload.status === 'error' || parsedPayload.status === 'failure'))) {
        const errorMsg = parsedPayload?.message || (response.status === 403 ? 'Rate limit exceeded: TradeIndia permits max 5 requests per 5 minutes. Please wait before retrying.' : `TradeIndia HTTP ${response.status}: ${response.statusText}`);
        return {
          success: false,
          data: [],
          totalRecordsFetched: 0,
          hasMore: false,
          pageNo,
          limit,
          error: errorMsg
        };
      }

      // Extract records array from various possible structures
      let rawLeads: any[] = [];
      if (Array.isArray(parsedPayload)) {
        rawLeads = parsedPayload;
      } else if (parsedPayload && typeof parsedPayload === 'object') {
        if (Array.isArray(parsedPayload.data)) {
          rawLeads = parsedPayload.data;
        } else if (Array.isArray(parsedPayload.leads)) {
          rawLeads = parsedPayload.leads;
        } else if (Array.isArray(parsedPayload.buy_leads)) {
          rawLeads = parsedPayload.buy_leads;
        } else if (parsedPayload.error || parsedPayload.message) {
          const msg = parsedPayload.message || parsedPayload.error;
          if (String(msg).toLowerCase().includes('no record') || String(msg).toLowerCase().includes('no data')) {
            return {
              success: true,
              data: [],
              totalRecordsFetched: 0,
              hasMore: false,
              pageNo,
              limit,
              message: String(msg)
            };
          }
          return {
            success: false,
            data: [],
            totalRecordsFetched: 0,
            hasMore: false,
            pageNo,
            limit,
            error: String(msg)
          };
        }
      }

      const normalizedList = rawLeads
        .map(lead => this.normalizeLeadRecord(lead, isResponded))
        .filter(lead => Boolean(lead.sourceLeadId && (lead.senderName || lead.phone || lead.productName)));

      const hasMore = normalizedList.length >= limit;

      console.log(`[TradeIndia API] Page ${pageNo} successfully fetched ${normalizedList.length} normalized leads (hasMore: ${hasMore})`);

      return {
        success: true,
        data: normalizedList,
        totalRecordsFetched: normalizedList.length,
        hasMore,
        pageNo,
        limit
      };
    } catch (err: any) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const errorMsg = isTimeout
        ? `Request timed out after ${this.DEFAULT_TIMEOUT_MS / 1000}s`
        : (err.message || 'Unknown network error');

      console.error(`[TradeIndia API] ❌ Connection failure: ${errorMsg}`);

      return {
        success: false,
        data: [],
        totalRecordsFetched: 0,
        hasMore: false,
        pageNo,
        limit,
        error: errorMsg
      };
    }
  }

  /**
   * Normalizes disparate field casings and formats into a uniform structure.
   */
  public static normalizeLeadRecord(raw: any, isResponded = false): NormalizedTradeIndiaLead {
    if (!raw || typeof raw !== 'object') {
      return {
        sourceLeadId: `TI_GEN_${Date.now()}`,
        senderName: 'TradeIndia Buyer',
        companyName: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        country: 'India',
        productName: 'General Inquiry',
        quantity: '',
        queryMessage: '',
        leadDate: new Date().toISOString(),
        leadType: isResponded ? 'RESPONDED_BUY_LEAD' : 'BUY_LEAD',
        raw: {}
      };
    }

    // Unique TradeIndia ID resolution
    const sourceLeadId = String(
      raw.generated_id ||
      raw.lead_id ||
      raw.enquiry_id ||
      raw.rfi_id ||
      raw.buy_lead_id ||
      raw.id ||
      raw.GENERATED_ID ||
      raw.LEAD_ID ||
      `TI_${raw.sender_mobile || raw.mobile || ''}_${raw.generated_date || raw.date || Date.now()}`
    ).trim();

    // Contact details
    const senderName = String(
      raw.sender_name ||
      raw.contact_person ||
      raw.name ||
      raw.buyer_name ||
      raw.SENDER_NAME ||
      'TradeIndia Buyer'
    ).trim();

    const companyName = String(
      raw.sender_co ||
      raw.company_name ||
      raw.company ||
      raw.sender_company ||
      raw.SENDER_CO ||
      raw.SENDER_COMPANY ||
      ''
    ).trim();

    const email = String(
      raw.sender_email ||
      raw.email ||
      raw.buyer_email ||
      raw.SENDER_EMAIL ||
      ''
    ).trim();

    const phone = String(
      raw.sender_mobile ||
      raw.mobile ||
      raw.phone ||
      raw.sender_phone ||
      raw.contact_number ||
      raw.SENDER_MOBILE ||
      ''
    ).trim();

    // Geographical location
    const city = String(
      raw.sender_city ||
      raw.city ||
      raw.SENDER_CITY ||
      ''
    ).trim();

    const state = String(
      raw.sender_state ||
      raw.state ||
      raw.SENDER_STATE ||
      ''
    ).trim();

    const country = String(
      raw.sender_country ||
      raw.country ||
      raw.SENDER_COUNTRY ||
      'India'
    ).trim();

    // Product & Requirement
    const productName = String(
      raw.product_name ||
      raw.subject ||
      raw.item_name ||
      raw.product ||
      raw.PRODUCT_NAME ||
      'Industrial Product / Sourcing Requirement'
    ).trim();

    const quantity = String(
      raw.quantity ||
      raw.qty ||
      raw.order_value ||
      raw.QUANTITY ||
      ''
    ).trim();

    const queryMessage = String(
      raw.query_message ||
      raw.message ||
      raw.description ||
      raw.remarks ||
      raw.QUERY_MESSAGE ||
      ''
    ).trim();

    // Lead Date parsing
    let leadDate = new Date().toISOString();
    const dateStr = raw.generated_date || raw.date || raw.lead_date || raw.GENERATED_DATE;
    if (dateStr) {
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          leadDate = parsedDate.toISOString();
        }
      } catch {
        // fallback to current timestamp
      }
    }

    return {
      sourceLeadId,
      senderName,
      companyName,
      email,
      phone,
      city,
      state,
      country,
      productName,
      quantity,
      queryMessage,
      leadDate,
      leadType: isResponded ? 'RESPONDED_BUY_LEAD' : 'BUY_LEAD',
      raw
    };
  }
}
