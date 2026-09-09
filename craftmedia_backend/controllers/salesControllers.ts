import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { filterByWorkspace, attachWorkspaceContext } from '../middleware/workspace';

// ==========================================
// 1. LEADS CONTROLLERS
// ==========================================

export async function getLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, source, priority, assignedTo, search, dateFilter, fromDate, toDate, month } = req.query;
    let allLeads = filterByWorkspace(db.leads.getAll(), req);

    // 1. Overall System KPI Stats (ALWAYS computed across leads in the current workspace)
    const totalLeads = allLeads.length;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayLeads = allLeads.filter(l => l.createdAt && l.createdAt.startsWith(todayStr)).length;
    const qualifiedLeads = allLeads.filter(l => l.status === 'QUALIFIED').length;
    const convertedLeads = allLeads.filter(l => l.status === 'WON' || l.status === 'CONVERTED').length;
    const lostLeads = allLeads.filter(l => l.status === 'LOST').length;
    const pipelineValue = allLeads
      .filter(l => l.status !== 'LOST' && l.status !== 'WON' && l.status !== 'CONVERTED')
      .reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const currentMonthLeads = allLeads.filter(l => {
      const t = new Date(l.createdAt || 0).getTime();
      return t >= curMonthStart && t < curMonthEnd;
    }).length;

    // Source breakdown stats
    const sourceBreakdown: Record<string, number> = {};
    allLeads.forEach(l => {
      const src = l.source || 'Manual';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    });

    let leads = [...allLeads];

    // 2. Status / Source / Priority / AssignedTo / Search Filtering
    if (status) leads = leads.filter(l => l.status === status);
    if (source) leads = leads.filter(l => l.source === source || l.source?.toUpperCase() === String(source).toUpperCase());
    if (priority) leads = leads.filter(l => l.priority === priority);
    if (assignedTo) leads = leads.filter(l => l.assignedTo === assignedTo);
    if (search) {
      const q = String(search).toLowerCase();
      leads = leads.filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.leadCode && l.leadCode.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q))
      );
    }

    // 3. Date / Month Filtering (Default: THIS_MONTH if dateFilter not specified or dateFilter === 'THIS_MONTH')
    const effectiveFilter = dateFilter !== undefined ? String(dateFilter) : 'THIS_MONTH';

    if (effectiveFilter !== 'ALL') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (effectiveFilter === 'TODAY') {
        leads = leads.filter(l => l.createdAt && l.createdAt.startsWith(todayStr));
      } else if (effectiveFilter === 'THIS_MONTH') {
        leads = leads.filter(l => {
          const t = new Date(l.createdAt || 0).getTime();
          return t >= curMonthStart && t < curMonthEnd;
        });
      } else if (effectiveFilter === 'YESTERDAY') {
        const yesterdayStart = todayStart - 86400000;
        leads = leads.filter(l => {
          const t = new Date(l.createdAt || 0).getTime();
          return t >= yesterdayStart && t < todayStart;
        });
      } else if (effectiveFilter === 'LAST_7_DAYS') {
        const sevenDaysAgo = todayStart - 7 * 86400000;
        leads = leads.filter(l => new Date(l.createdAt || 0).getTime() >= sevenDaysAgo);
      } else if (effectiveFilter === 'LAST_30_DAYS') {
        const thirtyDaysAgo = todayStart - 30 * 86400000;
        leads = leads.filter(l => new Date(l.createdAt || 0).getTime() >= thirtyDaysAgo);
      } else if (effectiveFilter === 'PREV_MONTH') {
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        leads = leads.filter(l => {
          const t = new Date(l.createdAt || 0).getTime();
          return t >= prevMonthStart && t < prevMonthEnd;
        });
      } else if (effectiveFilter.startsWith('MONTH_') || month || effectiveFilter.match(/^\d{4}-\d{2}$/)) {
        const monthStr = (month ? String(month) : effectiveFilter.replace('MONTH_', '')).trim();
        const [yr, mo] = monthStr.split('-').map(Number);
        if (yr && mo) {
          const mStart = new Date(yr, mo - 1, 1).getTime();
          const mEnd = new Date(yr, mo, 1).getTime();
          leads = leads.filter(l => {
            const t = new Date(l.createdAt || 0).getTime();
            return t >= mStart && t < mEnd;
          });
        }
      } else if (effectiveFilter === 'CUSTOM' || fromDate || toDate) {
        if (fromDate) {
          const fromTime = new Date(String(fromDate)).getTime();
          if (!isNaN(fromTime)) leads = leads.filter(l => new Date(l.createdAt || 0).getTime() >= fromTime);
        }
        if (toDate) {
          const toTime = new Date(String(toDate) + 'T23:59:59.999Z').getTime();
          if (!isNaN(toTime)) leads = leads.filter(l => new Date(l.createdAt || 0).getTime() <= toTime);
        }
      }
    }

    leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({
      success: true,
      data: leads,
      stats: {
        totalLeads,
        todayLeads,
        currentMonthLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        pipelineValue,
        sourceBreakdown
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createLead(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      name,
      companyName,
      email,
      phone,
      source,
      status,
      priority,
      assignedTo,
      estimatedValue,
      city,
      state,
      notes,
      tags
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Lead Name and Phone Number are required.' });
    }

    // Lead scoring calculation
    let score = 30;
    if (email && email.includes('@')) score += 20;
    if (companyName) score += 20;
    if (Number(estimatedValue) > 50000) score += 15;
    if (Number(estimatedValue) > 200000) score += 15;

    const count = db.leads.countDocuments();
    const leadCode = `LD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newLead = db.leads.insertOne(attachWorkspaceContext({
      leadCode,
      name,
      companyName: companyName || '',
      email: email || '',
      phone,
      source: source || 'Manual',
      status: status || 'NEW',
      priority: priority || 'MEDIUM',
      leadScore: Math.min(score, 100),
      assignedTo: assignedTo || req.user?.name || 'Sales Representative',
      assignedToId: req.user?.userId,
      estimatedValue: Number(estimatedValue) || 0,
      city: city || 'Ahmedabad',
      state: state || 'Gujarat',
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : ['New Lead']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    db.activityTimeline.insertOne({
      entityType: 'LEAD',
      entityId: newLead._id,
      action: 'CREATE',
      description: `Lead '${name}' (${leadCode}) registered in system`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'leads', 'Lead', newLead._id, undefined, { name, leadCode, status });
    return res.status(201).json({ success: true, message: 'Lead registered successfully', data: newLead });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateLead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.leads.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });

    const updated = db.leads.updateById(id, {
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    db.activityTimeline.insertOne({
      entityType: 'LEAD',
      entityId: id,
      action: 'UPDATE',
      description: `Lead status updated to '${req.body.status || existing.status}'`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'leads', 'Lead', id, existing, req.body);
    return res.json({ success: true, message: 'Lead updated successfully', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSalesReps(req: AuthenticatedRequest, res: Response) {
  try {
    const employees = filterByWorkspace(db.employees.find(e => e.status === 'ACTIVE'), req);
    let users = filterByWorkspace(db.users.find(u => u.status === 'ACTIVE'), req);
    if (users.length === 0 && req.user) {
      const currentUser = db.users.findById(req.user.userId);
      if (currentUser) users = [currentUser];
    }
    const allLeads = filterByWorkspace(db.leads.getAll(), req);

    // Map active employees
    const repList = employees.map(emp => {
      const activeLeadsCount = allLeads.filter(
        l => (l.assignedTo === emp.name || l.assignedToId === emp._id) &&
             l.status !== 'WON' && l.status !== 'LOST' && l.status !== 'CONVERTED'
      ).length;

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department || 'Sales',
        designation: emp.designation || 'Sales Executive',
        type: 'EMPLOYEE',
        activeLeadsCount
      };
    });

    // Add administrative users who handle leads
    users.forEach(u => {
      if (!repList.some(r => r.name.toLowerCase() === u.name.toLowerCase() || r.email.toLowerCase() === u.email.toLowerCase())) {
        const activeLeadsCount = allLeads.filter(
          l => (l.assignedTo === u.name || l.assignedToId === u._id) &&
               l.status !== 'WON' && l.status !== 'LOST' && l.status !== 'CONVERTED'
        ).length;

        repList.push({
          _id: u._id,
          employeeId: u.role,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          department: (u as any).department || 'Management',
          designation: u.role || 'Staff',
          type: 'USER',
          activeLeadsCount
        });
      }
    });

    return res.json({ success: true, data: repList });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function assignLead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const { employeeId, assignedTo, notes } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'Assignee name (assignedTo) is required.' });
    }

    const existing = db.leads.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });

    const prevAssigned = existing.assignedTo || 'Unassigned';

    const updated = db.leads.updateById(id, {
      assignedTo,
      assignedToId: employeeId || existing.assignedToId,
      updatedAt: new Date().toISOString()
    });

    // Activity timeline
    db.activityTimeline.insertOne({
      entityType: 'LEAD',
      entityId: id,
      action: 'UPDATE',
      description: `Lead reassigned from '${prevAssigned}' to '${assignedTo}' by ${req.user?.name || 'Admin'}${notes ? ` (Note: ${notes})` : ''}`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    // System Notification for employee
    if (employeeId) {
      db.notifications.insertOne({
        recipientId: employeeId,
        title: 'New Lead Assignment',
        message: `Lead '${existing.name}' (${existing.companyName || 'Individual'}) has been assigned to you.`,
        type: 'LEAD_ASSIGNED',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'ASSIGN', 'leads', 'Lead', id, { assignedTo: prevAssigned }, { assignedTo, employeeId, notes });

    return res.json({
      success: true,
      message: `Lead successfully assigned to ${assignedTo}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function bulkAssignLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const { leadIds, employeeId, assignedTo } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'leadIds array is required.' });
    }
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'Assignee name (assignedTo) is required.' });
    }

    let updatedCount = 0;
    leadIds.forEach(id => {
      const existing = db.leads.findById(id);
      if (existing) {
        db.leads.updateById(id, {
          assignedTo,
          assignedToId: employeeId,
          updatedAt: new Date().toISOString()
        });

        db.activityTimeline.insertOne({
          entityType: 'LEAD',
          entityId: id,
          action: 'UPDATE',
          description: `Lead bulk-assigned to '${assignedTo}' by ${req.user?.name || 'Admin'}`,
          performedBy: req.user?.name || 'System',
          timestamp: new Date().toISOString()
        });

        updatedCount++;
      }
    });

    recordAuditLog(req, 'BULK_ASSIGN', 'leads', 'Lead', leadIds[0], undefined, { leadIds, assignedTo, employeeId, count: updatedCount });

    return res.json({
      success: true,
      message: `Successfully assigned ${updatedCount} leads to ${assignedTo}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.leads.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });

    db.leads.deleteById(id);
    recordAuditLog(req, 'DELETE', 'leads', 'Lead', id, existing);
    return res.json({ success: true, message: 'Lead removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function convertLead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const lead = db.leads.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.status === 'CONVERTED' || lead.convertedCustomerId) {
      return res.status(400).json({ success: false, message: 'Lead has already been converted to a Customer account.' });
    }

    let customer = db.customers.findOne(c => c.phone === lead.phone || (lead.email && c.email === lead.email));

    if (!customer) {
      const custCount = db.customers.countDocuments();
      const customerCode = `CUST-${new Date().getFullYear()}-${String(custCount + 1).padStart(4, '0')}`;
      customer = db.customers.insertOne({
        customerCode,
        name: lead.name,
        companyName: lead.companyName || lead.name,
        email: lead.email || '',
        phone: lead.phone,
        gstNumber: '',
        creditLimit: 500000,
        paymentTerms: 'Net 30',
        address: {
          city: lead.city || 'Ahmedabad',
          state: lead.state || 'Gujarat',
          country: 'India'
        },
        billingAddress: {
          city: lead.city || 'Ahmedabad',
          state: lead.state || 'Gujarat',
          country: 'India'
        },
        shippingAddress: {
          city: lead.city || 'Ahmedabad',
          state: lead.state || 'Gujarat',
          country: 'India'
        },
        assignedTo: lead.assignedTo || req.user?.name || 'Admin',
        totalOrdersCount: 0,
        totalSpent: 0,
        outstandingBalance: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const updatedLead = db.leads.updateById(id, {
      status: 'CONVERTED',
      stage: 'CONVERTED',
      convertedCustomerId: customer._id,
      updatedAt: new Date().toISOString()
    });

    db.activityTimeline.insertOne({
      entityType: 'LEAD',
      entityId: id,
      action: 'CONVERT',
      description: `Lead successfully converted to Customer account '${customer.name}' (${customer.customerCode || customer._id})`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    db.activityTimeline.insertOne({
      entityType: 'CUSTOMER',
      entityId: customer._id,
      action: 'CREATE',
      description: `Customer account created via conversion from Lead '${lead.name}' (${lead.leadCode || id})`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CONVERT', 'leads', 'Lead Conversion', id, { status: lead.status }, { customerId: customer._id });

    return res.json({
      success: true,
      message: `Lead '${lead.name}' successfully converted to Customer account!`,
      data: {
        lead: updatedLead,
        customer
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 2. CUSTOMERS CONTROLLERS
// ==========================================

export async function getCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search, status } = req.query;
    let customers = filterByWorkspace(db.customers.getAll(), req);

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length;
    const inactiveCustomers = customers.filter(c => c.status === 'INACTIVE').length;
    const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);
    const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);

    if (status) customers = customers.filter(c => c.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(q)) ||
        (c.address?.city && c.address.city.toLowerCase().includes(q))
      );
    }

    customers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: customers,
      stats: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        totalRevenue,
        totalOutstanding
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCustomerDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const customer = db.customers.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const quotations = db.quotations.find(q => q.customerId === id);
    const salesOrders = db.salesOrders.find(s => s.customerId === id);
    const invoices = db.invoices.find(i => i.customerId === id);
    const invoiceIds = new Set(invoices.map(i => i._id));
    const payments = db.payments.find(p =>
      p.customerId === id ||
      p.partyId === id ||
      (p.customerName && p.customerName === customer.name) ||
      (p.partyName && p.partyName === customer.name) ||
      (p.invoiceId && invoiceIds.has(p.invoiceId))
    );
    const timeline = db.activityTimeline.find(t => t.entityId === id || t.entityId === customer.name);

    return res.json({
      success: true,
      data: {
        customer,
        quotations,
        salesOrders,
        invoices,
        payments,
        timeline
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, companyName, email, phone, gstNumber, address, creditLimit, paymentTerms, assignedTo } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone are required' });
    }

    const existing = db.customers.findOne(c => c.phone === phone);
    if (existing) {
      return res.status(400).json({ success: false, message: `A customer account with phone ${phone} already exists (${existing.name}).` });
    }

    const count = db.customers.countDocuments();
    const customerCode = `CUST-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newCustomer = db.customers.insertOne(attachWorkspaceContext({
      customerCode,
      name,
      companyName: companyName || name,
      email: email || '',
      phone,
      gstNumber: gstNumber || '',
      creditLimit: Number(creditLimit) || 500000,
      paymentTerms: paymentTerms || 'Net 30',
      address: address || { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
      billingAddress: address || { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
      shippingAddress: address || { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
      assignedTo: assignedTo || req.user?.name || 'Admin',
      totalOrdersCount: 0,
      totalSpent: 0,
      outstandingBalance: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    db.activityTimeline.insertOne({
      entityType: 'CUSTOMER',
      entityId: newCustomer._id,
      action: 'CREATE',
      description: `Customer '${name}' (${customerCode}) created by ${req.user?.name || 'Admin'}`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'customers', 'Customer', newCustomer._id, undefined, { name, companyName });
    return res.status(201).json({ success: true, message: 'Customer account created successfully', data: newCustomer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.customers.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });

    const updated = db.customers.updateById(id, {
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'customers', 'Customer', id, existing, req.body);
    return res.json({ success: true, message: 'Customer updated successfully', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.customers.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });

    db.customers.deleteById(id);
    recordAuditLog(req, 'DELETE', 'customers', 'Customer', id, existing);
    return res.json({ success: true, message: 'Customer account deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 3. QUOTATIONS CONTROLLERS
// ==========================================

export async function getQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, customerId, search } = req.query;
    let quotations = filterByWorkspace(db.quotations.getAll(), req);

    const totalQuotes = quotations.length;
    const draftQuotes = quotations.filter(q => q.status === 'DRAFT').length;
    const sentQuotes = quotations.filter(q => q.status === 'SENT').length;
    const approvedQuotes = quotations.filter(q => q.status === 'APPROVED' || q.status === 'ACCEPTED').length;
    const convertedQuotes = quotations.filter(q => q.status === 'CONVERTED').length;
    const totalQuoteValue = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);

    if (status) quotations = quotations.filter(q => q.status === status);
    if (customerId) quotations = quotations.filter(q => q.customerId === customerId);
    if (search) {
      const q = String(search).toLowerCase();
      quotations = quotations.filter(item =>
        item.quotationNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q)
      );
    }

    quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: quotations,
      stats: {
        totalQuotes,
        draftQuotes,
        sentQuotes,
        approvedQuotes,
        convertedQuotes,
        totalQuoteValue
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, customerName, date, validUntil, items, discountAmount, shipping, termsAndConditions, notes } = req.body;
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and line items are required' });
    }

    let subTotal = 0;
    let taxAmount = 0;
    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const lineSub = qty * price;
      const disc = (lineSub * (Number(item.discountPercent) || 0)) / 100;
      const taxable = lineSub - disc;
      const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : 18;
      const tax = (taxable * taxRate) / 100;
      const total = taxable + tax;

      subTotal += lineSub;
      taxAmount += tax;

      return {
        productId: item.productId || `prod_${Date.now()}`,
        productName: item.productName || 'Material / Item',
        sku: item.sku || 'SKU-GEN',
        quantity: qty,
        unitPrice: price,
        discountPercent: Number(item.discountPercent) || 0,
        taxPercent: taxRate,
        taxRate,
        total: Math.round(total)
      };
    });

    const disc = Number(discountAmount) || 0;
    const shp = Number(shipping) || 0;
    const grandTotal = Math.round(subTotal + taxAmount - disc + shp);

    const count = db.quotations.countDocuments();
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newQuotation = db.quotations.insertOne(attachWorkspaceContext({
      quotationNumber,
      version: 1,
      customerId,
      customerName: customerName || 'Valued Client',
      date: date || new Date().toISOString().split('T')[0],
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: processedItems,
      subTotal: Math.round(subTotal),
      taxAmount: Math.round(taxAmount),
      discountAmount: disc,
      shipping: shp,
      grandTotal,
      status: 'SENT',
      approvalStatus: 'PENDING',
      termsAndConditions: termsAndConditions || 'Payment: 100% against delivery. Validity: 30 days. GST: As applicable.',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    db.activityTimeline.insertOne({
      entityType: 'QUOTATION',
      entityId: newQuotation._id,
      action: 'CREATE',
      description: `Quotation ${quotationNumber} generated for ₹${grandTotal.toLocaleString('en-IN')}`,
      performedBy: req.user?.name || 'Sales Desk',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'quotations', 'Quotation', newQuotation._id, undefined, { quotationNumber, grandTotal });
    return res.status(201).json({ success: true, message: 'Quotation created successfully', data: newQuotation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function approveQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const quote = db.quotations.findById(id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const updated = db.quotations.updateById(id, {
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      approvedBy: req.user?.name || 'Sales Lead',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.activityTimeline.insertOne({
      entityType: 'QUOTATION',
      entityId: id,
      action: 'APPROVE',
      description: `Quotation ${quote.quotationNumber} approved by ${req.user?.name || 'Sales Lead'}`,
      performedBy: req.user?.name || 'Sales Lead',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'APPROVE', 'quotations', 'Quotation', id);
    return res.json({ success: true, message: `Quotation ${quote.quotationNumber} approved!`, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function convertQuotationToSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const quote = db.quotations.findById(id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quotation not found' });

    if (quote.status === 'CONVERTED' && quote.convertedSalesOrderId) {
      return res.status(400).json({ success: false, message: 'Quotation has already been converted to a Sales Order' });
    }

    const count = db.salesOrders.countDocuments();
    const salesOrderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newSO = db.salesOrders.insertOne(attachWorkspaceContext({
      salesOrderNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      quotationId: quote._id,
      quotationNumber: quote.quotationNumber,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: quote.items,
      subTotal: quote.subTotal,
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount || 0,
      shipping: quote.shipping || 0,
      grandTotal: quote.grandTotal,
      status: 'PROCESSING',
      stage: 'PROCESSING',
      warehouseId: 'wh_main_01',
      warehouseName: 'Central Dispatch Facility',
      deliveryAddress: 'Client Project Site / Works',
      isInvoiced: false,
      approvedBy: req.user?.name || 'Sales Lead',
      notes: `Converted from quotation ${quote.quotationNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    db.quotations.updateById(id, {
      status: 'CONVERTED',
      approvalStatus: 'APPROVED',
      convertedSalesOrderId: newSO._id,
      updatedAt: new Date().toISOString()
    });

    const cust = db.customers.findById(quote.customerId);
    if (cust) {
      db.customers.updateById(cust._id, {
        totalOrdersCount: (cust.totalOrdersCount || 0) + 1,
        updatedAt: new Date().toISOString()
      });
    }

    db.activityTimeline.insertOne({
      entityType: 'SALES_ORDER',
      entityId: newSO._id,
      action: 'CREATE',
      description: `Sales Order ${salesOrderNumber} generated from Quotation ${quote.quotationNumber}`,
      performedBy: req.user?.name || 'System',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CONVERT', 'quotations', 'Quotation', id, { status: quote.status }, { convertedSalesOrderId: newSO._id });
    return res.json({ success: true, message: `Quotation converted to Sales Order ${salesOrderNumber}!`, data: newSO });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 4. SALES ORDERS CONTROLLERS
// ==========================================

export async function getSalesOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, stage, customerId, search } = req.query;
    let orders = filterByWorkspace(db.salesOrders.getAll(), req);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length;
    const packedOrders = orders.filter(o => o.status === 'PACKED').length;
    const dispatchedOrders = orders.filter(o => o.status === 'DISPATCHED').length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length;
    const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    if (status) orders = orders.filter(o => o.status === status);
    if (stage) orders = orders.filter(o => o.stage === stage);
    if (customerId) orders = orders.filter(o => o.customerId === customerId);
    if (search) {
      const q = String(search).toLowerCase();
      orders = orders.filter(item =>
        item.salesOrderNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q)
      );
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: orders,
      stats: {
        totalOrders,
        pendingOrders,
        packedOrders,
        dispatchedOrders,
        deliveredOrders,
        totalOrderValue
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, customerName, items, shipping, warehouseId, deliveryAddress, notes, expectedDelivery } = req.body;
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and line items are required' });
    }

    let subTotal = 0;
    let taxAmount = 0;
    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const lineSub = qty * price;
      const disc = (lineSub * (Number(item.discountPercent) || 0)) / 100;
      const taxable = lineSub - disc;
      const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : 18;
      const tax = (taxable * taxRate) / 100;

      subTotal += lineSub;
      taxAmount += tax;

      return {
        productId: item.productId || `prod_${Date.now()}`,
        productName: item.productName || 'Material / Item',
        sku: item.sku || 'SKU-GEN',
        quantity: qty,
        unitPrice: price,
        discountPercent: Number(item.discountPercent) || 0,
        taxPercent: taxRate,
        taxRate,
        total: Math.round(taxable + tax)
      };
    });

    const shp = Number(shipping) || 0;
    const grandTotal = Math.round(subTotal + taxAmount + shp);
    const count = db.salesOrders.countDocuments();
    const salesOrderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newSO = db.salesOrders.insertOne(attachWorkspaceContext({
      salesOrderNumber,
      customerId,
      customerName: customerName || 'Valued Customer',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: expectedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: processedItems,
      subTotal: Math.round(subTotal),
      taxAmount: Math.round(taxAmount),
      discountAmount: 0,
      shipping: shp,
      grandTotal,
      status: 'PROCESSING',
      stage: 'PROCESSING',
      warehouseId: warehouseId || 'wh_main_01',
      warehouseName: 'Central Dispatch Facility',
      deliveryAddress: deliveryAddress || 'Client Factory Works',
      isInvoiced: false,
      approvedBy: req.user?.name || 'Admin',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    const cust = db.customers.findById(customerId);
    if (cust) {
      db.customers.updateById(cust._id, {
        totalOrdersCount: (cust.totalOrdersCount || 0) + 1
      });
    }

    db.activityTimeline.insertOne({
      entityType: 'SALES_ORDER',
      entityId: newSO._id,
      action: 'CREATE',
      description: `Sales Order ${salesOrderNumber} created for ₹${grandTotal.toLocaleString('en-IN')}`,
      performedBy: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'sales_orders', 'SalesOrder', newSO._id, undefined, { salesOrderNumber, grandTotal });
    return res.status(201).json({ success: true, message: `Sales Order ${salesOrderNumber} created`, data: newSO });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSalesOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const { status, trackingNumber, transporterName } = req.body;
    const existing = db.salesOrders.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Sales order not found' });

    const previousStatus = existing.status;

    // Automatic inventory deduction on DISPATCHED
    if ((status === 'DISPATCHED' || status === 'DELIVERED') && previousStatus !== 'DISPATCHED' && previousStatus !== 'DELIVERED') {
      existing.items.forEach(item => {
        if (item.productId) {
          const product = db.products.findById(item.productId);
          if (product) {
            db.stockOut({
              productId: product._id,
              warehouseId: existing.warehouseId || 'wh_main_01',
              quantity: item.quantity,
              referenceType: 'SALES_ORDER',
              referenceId: existing._id,
              reason: `Fulfillment for Sales Order ${existing.salesOrderNumber}`,
              createdBy: req.user?.name || 'Dispatch Team'
            });
          }
        }
      });
    }

    const updated = db.salesOrders.updateById(id, {
      status,
      stage: status,
      ...(trackingNumber && { trackingNumber }),
      ...(transporterName && { transporterName }),
      updatedAt: new Date().toISOString()
    });

    db.activityTimeline.insertOne({
      entityType: 'SALES_ORDER',
      entityId: id,
      action: 'STATUS_CHANGE',
      description: `Sales Order ${existing.salesOrderNumber} progressed to stage '${status}'${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
      performedBy: req.user?.name || 'Dispatch Manager',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE_STATUS', 'sales_orders', 'SalesOrder', id, { status: previousStatus }, { status });
    return res.json({ success: true, message: `Sales Order updated to ${status}`, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function approveSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.salesOrders.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Sales order not found' });

    const updated = db.salesOrders.updateById(id, {
      status: 'APPROVED',
      stage: 'APPROVED',
      approvedBy: req.user?.name || 'Admin',
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'APPROVE', 'sales_orders', 'SalesOrder', id);
    return res.json({ success: true, message: 'Sales Order approved', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function generateOrderInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const order = db.salesOrders.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Sales order not found' });

    if (order.isInvoiced && order.invoiceId) {
      const existingInv = db.invoices.findById(order.invoiceId);
      return res.json({ success: true, message: 'Invoice already generated for this order', data: existingInv });
    }

    const invCount = db.invoices.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;

    const newInvoice = db.invoices.insertOne({
      invoiceNumber,
      salesOrderId: order._id,
      customerId: order.customerId,
      customerName: order.customerName,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: order.items,
      subTotal: order.subTotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount || 0,
      shipping: order.shipping || 0,
      grandTotal: order.grandTotal,
      paidAmount: 0,
      dueAmount: order.grandTotal,
      status: 'SENT',
      paymentStatus: 'UNPAID',
      notes: `Generated from Sales Order ${order.salesOrderNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.salesOrders.updateById(id, {
      isInvoiced: true,
      invoiceId: newInvoice._id,
      invoiceNumber: invoiceNumber,
      updatedAt: new Date().toISOString()
    });

    const customer = db.customers.findById(order.customerId);
    if (customer) {
      db.customers.updateById(customer._id, {
        totalSpent: (customer.totalSpent || 0) + order.grandTotal,
        outstandingBalance: (customer.outstandingBalance || 0) + order.grandTotal,
        updatedAt: new Date().toISOString()
      });
    }

    db.activityTimeline.insertOne({
      entityType: 'INVOICE',
      entityId: newInvoice._id,
      action: 'CREATE',
      description: `Tax Invoice ${invoiceNumber} issued for Sales Order ${order.salesOrderNumber} (Amount: ₹${order.grandTotal.toLocaleString('en-IN')})`,
      performedBy: req.user?.name || 'Billing Team',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'invoices', 'Invoice', newInvoice._id, undefined, { invoiceNumber, grandTotal: order.grandTotal });
    return res.status(201).json({ success: true, message: `Invoice ${invoiceNumber} generated successfully!`, data: newInvoice });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 5. FOLLOW-UPS CONTROLLERS
// ==========================================

export async function getFollowUps(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, type, priority, leadId, customerId } = req.query;
    let followUps = filterByWorkspace(db.followUps.getAll(), req);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const totalFollowUps = followUps.length;
    const pendingFollowUps = followUps.filter(f => f.status === 'PENDING').length;
    const todayFollowUps = followUps.filter(f => f.status === 'PENDING' && f.scheduledAt.startsWith(todayStr)).length;
    const overdueFollowUps = followUps.filter(f => f.status === 'PENDING' && new Date(f.scheduledAt).getTime() < now.getTime() && !f.scheduledAt.startsWith(todayStr)).length;
    const completedFollowUps = followUps.filter(f => f.status === 'COMPLETED').length;

    if (status) followUps = followUps.filter(f => f.status === status);
    if (type) followUps = followUps.filter(f => f.type === type);
    if (priority) followUps = followUps.filter(f => f.priority === priority);
    if (leadId) followUps = followUps.filter(f => f.leadId === leadId);
    if (customerId) followUps = followUps.filter(f => f.customerId === customerId);

    followUps.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return res.json({
      success: true,
      data: followUps,
      stats: {
        totalFollowUps,
        pendingFollowUps,
        todayFollowUps,
        overdueFollowUps,
        completedFollowUps
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const { leadId, customerId, leadName, customerName, type, priority, title, description, scheduledAt, assignedTo } = req.body;
    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Title and communication type are required' });
    }

    const newFup = db.followUps.insertOne(attachWorkspaceContext({
      leadId,
      customerId,
      leadName: leadName || '',
      customerName: customerName || '',
      type: type || 'Call',
      priority: priority || 'MEDIUM',
      title,
      description: description || '',
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: 'PENDING',
      assignedTo: assignedTo || req.user?.name || 'Sales Representative',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    if (leadId) {
      db.activityTimeline.insertOne({
        entityType: 'LEAD',
        entityId: leadId,
        action: 'SCHEDULE_FOLLOWUP',
        description: `Follow-up '${title}' scheduled for ${new Date(scheduledAt || Date.now()).toLocaleDateString()}`,
        performedBy: req.user?.name || 'System',
        timestamp: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'CREATE', 'follow_ups', 'FollowUp', newFup._id, undefined, { title, type });
    return res.status(201).json({ success: true, message: 'Follow-up scheduled successfully', data: newFup });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function completeFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const { outcomeNotes } = req.body;
    const existing = db.followUps.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    const updated = db.followUps.updateById(id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      outcomeNotes: outcomeNotes || 'Completed discussion',
      updatedAt: new Date().toISOString()
    });

    if (existing.leadId) {
      db.activityTimeline.insertOne({
        entityType: 'LEAD',
        entityId: existing.leadId,
        action: 'COMPLETE_FOLLOWUP',
        description: `Follow-up completed: ${outcomeNotes || 'Completed'}`,
        performedBy: req.user?.name || 'System',
        timestamp: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'UPDATE', 'follow_ups', 'FollowUp', id, existing, { status: 'COMPLETED' });
    return res.json({ success: true, message: 'Follow-up marked completed', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 6. SALES REPORTS CONTROLLER
// ==========================================

export async function getSalesReportsData(req: AuthenticatedRequest, res: Response) {
  try {
    const orders = filterByWorkspace(db.salesOrders.getAll(), req);
    const invoices = filterByWorkspace(db.invoices.getAll(), req);
    const leads = filterByWorkspace(db.leads.getAll(), req);
    const quotations = filterByWorkspace(db.quotations.getAll(), req);
    const customers = filterByWorkspace(db.customers.getAll(), req);

    const totalRevenue = invoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const outstandingReceivables = totalRevenue - totalCollected;

    // Monthly Sales aggregation
    const monthlyMap: Record<string, { month: string; sales: number; orders: number; leads: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const currentMonthIdx = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const mName = months[idx];
      monthlyMap[mName] = { month: mName, sales: 0, orders: 0, leads: 0 };
    }

    orders.forEach(o => {
      const date = new Date(o.createdAt || o.orderDate);
      const mName = months[date.getMonth()];
      if (monthlyMap[mName]) {
        monthlyMap[mName].sales += Number(o.grandTotal) || 0;
        monthlyMap[mName].orders += 1;
      }
    });

    leads.forEach(l => {
      const date = new Date(l.createdAt);
      const mName = months[date.getMonth()];
      if (monthlyMap[mName]) {
        monthlyMap[mName].leads += 1;
      }
    });

    const topCustomers = [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        company: c.companyName,
        spent: c.totalSpent,
        orders: c.totalOrdersCount
      }));

    const totalLeadsCount = leads.length || 1;
    const convertedLeadsCount = leads.filter(l => l.status === 'WON' || l.status === 'CONVERTED').length;
    const conversionRate = Math.round((convertedLeadsCount / totalLeadsCount) * 100);

    const totalQuotesCount = quotations.length || 1;
    const convertedQuotesCount = quotations.filter(q => q.status === 'CONVERTED' || q.status === 'APPROVED').length;
    const quoteWinRate = Math.round((convertedQuotesCount / totalQuotesCount) * 100);

    return res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCollected,
          outstandingReceivables,
          totalOrders: orders.length,
          totalLeads: leads.length,
          conversionRate,
          quoteWinRate
        },
        monthlyTrends: Object.values(monthlyMap),
        topCustomers,
        leadSources: Object.entries(
          leads.reduce((acc: Record<string, number>, curr) => {
            const s = curr.source || 'Direct';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value }))
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 7. CALL LOGS CONTROLLERS
// ==========================================

export async function logLeadCall(req: AuthenticatedRequest, res: Response) {
  try {
    const leadId = req.params.id || req.body.leadId;
    const { durationSeconds, outcome, notes, recordingUrl, recordingName, followUpDate, followUpNotes, direction, updateLeadStatus } = req.body;

    const lead = db.leads.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Target Lead record not found' });

    const callerName = req.user?.name || 'Sales Representative';
    const callerId = req.user?.userId || 'usr_emp_1';

    const newCallLog = db.callLogs.insertOne({
      leadId,
      leadName: lead.name,
      leadPhone: lead.phone,
      employeeId: callerId,
      employeeName: callerName,
      direction: direction || 'OUTBOUND',
      durationSeconds: Number(durationSeconds) || 0,
      outcome: outcome || 'CONNECTED',
      notes: notes || 'Call conducted with prospective client',
      recordingUrl: recordingUrl || '',
      recordingName: recordingName || (recordingUrl ? `rec_lead_${leadId}_${Date.now()}.wav` : ''),
      followUpDate: followUpDate || '',
      followUpNotes: followUpNotes || '',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    let newStatus = lead.status;
    if (updateLeadStatus) {
      newStatus = updateLeadStatus;
    } else if (lead.status === 'NEW') {
      newStatus = 'CONTACTED';
    } else if (outcome === 'INTERESTED' && lead.status === 'CONTACTED') {
      newStatus = 'QUALIFIED';
    } else if (outcome === 'CONVERTED') {
      newStatus = 'WON';
    }

    db.leads.updateById(leadId, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    let scheduledFollowUp = null;
    if (followUpDate) {
      scheduledFollowUp = db.followUps.insertOne({
        leadId,
        type: 'Call',
        title: `Follow-up with ${lead.name} (${lead.companyName || lead.phone})`,
        description: followUpNotes || notes || `Follow-up discussion after call on ${new Date().toLocaleDateString()}`,
        scheduledAt: followUpDate.includes('T') ? followUpDate : `${followUpDate}T10:00:00.000Z`,
        status: 'PENDING',
        assignedTo: lead.assignedTo || callerName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'CREATE', 'call_logs', 'Lead Call', newCallLog._id, undefined, {
      leadName: lead.name,
      outcome,
      duration: durationSeconds
    });

    return res.status(201).json({
      success: true,
      message: `Call logged successfully for ${lead.name}`,
      data: {
        callLog: newCallLog,
        lead: db.leads.findById(leadId),
        followUp: scheduledFollowUp
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getLeadCallLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const leadId = req.params.id;
    let logs = db.callLogs.find(c => c.leadId === leadId);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllCallLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, outcome, leadId } = req.query;
    let logs = db.callLogs.getAll();

    if (leadId) logs = logs.filter(c => c.leadId === leadId);
    if (employeeId) logs = logs.filter(c => c.employeeId === employeeId);
    if (outcome) logs = logs.filter(c => c.outcome === outcome);

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCallLog(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.callLogs.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Call log not found' });

    db.callLogs.deleteById(id);
    recordAuditLog(req, 'DELETE', 'call_logs', 'Call Log', id, existing);
    return res.json({ success: true, message: 'Call log deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}


