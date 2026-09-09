/**
 * Comprehensive Integration Subsystem Test Suite
 */

import { db } from './database/db';
import { getProviderAdapter } from './integrations/providers';
import { IntegrationSecurityService } from './integrations/security.service';
import { IntegrationEngineService } from './integrations/engine.service';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING 360CRM ENTERPRISE INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // 1. Initialize DB
  await db.init();
  assert(db.initialized, 'Database initialized with all collections');
  assert(db.integrations.countDocuments() >= 7, `Initial seed integrations present (${db.integrations.countDocuments()} found)`);
  assert(db.integrationLogs !== undefined, 'integrationLogs collection initialized in Database');

  const all = db.integrations.getAll();
  const codes = all.map(i => i.code);
  console.log('Found integrations:', codes.join(', '));

  assert(codes.includes('tradeindia'), 'TradeIndia connector present');
  assert(codes.includes('indiamart'), 'IndiaMART connector present');
  assert(codes.includes('website_webhook'), 'Website webhook connector present');
  assert(codes.includes('whatsapp'), 'WhatsApp Cloud API connector present');
  assert(codes.includes('razorpay'), 'Razorpay connector present');
  assert(codes.includes('stripe'), 'Stripe connector present');
  assert(codes.includes('custom_rest_api'), 'Custom REST API connector present');

  // 2. Test SSRF Protection
  const localCheck = IntegrationSecurityService.validateSafeUrl('http://127.0.0.1:8080/admin');
  assert(!localCheck.isValid, 'SSRF Guard blocks localhost (127.0.0.1)');

  const awsMetadataCheck = IntegrationSecurityService.validateSafeUrl('http://169.254.169.254/latest/meta-data');
  assert(!awsMetadataCheck.isValid, 'SSRF Guard blocks cloud metadata IP (169.254.169.254)');

  const privateSubnetCheck = IntegrationSecurityService.validateSafeUrl('https://192.168.1.100/api/leads');
  assert(!privateSubnetCheck.isValid, 'SSRF Guard blocks private subnet (192.168.x.x)');

  const validPublicUrlCheck = IntegrationSecurityService.validateSafeUrl('https://api.indiamart.com/v1/leads');
  assert(validPublicUrlCheck.isValid, 'SSRF Guard permits valid public HTTPS URLs');

  // 3. Test Credential Masking
  const tiInt = db.integrations.findOne(i => i.code === 'tradeindia')!;
  const masked = IntegrationSecurityService.maskCredentials(tiInt);
  assert(masked.apiKey?.includes('••••'), 'Credential masking properly redacts raw API key');

  // 4. Test Website Lead Capture Webhook
  const webAdapter = getProviderAdapter('website_webhook')!;
  const webInt = db.integrations.findOne(i => i.code === 'website_webhook')!;
  const initialLeadCount = db.leads.countDocuments();

  const webResult = await webAdapter.handleWebhook!(webInt, {
    name: 'Vikramaditya Logistics Ltd',
    phone: '+91 98200 12345',
    email: 'contact@vikramlogistics.com',
    company: 'Vikramaditya Group',
    requirement: 'Urgent quotation for 500 units steel fasteners',
    city: 'Mumbai',
    budget: 150000
  }, { 'x-webhook-secret': 'whsec_360crm_webleads_2026' });

  assert(webResult.success && Boolean(webResult.leadId), 'Website Webhook successfully created new CRM lead');
  assert(db.leads.countDocuments() === initialLeadCount + 1, 'CRM Leads collection count incremented');

  const createdWebLead = db.leads.findById(webResult.leadId!)!;
  assert(createdWebLead.name === 'Vikramaditya Logistics Ltd', 'Lead name populated accurately');
  assert(createdWebLead.source === 'Website', 'Lead source correctly assigned as Website');

  // 5. Test TradeIndia Webhook / Ingestion & Duplicate Prevention
  const tiAdapter = getProviderAdapter('tradeindia')!;
  const tiRes1 = await tiAdapter.handleWebhook!(tiInt, {
    generated_id: 'TI_LEAD_TEST_9901',
    sender_name: 'Harish Chemical Industries',
    sender_mobile: '+91 98765 43210',
    sender_email: 'harish@chemcorp.in',
    sender_co: 'Harish Chemicals Ltd',
    product_name: 'Industrial SS Ball Valves 2 inch',
    sender_city: 'Varanasi',
    sender_state: 'Uttar Pradesh'
  });

  assert(tiRes1.success, 'TradeIndia lead ingested successfully');
  const tiLead1 = db.leads.findById(tiRes1.leadId!)!;
  assert(tiLead1.sourceLeadId === 'TI_LEAD_TEST_9901', 'TradeIndia external sourceLeadId indexed');
  assert(!tiLead1.assignedTo || tiLead1.assignedTo === 'Unassigned', 'TradeIndia incoming lead arrives as Unassigned by default');

  // Manually update stage in CRM sales pipeline
  db.leads.updateById(tiLead1._id, { stage: 'NEGOTIATION', status: 'QUALIFIED', notes: 'Spoke with Director' });

  // Resend the same lead (re-sync simulation)
  const tiRes2 = await tiAdapter.handleWebhook!(tiInt, {
    generated_id: 'TI_LEAD_TEST_9901',
    sender_name: 'Harish Chemical Industries Updated',
    sender_mobile: '+91 98765 43210',
    sender_email: 'harish@chemcorp.in',
    sender_co: 'Harish Chemicals Ltd',
    product_name: 'Industrial SS Ball Valves 2 inch (Modified Qty)',
    sender_city: 'Prayagraj'
  });

  const tiLead2 = db.leads.findById(tiRes2.leadId!)!;
  assert(tiLead1._id === tiLead2._id, 'Duplicate check prevented duplicate lead insertion');
  assert(tiLead2.stage === 'NEGOTIATION' && tiLead2.status === 'QUALIFIED', 'Sales pipeline stage & status protected from sync overwrite');
  assert(tiLead2.city === 'Prayagraj', 'Updated contact metadata synced safely');

  // 6. Test IndiaMART Lead Ingestion
  const imAdapter = getProviderAdapter('indiamart')!;
  const imInt = db.integrations.findOne(i => i.code === 'indiamart')!;
  const imRes = await imAdapter.handleWebhook!(imInt, {
    UNIQUE_QUERY_ID: 'IM_RFQ_TEST_5544',
    SENDER_NAME: 'Anand Tools & Machinery',
    SENDER_MOBILE: '9845011223',
    SENDER_EMAIL: 'anand@toolsmachinery.com',
    SENDER_COMPANY: 'Anand Tools Pvt Ltd',
    PRODUCT_NAME: 'CNC Lathe Machine Spares',
    QUERY_MESSAGE: 'Requirement of 5 sets of carbide inserts',
    GLUSR_USR_CITY: 'Coimbatore',
    GLUSR_USR_STATE: 'Tamil Nadu'
  });

  assert(imRes.success, 'IndiaMART enquiry ingested into CRM Leads');
  const imLead = db.leads.findById(imRes.leadId!)!;
  assert(imLead.source === 'IndiaMART', 'Lead source is IndiaMART');

  // 7. Test WhatsApp Cloud API Webhook
  const waAdapter = getProviderAdapter('whatsapp')!;
  const waInt = db.integrations.findOne(i => i.code === 'whatsapp')!;

  // 7a. Verification Challenge Handshake
  const verifyRes = (waAdapter as any).verifyChallenge(waInt, 'subscribe', 'whatsapp_verify_token_360crm_2026', 'challenge_test_code_123');
  assert(verifyRes.valid && verifyRes.challenge === 'challenge_test_code_123', 'WhatsApp webhook challenge verification verified');

  // 7b. Inbound Message from New Buyer -> Auto-creates Lead
  const waResNew = await waAdapter.handleWebhook!(waInt, {
    entry: [{
      changes: [{
        value: {
          contacts: [{ profile: { name: 'Kavita Textile Mills' } }],
          messages: [{
            id: 'wamid.HBgLMTIzNDU2Nzg5',
            from: '919811223344',
            text: { body: 'Hello, what is the price for 200m fabric roll?' }
          }]
        }
      }]
    }]
  });

  assert(waResNew.success && Boolean(waResNew.leadId), 'WhatsApp message from new number auto-created CRM Lead');
  const waLead = db.leads.findById(waResNew.leadId!)!;
  assert(waLead.source === 'WhatsApp', 'WhatsApp lead source verified');

  // 7c. Inbound Message from Existing Lead -> Attaches to Activity Timeline
  const waResExisting = await waAdapter.handleWebhook!(waInt, {
    entry: [{
      changes: [{
        value: {
          contacts: [{ profile: { name: 'Kavita Textile Mills' } }],
          messages: [{
            id: 'wamid.HBgLMTIzNDU2Nzg5XzI=',
            from: '919811223344',
            text: { body: 'Please send your bank details for advance payment.' }
          }]
        }
      }]
    }]
  });

  assert(waResExisting.success && waResExisting.message.includes('attached to existing'), 'Follow-up WhatsApp message attached to existing lead timeline');

  // 8. Test Razorpay Payment Gateway Hook
  const rzpAdapter = getProviderAdapter('razorpay')!;
  const rzpInt = db.integrations.findOne(i => i.code === 'razorpay')!;

  // Create mock invoice
  const inv = db.invoices.insertOne({
    invoiceNumber: 'INV-2026-9999',
    customerId: 'cust_sample_1',
    customerName: 'Test Client',
    grandTotal: 25000,
    paidAmount: 0,
    dueAmount: 25000,
    paymentStatus: 'UNPAID',
    status: 'SENT',
    invoiceDate: '2026-02-16',
    dueDate: '2026-02-28',
    items: [],
    subTotal: 25000,
    taxAmount: 0,
    discountAmount: 0,
    createdAt: '2026-02-16T10:00:00.000Z',
    updatedAt: new Date().toISOString()
  });

  const rzpRes = await rzpAdapter.handleWebhook!(rzpInt, {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_test_778899',
          order_id: 'order_test_9988',
          amount: 2500000, // 25,000 INR in paise
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          email: 'payer@company.com',
          contact: '+919988776655',
          created_at: Math.floor(Date.now() / 1000),
          notes: { invoice_id: inv._id, invoice_number: inv.invoiceNumber }
        }
      }
    }
  });

  assert(rzpRes.success, 'Razorpay payment.captured webhook processed successfully');
  const settledInvoice = db.invoices.findById(inv._id)!;
  assert(settledInvoice.paidAmount === 25000, 'Invoice paidAmount updated to 25,000');
  assert(settledInvoice.paymentStatus === 'PAID', 'Invoice paymentStatus automatically settled to PAID');

  const createdPayment = db.payments.findOne(p => p.referenceNumber === 'pay_rzp_test_778899')!;
  assert(Boolean(createdPayment), 'Payment record created in db.payments');
  assert(createdPayment.amount === 25000, 'Payment amount accurately logged in INR');

  // 9. Test Execution Logging
  const logs = db.integrationLogs.getAll();
  assert(logs.length >= 4, `Integration execution logs recorded in database (${logs.length} entries)`);

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 All Enterprise Connectors, Webhooks & Engine Rules Verified 100%!');
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
