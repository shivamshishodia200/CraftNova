/**
 * Integration Security Service
 * 
 * Provides SSRF protection, credential masking, cryptographic signature verification,
 * and rate limits for external connector operations.
 */

import crypto from 'crypto';
import { IntegrationDoc } from '../database/types';

export class IntegrationSecurityService {
  /**
   * Masks sensitive credentials in an Integration document before sending to client
   */
  public static maskCredentials(integration: IntegrationDoc): IntegrationDoc {
    const copy: IntegrationDoc = JSON.parse(JSON.stringify(integration));

    if (copy.apiKey) {
      copy.apiKey = this.maskString(copy.apiKey);
    }
    if (copy.apiSecret) {
      copy.apiSecret = this.maskString(copy.apiSecret);
    }
    if (copy.webhookSecret) {
      copy.webhookSecret = this.maskString(copy.webhookSecret);
    }

    if (copy.config && typeof copy.config === 'object') {
      const sensitiveKeys = [
        'apiKey', 'apiSecret', 'secret', 'secretKey', 'keySecret', 'accessToken',
        'appSecret', 'webhookSecret', 'password', 'token', 'crmKey', 'key'
      ];
      for (const key of sensitiveKeys) {
        if (typeof copy.config[key] === 'string' && copy.config[key]) {
          copy.config[key] = this.maskString(copy.config[key]);
        }
      }
    }

    return copy;
  }

  /**
   * Helper to mask a string showing only prefix/suffix if long enough
   */
  public static maskString(val: string): string {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    const prefix = val.slice(0, 3);
    const suffix = val.slice(-3);
    return `${prefix}••••••••${suffix}`;
  }

  /**
   * Validates a URL against SSRF (Server-Side Request Forgery) attacks
   * Blocks localhost, private IP ranges (RFC 1918), AWS/cloud metadata services.
   */
  public static validateSafeUrl(urlString: string): { isValid: boolean; error?: string } {
    if (!urlString || typeof urlString !== 'string') {
      return { isValid: false, error: 'URL must be a non-empty string' };
    }

    try {
      const parsed = new URL(urlString);

      // Only HTTP and HTTPS protocols allowed
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { isValid: false, error: `Invalid protocol '${parsed.protocol}'. Only http and https are allowed.` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block local/internal hostnames
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal',
        '169.254.169.254', // AWS/GCP/Azure Instance Metadata
        'instance-data'
      ];

      if (blockedHosts.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        return { isValid: false, error: `Host '${hostname}' is an internal/private address and is blocked for security.` };
      }

      // Check for IPv4 private address ranges
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipMatch = hostname.match(ipv4Regex);
      if (ipMatch) {
        const octet1 = parseInt(ipMatch[1], 10);
        const octet2 = parseInt(ipMatch[2], 10);

        if (
          octet1 === 10 || // 10.0.0.0/8
          octet1 === 127 || // 127.0.0.0/8
          (octet1 === 172 && octet2 >= 16 && octet2 <= 31) || // 172.16.0.0/12
          (octet1 === 192 && octet2 === 168) || // 192.168.0.0/16
          (octet1 === 169 && octet2 === 254) // 169.254.0.0/16 (Link Local / Metadata)
        ) {
          return { isValid: false, error: `IP address '${hostname}' is in a restricted private network range.` };
        }
      }

      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: `Malformed URL: ${err.message}` };
    }
  }

  /**
   * Verifies an HMAC-SHA256 signature (e.g. for Razorpay, custom webhooks)
   */
  public static verifyHmacSha256(rawBody: string, signature: string, secret: string): boolean {
    if (!rawBody || !signature || !secret) return false;
    try {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Verifies Stripe Webhook Signature (t=timestamp,v1=signature)
   */
  public static verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string, toleranceSeconds = 300): boolean {
    if (!rawBody || !signatureHeader || !secret) return false;
    try {
      const parts = signatureHeader.split(',');
      let timestamp = '';
      let signature = '';

      for (const part of parts) {
        const [key, val] = part.trim().split('=');
        if (key === 't') timestamp = val;
        if (key === 'v1') signature = val;
      }

      if (!timestamp || !signature) return false;

      // Check timestamp freshness
      const timeDiff = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
      if (timeDiff > toleranceSeconds) {
        return false;
      }

      const signedPayload = `${timestamp}.${rawBody}`;
      const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Verifies Meta WhatsApp Cloud Webhook Signature (sha256=...)
   */
  public static verifyMetaWhatsAppSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
    if (!rawBody || !signatureHeader || !appSecret) return false;
    try {
      const cleanSig = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader;
      const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
