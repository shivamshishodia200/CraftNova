/**
 * Central Integration Provider Registry
 */

import { IProviderAdapter } from '../types';
import { TradeIndiaAdapter } from './tradeindia.adapter';
import { IndiaMartAdapter } from './indiamart.adapter';
import { WebsiteWebhookAdapter } from './websiteWebhook.adapter';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { RazorpayAdapter } from './razorpay.adapter';
import { StripeAdapter } from './stripe.adapter';
import { CustomRestAdapter } from './customRest.adapter';

export {
  TradeIndiaAdapter,
  IndiaMartAdapter,
  WebsiteWebhookAdapter,
  WhatsAppAdapter,
  RazorpayAdapter,
  StripeAdapter,
  CustomRestAdapter
};

const adapters: Record<string, IProviderAdapter> = {
  'tradeindia': new TradeIndiaAdapter(),
  'indiamart': new IndiaMartAdapter(),
  'website_webhook': new WebsiteWebhookAdapter(),
  'website': new WebsiteWebhookAdapter(),
  'whatsapp': new WhatsAppAdapter(),
  'razorpay': new RazorpayAdapter(),
  'stripe': new StripeAdapter(),
  'custom_rest_api': new CustomRestAdapter(),
  'custom': new CustomRestAdapter()
};

/**
 * Returns adapter instance for a given connector code/identifier
 */
export function getProviderAdapter(code?: string): IProviderAdapter | null {
  if (!code) return null;
  const clean = code.toLowerCase().trim();
  return adapters[clean] || adapters['custom_rest_api'];
}

/**
 * Returns all registered provider adapters
 */
export function getAllAdapters(): IProviderAdapter[] {
  return [
    adapters['tradeindia'],
    adapters['indiamart'],
    adapters['website_webhook'],
    adapters['whatsapp'],
    adapters['razorpay'],
    adapters['stripe'],
    adapters['custom_rest_api']
  ];
}
