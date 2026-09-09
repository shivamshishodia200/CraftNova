import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { filterByWorkspace, attachWorkspaceContext } from '../middleware/workspace';

// ==================== PRODUCTS ====================
export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const { category, search, minStock, warehouseId } = req.query;
    let products = filterByWorkspace(db.products.getAll(), req);

    if (category) {
      products = products.filter(p => p.category === category || p.categoryId === category);
    }
    if (search) {
      const q = String(search).toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (minStock === 'true') {
      products = products.filter(p => p.currentStock <= p.minStockLevel);
    }

    return res.json({ success: true, data: products });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const body = req.body || {};
    const { name, sku, category, categoryId, unit, purchasePrice, sellingPrice, warehouseId, description } = body;
    
    const taxRate = body.taxRate !== undefined ? body.taxRate : body.taxPercent;
    const minStockLevel = body.minStockLevel !== undefined ? body.minStockLevel : body.minStock;
    const initialStock = body.initialStock !== undefined ? body.initialStock : body.currentStock;

    if (!name || !sku || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Name, SKU, purchase price, and selling price are required.' });
    }

    const existing = db.products.findOne(p => p.sku.toLowerCase() === sku.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: `Product with SKU '${sku}' already exists.` });
    }

    const currentStock = Number(initialStock) || 0;
    const newProduct = db.products.insertOne(attachWorkspaceContext({
      name,
      sku: sku.toUpperCase(),
      category: category || 'General',
      categoryId: categoryId || 'cat_general',
      unit: unit || 'Pcs',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate) || 18,
      taxPercent: Number(taxRate) || 18,
      minStockLevel: Number(minStockLevel) || 10,
      minStock: Number(minStockLevel) || 10,
      currentStock,
      description: description || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, req));

    if (currentStock > 0) {
      db.stockTransactions.insertOne({
        productId: newProduct._id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'STOCK_IN',
        quantity: currentStock,
        unitPrice: newProduct.purchasePrice,
        totalAmount: currentStock * newProduct.purchasePrice,
        referenceType: 'INITIAL',
        referenceId: 'INIT',
        warehouseId: warehouseId || 'wh_main',
        performedBy: req.user?.name || 'Admin',
        date: new Date().toISOString(),
        notes: 'Initial opening stock allocation'
      });
    }

    recordAuditLog(req, 'CREATE', 'Inventory', `Created product ${name} (${sku})`, newProduct._id, undefined, newProduct);

    return res.json({ success: true, message: 'Product created successfully', data: newProduct });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const product = db.products.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updated = db.products.updateById(id, {
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'Inventory', `Updated product ${product.name}`, id, product, updated);

    return res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const product = db.products.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    db.products.deleteById(id);
    recordAuditLog(req, 'DELETE', 'Inventory', `Deleted product ${product.name}`, id);

    return res.json({ success: true, message: 'Product removed from catalog' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== CATEGORIES ====================
export async function getCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const categories = db.categories.getAll();
    return res.json({ success: true, data: categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, description, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const newCat = db.categories.insertOne({
      name,
      description: description || '',
      parentId: parentId || undefined,
      createdAt: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'Inventory', `Created category ${name}`, newCat._id);
    return res.json({ success: true, message: 'Category created', data: newCat });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== WAREHOUSES ====================
export async function getWarehouses(req: AuthenticatedRequest, res: Response) {
  try {
    const warehouses = filterByWorkspace(db.warehouses.getAll(), req);
    return res.json({ success: true, data: warehouses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createWarehouse(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, code, address, city, state, pincode, manager, phone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Warehouse name is required' });
    }

    const newWh = db.warehouses.insertOne(attachWorkspaceContext({
      name,
      code: code || `WH_${Date.now().toString().slice(-4)}`,
      address: address || '',
      city: city || 'Varanasi',
      state: state || 'Uttar Pradesh',
      pincode: pincode || '221001',
      manager: manager || req.user?.name || 'Warehouse Manager',
      phone: phone || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Inventory', `Created warehouse ${name}`, newWh._id);
    return res.json({ success: true, message: 'Warehouse created', data: newWh });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== INVENTORY SUMMARY & TRANSACTIONS ====================
export async function getInventorySummary(req: AuthenticatedRequest, res: Response) {
  try {
    const products = filterByWorkspace(db.products.getAll(), req);
    const totalItems = products.length;
    const totalStockQuantity = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
    const totalStockValue = products.reduce((acc, p) => acc + ((p.currentStock || 0) * (p.purchasePrice || 0)), 0);
    const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockLevel || 0)).length;

    return res.json({
      success: true,
      data: {
        totalItems,
        totalStockQuantity,
        totalStockValue,
        lowStockCount,
        products
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function performStockIn(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId, quantity, warehouseId, referenceType, referenceId, unitPrice, notes } = req.body;
    const qty = Number(quantity);

    if (!productId || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid productId and positive quantity are required.' });
    }

    const product = db.products.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const price = unitPrice !== undefined ? Number(unitPrice) : product.purchasePrice;
    const updatedStock = (product.currentStock || 0) + qty;
    db.products.updateById(productId, { currentStock: updatedStock });

    const tx = db.stockTransactions.insertOne(attachWorkspaceContext({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'STOCK_IN',
      quantity: qty,
      unitPrice: price,
      totalAmount: qty * price,
      referenceType: referenceType || 'PURCHASE',
      referenceId: referenceId || `IN_${Date.now()}`,
      warehouseId: warehouseId || 'wh_main',
      performedBy: req.user?.name || 'Staff',
      date: new Date().toISOString(),
      notes: notes || 'Stock received'
    }, req));

    recordAuditLog(req, 'UPDATE', 'Inventory', `Stock in: added ${qty} units to ${product.name}`, product._id);

    return res.json({
      success: true,
      message: 'Stock received and updated',
      data: { product: db.products.findById(productId), transaction: tx }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function performStockOut(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId, quantity, warehouseId, referenceType, referenceId, notes } = req.body;
    const qty = Number(quantity);

    if (!productId || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid productId and positive quantity are required.' });
    }

    const product = db.products.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if ((product.currentStock || 0) < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.currentStock || 0}, requested: ${qty}`
      });
    }

    const updatedStock = (product.currentStock || 0) - qty;
    db.products.updateById(productId, { currentStock: updatedStock });

    const tx = db.stockTransactions.insertOne(attachWorkspaceContext({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'STOCK_OUT',
      quantity: qty,
      unitPrice: product.sellingPrice,
      totalAmount: qty * product.sellingPrice,
      referenceType: referenceType || 'DISPATCH',
      referenceId: referenceId || `OUT_${Date.now()}`,
      warehouseId: warehouseId || 'wh_main',
      performedBy: req.user?.name || 'Staff',
      date: new Date().toISOString(),
      notes: notes || 'Stock dispatched'
    }, req));

    recordAuditLog(req, 'UPDATE', 'Inventory', `Stock out: removed ${qty} units from ${product.name}`, product._id);

    return res.json({
      success: true,
      message: 'Stock deducted successfully',
      data: { product: db.products.findById(productId), transaction: tx }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStockTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId, type, warehouseId } = req.query;
    let list = filterByWorkspace(db.stockTransactions.getAll(), req);

    if (productId) list = list.filter(t => t.productId === productId);
    if (type) list = list.filter(t => t.type === type);
    if (warehouseId) list = list.filter(t => t.warehouseId === warehouseId);

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== SUPPLIERS ====================
export async function getSuppliers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search } = req.query;
    let suppliers = filterByWorkspace(db.suppliers.getAll(), req);

    if (search) {
      const q = String(search).toLowerCase();
      suppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstNumber && s.gstNumber.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, data: suppliers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, contactPerson, email, phone, address, city, state, pincode, gstNumber, paymentTerms } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone are required.' });
    }

    const newSupplier = db.suppliers.insertOne(attachWorkspaceContext({
      name,
      contactPerson: contactPerson || '',
      email: email || '',
      phone,
      address: address || '',
      city: city || 'Varanasi',
      state: state || 'Uttar Pradesh',
      pincode: pincode || '',
      gstNumber: gstNumber || '',
      paymentTerms: paymentTerms || 'Net 30',
      status: 'ACTIVE',
      outstandingBalance: 0,
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Suppliers', `Added supplier ${name}`, newSupplier._id);

    return res.json({ success: true, message: 'Supplier registered', data: newSupplier });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSupplier(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const supplier = db.suppliers.findById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updated = db.suppliers.updateById(id, req.body);
    recordAuditLog(req, 'UPDATE', 'Suppliers', `Updated supplier ${supplier.name}`, id, supplier, updated);

    return res.json({ success: true, message: 'Supplier updated', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==================== PURCHASES ====================
export async function getPurchases(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, supplierId } = req.query;
    let purchases = filterByWorkspace(db.purchases.getAll(), req);

    if (status) purchases = purchases.filter(p => p.status === status);
    if (supplierId) purchases = purchases.filter(p => p.supplierId === supplierId);

    purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: purchases });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPurchase(req: AuthenticatedRequest, res: Response) {
  try {
    const { supplierId, supplierName, items, notes, warehouseId } = req.body;
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and line items are required' });
    }

    const subTotal = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const taxAmount = items.reduce((acc: number, item: any) => {
      const lineSub = Number(item.quantity) * Number(item.unitPrice);
      const taxRate = Number(item.taxRate) || 18;
      return acc + (lineSub * (taxRate / 100));
    }, 0);
    const grandTotal = subTotal + taxAmount;

    const count = db.purchases.countDocuments() + 1;
    const purchaseNumber = `PO-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newPO = db.purchases.insertOne(attachWorkspaceContext({
      purchaseNumber,
      supplierId,
      supplierName: supplierName || 'Supplier Partner',
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
      status: 'ORDERED',
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      warehouseId: warehouseId || 'wh_main',
      notes: notes || '',
      date: new Date().toISOString(),
      createdBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString()
    }, req));

    recordAuditLog(req, 'CREATE', 'Purchases', `Issued Purchase Order ${purchaseNumber}`, newPO._id, undefined, newPO);

    return res.json({ success: true, message: 'Purchase Order created', data: newPO });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function receivePurchase(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = db.purchases.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (po.status === 'RECEIVED') {
      return res.status(400).json({ success: false, message: 'This PO has already been received into stock.' });
    }

    // Automatically increase inventory stock
    for (const item of po.items) {
      const product = db.products.findById(item.productId);
      if (product) {
        const nextStock = (product.currentStock || 0) + item.quantity;
        db.products.updateById(item.productId, { currentStock: nextStock });

        db.stockTransactions.insertOne({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'STOCK_IN',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.quantity * item.unitPrice,
          referenceType: 'PURCHASE',
          referenceId: po.purchaseNumber,
          warehouseId: po.warehouseId || 'wh_main',
          performedBy: req.user?.name || 'Staff',
          date: new Date().toISOString(),
          notes: `Received from PO ${po.purchaseNumber}`
        });
      }
    }

    const updated = db.purchases.updateById(id, {
      status: 'RECEIVED',
      receivedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'Purchases', `Received PO ${po.purchaseNumber} into stock`, id, po, updated);

    return res.json({ success: true, message: `PO ${po.purchaseNumber} received and inventory updated.`, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
