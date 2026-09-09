/**
 * Common Integration Engine Types & Interfaces
 */

import { IntegrationDoc, LeadDoc, PaymentDoc } from '../database/types';

export interface NormalizedLead {
  externalLeadId: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  productName?: string;
  quantity?: string | number;
  requirement?: string;
  message?: string;
  source: string;
  channel?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedValue?: number;
  assignedTo?: string;
  assignedToId?: string;
  tags?: string[];
  externalCreatedAt?: string;
  raw: Record<string, any>;
}

export interface NormalizedPayment {
  externalPaymentId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'AUTHORIZED' | 'PENDING';
  paymentMethod?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  transactionDate?: string;
  description?: string;
  raw: Record<string, any>;
}

export interface SyncOptions {
  manualTrigger?: boolean;
  triggeredBy?: string;
  fromDate?: string;
  toDate?: string;
  limitPerPage?: number;
  customParams?: Record<string, any>;
}

export interface SyncExecutionStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
  pagesProcessed?: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  stats: SyncExecutionStats;
  data?: any;
  error?: string;
}

export interface TestResult {
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  message: string;
  sampleData?: any;
  error?: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode: number;
  message: string;
  leadId?: string;
  paymentId?: string;
  entityId?: string;
  error?: string;
}

export interface IProviderAdapter {
  readonly code: string;
  readonly name: string;
  readonly provider: string;

  /**
   * Safely tests credentials and connectivity to remote service
   */
  testConnection(integration: IntegrationDoc): Promise<TestResult>;

  /**
   * Fetches and synchronizes records for polling-based connectors
   */
  sync?(integration: IntegrationDoc, options?: SyncOptions): Promise<SyncResult>;

  /**
   * Handles incoming webhooks from remote platforms
   */
  handleWebhook?(integration: IntegrationDoc, reqBody: any, headers?: Record<string, any>): Promise<WebhookResult>;
}
