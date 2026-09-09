import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { filterByWorkspace, attachWorkspaceContext, assertTenantOwnership } from '../middleware/workspace';

// ==================== INVOICES ====================
export async function getInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, customerId, search } = req.query;
    let invoices = filterByWorkspace(db.invoices.getAll(), req);

    if (status) invoices = invoices.filter(i => i.status === status);
    if (customerId) invoices = invoices.filter(i => i.customerId === customerId);
    if (search) {
      const q = String(search).toLowerCase();
      invoices = invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
      );
    }

    invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: invoices });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getInvoiceById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const inv = db.invoices.findById(id) || db.invoices.findOne(i => i.invoiceNumber === id || i.salesOrderId === id);
    if (!assertTenantOwnership(inv, req, res, 'Invoice')) return;

    const customer = db.customers.findById(inv.customerId) || db.customers.findOne(c => c.name === inv.customerName);

    return res.json({ success: true, data: { ...inv, customer } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, customerName, salesOrderId, items, dueDate, notes, paymentTerms } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and items are required.' });
    }

    const subTotal = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const taxAmount = items.reduce((acc: number, item: any) => {
      const line = Number(item.quantity) * Number(item.unitPrice);
      const rate = Number(item.taxRate) || 18;
      return acc + (line * (rate / 100));
    }, 0);
    const grandTotal = subTotal + taxAmount;

    const count = db.invoices.countDocuments() + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newInvoice = db.invoices.insertOne(attachWorkspaceContext({
      invoiceNumber,
      salesOrderId,
      customerId,
      customerName: customerName || 'Customer Client',
      items: items.map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku || '',
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate) || 18,
        total: Number(i.quantity) * Number(i.unitPrice) * (1 + (Number(i.taxRate) || 18) / 100)
      })),
      subTotal,
      taxAmount,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      status: 'ISSUED',
      date: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 15 * 86400000).toISOString(),
      paymentTerms: paymentTerms || 'Net 15',
      notes: notes || '',
      createdBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Invoices', `Generated Invoice ${invoiceNumber} for ${customerName} (₹${grandTotal.toLocaleString('en-IN')})`, newInvoice._id, undefined, newInvoice);

    return res.json({
      success: true,
      message: `Invoice ${invoiceNumber} generated successfully`,
      data: newInvoice
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== PAYMENTS ====================
export async function getPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const { type, search } = req.query;
    let payments = filterByWorkspace(db.payments.getAll(), req);

    if (type) payments = payments.filter(p => p.type === type);
    if (search) {
      const q = String(search).toLowerCase();
      payments = payments.filter(p =>
        p.paymentNumber.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
      );
    }

    payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: payments });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      invoiceId,
      partyId,
      partyName,
      customerName,
      customerId,
      partyType,
      amount,
      paymentMode,
      paymentMethod,
      transactionReference,
      referenceNumber,
      paymentDate,
      date,
      notes
    } = req.body || {};

    const pAmount = Number(amount);
    const pPartyName = partyName || customerName;
    let pPartyId = partyId || customerId;
    const pMode = paymentMode || paymentMethod || 'BANK';
    const pRef = transactionReference || referenceNumber || `TXN_${Date.now()}`;
    const pDate = paymentDate || date || new Date().toISOString().split('T')[0];

    if (!pPartyName || !pAmount || pAmount <= 0 || !pMode) {
      return res.status(400).json({
        success: false,
        message: 'Customer/Party name, valid amount (> 0), and payment mode are required.'
      });
    }

    const count = db.payments.countDocuments() + 1;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    // 1. If linked to invoice, adjust invoice balance and determine customerId
    let linkedInvoiceNumber = req.body.invoiceNumber || '';
    if (invoiceId) {
      const invoice = db.invoices.findById(invoiceId);
      if (invoice) {
        if (!assertTenantOwnership(invoice, req, res, 'Invoice')) return;
        linkedInvoiceNumber = invoice.invoiceNumber;
        if (!pPartyId && invoice.customerId) {
          pPartyId = invoice.customerId;
        }

        const nextPaid = (invoice.paidAmount || 0) + pAmount;
        const nextDue = Math.max(0, (invoice.grandTotal || 0) - nextPaid);
        const nextStatus = nextDue <= 0 ? 'PAID' : (nextPaid > 0 ? 'PARTIAL' : 'ISSUED');
        const nextPaymentStatus = nextDue <= 0 ? 'PAID' : (nextPaid > 0 ? 'PARTIAL' : 'UNPAID');

        db.invoices.updateById(invoiceId, {
          paidAmount: nextPaid,
          dueAmount: nextDue,
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 2. Adjust Customer Outstanding Ledger Balance
    const targetCustId = pPartyId || customerId;
    if (targetCustId && targetCustId !== 'client_ref') {
      const customer = db.customers.findById(targetCustId) || db.customers.findOne(c => c.name === pPartyName || c.companyName === pPartyName);
      if (customer) {
        const nextCustomerBalance = Math.max(0, (customer.outstandingBalance || 0) - pAmount);
        db.customers.updateById(customer._id, {
          outstandingBalance: nextCustomerBalance,
          updatedAt: new Date().toISOString()
        });

        // Add to customer activity timeline
        db.activityTimeline.insertOne({
          entityType: 'CUSTOMER',
          entityId: customer._id,
          action: 'PAYMENT',
          description: `Payment receipt ${paymentNumber} of ₹${pAmount.toLocaleString('en-IN')} received via ${pMode}${linkedInvoiceNumber ? ` against Invoice ${linkedInvoiceNumber}` : ''}`,
          performedBy: req.user?.name || 'Accounts Desk',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 3. Save comprehensive payment document
    const newPayment = db.payments.insertOne(attachWorkspaceContext({
      paymentNumber,
      invoiceId: invoiceId || undefined,
      invoiceNumber: linkedInvoiceNumber || undefined,
      partyId: targetCustId || 'client_ref',
      partyName: pPartyName,
      customerId: targetCustId || undefined,
      customerName: pPartyName,
      type: partyType === 'SUPPLIER' ? 'OUTFLOW' : 'INFLOW',
      amount: pAmount,
      paymentMode: pMode,
      paymentMethod: pMode,
      transactionReference: pRef,
      referenceNumber: pRef,
      date: pDate,
      paymentDate: pDate,
      notes: notes || '',
      receivedBy: req.user?.name || 'Accountant',
      createdAt: new Date().toISOString()
    }, req));

    db.activityTimeline.insertOne({
      entityType: 'PAYMENT',
      entityId: newPayment._id,
      action: 'CREATE',
      description: `Payment receipt ${paymentNumber} recorded for ₹${pAmount.toLocaleString('en-IN')} from ${pPartyName}`,
      performedBy: req.user?.name || 'Accounts Desk',
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'Payments', `Recorded payment receipt ${paymentNumber} of ₹${pAmount.toLocaleString('en-IN')} from ${pPartyName}`, newPayment._id, undefined, newPayment);

    return res.json({
      success: true,
      message: `Payment receipt ${paymentNumber} for ₹${pAmount.toLocaleString('en-IN')} recorded successfully.`,
      data: newPayment
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== EXPENSES ====================
export async function getExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    const { category, status } = req.query;
    let expenses = filterByWorkspace(db.expenses.getAll(), req);

    if (category) expenses = expenses.filter(e => e.category === category);
    if (status) expenses = expenses.filter(e => e.status === status);

    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: expenses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, category, amount, paymentMode, vendor, receiptUrl, description, date } = req.body;
    const expAmount = Number(amount);

    if (!title || !expAmount || expAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense title and valid amount are required.' });
    }

    const count = db.expenses.countDocuments() + 1;
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newExpense = db.expenses.insertOne(attachWorkspaceContext({
      expenseNumber,
      title,
      category: category || 'Operations',
      amount: expAmount,
      paymentMode: paymentMode || 'Bank Transfer',
      vendor: vendor || '',
      receiptUrl: receiptUrl || '',
      description: description || '',
      status: 'APPROVED',
      date: date || new Date().toISOString(),
      submittedBy: req.user?.name || 'Staff',
      approvedBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Expenses', `Logged expense ${title} for ₹${expAmount.toLocaleString('en-IN')}`, newExpense._id, undefined, newExpense);

    return res.json({
      success: true,
      message: 'Expense recorded successfully',
      data: newExpense
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== RECEIVABLES & PAYABLES ====================
export async function getReceivables(req: AuthenticatedRequest, res: Response) {
  try {
    const invoices = filterByWorkspace(db.invoices.getAll(), req).filter(i => i.dueAmount > 0 && i.status !== 'CANCELLED');
    const totalReceivable = invoices.reduce((acc, i) => acc + (i.dueAmount || 0), 0);

    return res.json({
      success: true,
      data: {
        totalReceivable,
        count: invoices.length,
        invoices
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getPayables(req: AuthenticatedRequest, res: Response) {
  try {
    const purchases = filterByWorkspace(db.purchases.getAll(), req).filter(p => p.paymentStatus !== 'PAID');
    const totalPayable = purchases.reduce((acc, p) => acc + ((p.grandTotal || 0) - (p.paidAmount || 0)), 0);

    return res.json({
      success: true,
      data: {
        totalPayable,
        count: purchases.length,
        purchases
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== CREDIT NOTES ====================
export async function getCreditNotes(req: AuthenticatedRequest, res: Response) {
  try {
    const notes = filterByWorkspace(db.creditNotes.getAll(), req);
    return res.json({ success: true, data: notes });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCreditNote(req: AuthenticatedRequest, res: Response) {
  try {
    const { invoiceId, customerId, customerName, amount, reason, items } = req.body;
    const cnAmount = Number(amount);

    if (!customerName || !cnAmount || cnAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Customer name and valid amount are required.' });
    }

    const count = db.creditNotes.countDocuments() + 1;
    const creditNoteNumber = `CN-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newNote = db.creditNotes.insertOne(attachWorkspaceContext({
      creditNoteNumber,
      invoiceId,
      customerId: customerId || 'cust_ref',
      customerName,
      amount: cnAmount,
      reason: reason || 'Sales Return / Rate Difference',
      items: items || [],
      status: 'ISSUED',
      date: new Date().toISOString(),
      createdBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Credit Notes', `Issued Credit Note ${creditNoteNumber} for ${customerName} (₹${cnAmount.toLocaleString('en-IN')})`, newNote._id);

    return res.json({
      success: true,
      message: `Credit note ${creditNoteNumber} issued.`,
      data: newNote
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
