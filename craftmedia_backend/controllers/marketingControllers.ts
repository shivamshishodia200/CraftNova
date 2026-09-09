import { Request, Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { filterByWorkspace, attachWorkspaceContext } from '../middleware/workspace';

// ==================== CAMPAIGNS ====================
export async function getCampaigns(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, type } = req.query;
    let campaigns = filterByWorkspace(db.campaigns.getAll(), req);

    if (status) campaigns = campaigns.filter(c => c.status === status);
    if (type) campaigns = campaigns.filter(c => c.type === type);

    campaigns.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return res.json({ success: true, data: campaigns });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, type, budget, startDate, endDate, targetAudience, description } = req.body;

    if (!name || !type || budget === undefined) {
      return res.status(400).json({ success: false, message: 'Campaign name, channel type, and budget are required.' });
    }

    const newCampaign = db.campaigns.insertOne(attachWorkspaceContext({
      name,
      type,
      budget: Number(budget),
      spent: 0,
      leadsGenerated: 0,
      conversions: 0,
      revenueGenerated: 0,
      roi: 0,
      status: 'ACTIVE',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      targetAudience: targetAudience || 'B2B Contractors & Fabricators',
      description: description || '',
      createdBy: req.user?.name || 'Marketing Lead',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Marketing', `Launched marketing campaign ${name} (${type})`, newCampaign._id, undefined, newCampaign);

    return res.json({
      success: true,
      message: `Campaign '${name}' launched successfully`,
      data: newCampaign
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== LEAD SOURCES ====================
export async function getLeadSources(req: AuthenticatedRequest, res: Response) {
  try {
    const sources = db.leadSources.getAll();
    return res.json({ success: true, data: sources });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== WEBHOOK INGESTION (TRADEINDIA, WEBSITE, WHATSAPP) ====================
export async function receiveTradeIndiaLead(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const sender_name = body.sender_name || body.SENDER_NAME;
    const sender_mobile = body.sender_mobile || body.SENDER_MOBILE;
    const sender_email = body.sender_email || body.SENDER_EMAIL;
    const sender_company = body.sender_company || body.SENDER_COMPANY || '';
    const query_product_name = body.query_product_name || body.PRODUCT_NAME;
    const query_message = body.query_message || body.QUERY_MESSAGE;
    const sender_city = body.sender_city || body.SENDER_CITY || 'Varanasi';
    const sender_state = body.sender_state || body.SENDER_STATE || 'Uttar Pradesh';

    const leadName = sender_name || 'TradeIndia Inquiry';
    const phone = sender_mobile || '+91 98000 00000';
    const email = sender_email || 'inquiry@tradeindia.buyer';
    const company = sender_company;
    const requirement = query_product_name || query_message || 'B2B Raw Material Sourcing';

    // Auto-assign to available sales rep
    const salesReps = db.users.find(u => u.role === 'SALES_REP' || u.role === 'EMPLOYEE');
    const assignedUser = salesReps[Math.floor(Math.random() * (salesReps.length || 1))] || db.users.getAll()[0];

    const newLead = db.leads.insertOne({
      name: leadName,
      companyName: company,
      email,
      phone,
      source: 'TRADEINDIA',
      status: 'NEW',
      stage: 'LEAD_CAPTURED',
      assignedTo: assignedUser?.name || 'Sales Desk',
      assignedToId: assignedUser?._id,
      estimatedValue: 75000,
      probability: 30,
      notes: `TradeIndia Direct Lead: Product: ${requirement}. City: ${sender_city || 'Varanasi'}, State: ${sender_state || 'UP'}. Details: ${query_message || ''}`,
      tags: ['TradeIndia', 'B2B Inbound', 'Fast-Track'],
      city: sender_city || 'Varanasi',
      state: sender_state || 'Uttar Pradesh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update TradeIndia source metrics
    const tradeIndiaSource = db.leadSources.findOne(s => s.name.toUpperCase().includes('TRADEINDIA'));
    if (tradeIndiaSource) {
      db.leadSources.updateById(tradeIndiaSource._id, {
        leadsCount: (tradeIndiaSource.leadsCount || 0) + 1
      });
    }

    // Add activity timeline
    db.activityTimeline.insertOne({
      entityType: 'LEAD',
      entityId: newLead._id,
      action: 'SYNC',
      description: `Inbound lead auto-captured via TradeIndia Webhook API`,
      performedBy: 'TradeIndia Webhook Ingestion',
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'TradeIndia inquiry ingested successfully into 360CRM',
      leadId: newLead._id
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function receiveWebsiteLead(req: Request, res: Response) {
  try {
    const { name, email, phone, company, message, requirement, city } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required for lead capture.' });
    }

    const salesReps = db.users.find(u => u.role === 'SALES_REP' || u.role === 'EMPLOYEE');
    const assignedUser = salesReps[0] || db.users.getAll()[0];

    const newLead = db.leads.insertOne({
      name,
      companyName: company || '',
      email: email || '',
      phone,
      source: 'WEBSITE',
      status: 'NEW',
      stage: 'LEAD_CAPTURED',
      assignedTo: assignedUser?.name || 'Inbound Sales',
      assignedToId: assignedUser?._id,
      estimatedValue: 50000,
      probability: 40,
      notes: `Website Contact Form Submission: Requirement: ${requirement || 'General'}. Message: ${message || ''}`,
      tags: ['Website', 'Inbound'],
      city: city || 'Varanasi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const webSource = db.leadSources.findOne(s => s.name.toUpperCase().includes('WEBSITE'));
    if (webSource) {
      db.leadSources.updateById(webSource._id, {
        leadsCount: (webSource.leadsCount || 0) + 1
      });
    }

    return res.json({
      success: true,
      message: 'Inquiry received. A representative will contact you shortly.',
      leadId: newLead._id
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function sendWhatsAppMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { phone: reqPhone, template: reqTemplate, customerName: reqCustomerName, parameters, toPhone, templateName, recipientName, messageText } = req.body;

    const phone = reqPhone || toPhone;
    const template = reqTemplate || templateName || 'General';
    const customerName = reqCustomerName || recipientName || 'Client';

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required.' });
    }

    const msg = db.messages.insertOne({
      recipientPhone: phone,
      recipientName: customerName,
      channel: 'WHATSAPP',
      content: messageText || `Template: ${template} | Params: ${JSON.stringify(parameters || {})}`,
      status: 'DELIVERED',
      sentBy: req.user?.name || 'System Dispatcher',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'DELIVERED'
    });

    recordAuditLog(req, 'CREATE', 'Marketing', `Dispatched WhatsApp message to ${phone}`, msg._id);

    return res.json({
      success: true,
      message: `WhatsApp message dispatched successfully to ${phone}`,
      data: msg
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
