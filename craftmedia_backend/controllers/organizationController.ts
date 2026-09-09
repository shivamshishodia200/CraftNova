import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { DEFAULT_ORG_ID, DEFAULT_CRAFT_MEDIA_ORG } from '../database/migration';
import { OrganizationDoc, OrganizationBranding, OrganizationFeatures } from '../database/types';

// Storage configuration for uploaded organization assets (logos, favicons)
const UPLOADS_ROOT = path.resolve(__dirname, '../uploads/organizations');
if (!fs.existsSync(UPLOADS_ROOT)) {
  try {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  } catch (err: any) {
    console.error('[Org Storage] Failed to create uploads root directory:', err.message);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgId = req.params.id || 'common';
    const destDir = path.join(UPLOADS_ROOT, orgId);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const field = file.fieldname || 'asset';
    cb(null, `${field}_${Date.now()}${ext}`);
  }
});

export const uploadAsset = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg\+xml|svg/;
    const isMimeOk = allowed.test(file.mimetype);
    const isExtOk = allowed.test(path.extname(file.originalname).toLowerCase());
    if (isMimeOk || isExtOk) {
      return cb(null, true);
    }
    cb(new Error('Only image files (PNG, JPG, WEBP, SVG) are allowed'));
  }
});

// Platform default branding fallback
export const PLATFORM_DEFAULT_BRANDING: OrganizationBranding = {
  companyName: '360CRM Enterprise',
  primaryColor: '#F59E0B',
  secondaryColor: '#111827',
  accentColor: '#EA580C',
  backgroundColor: '#070B14',
  surfaceColor: '#0D1527',
  sidebarBackground: '#080D1A',
  sidebarTextColor: '#94A3B8',
  sidebarActiveColor: '#F59E0B',
  headerBackground: '#FFFFFF',
  headerTextColor: '#0F172A',
  themeMode: 'LIGHT',
  loginTitle: 'Next-Gen Enterprise Platform',
  loginSubtitle: 'Unified business platform for Sales, Inventory, Accounts & Telemetry'
};

// All modules enabled feature set for Super Admin
export const ALL_FEATURES_ENABLED: OrganizationFeatures = {
  dashboard: true,
  crm: { leads: true, customers: true, followUps: true },
  sales: { quotations: true, salesOrders: true, reports: true },
  inventory: { products: true, categories: true, warehouses: true, stockInOut: true, purchases: true, suppliers: true },
  accounts: { invoices: true, payments: true, expenses: true, creditNotes: true, reports: true },
  hr: { employees: true, attendance: true, liveTracking: true, workRecording: true, leave: true, salary: true, performance: true },
  marketing: { campaigns: true, tradeIndia: true, whatsApp: true, reports: true },
  integrations: true,
  reports: true
};

/**
 * MODULE 10: GET /api/app/bootstrap
 * Highly optimized single call returning user, organization, branding, features, and permissions.
 */
export async function getAppBootstrap(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 1. Super Admin response
    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        data: {
          user: {
            id: user.userId,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            roleId: user.roleId,
            avatar: user.avatar,
            organizationId: null
          },
          organization: null,
          branding: PLATFORM_DEFAULT_BRANDING,
          features: ALL_FEATURES_ENABLED,
          permissions: ['*'],
          isSuperAdmin: true
        }
      });
    }

    // 2. Regular Client Admin / Employee response
    const orgId = user.organizationId || DEFAULT_ORG_ID;
    let org = db.organizations.findById(orgId);

    if (!org) {
      org = db.organizations.findById(DEFAULT_ORG_ID) || DEFAULT_CRAFT_MEDIA_ORG;
    }

    // Check organization suspension
    if (org.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_SUSPENDED',
        message: 'Your organization workspace is suspended. Please contact platform administration.'
      });
    }

    // Merge branding with safe defaults
    const resolvedBranding: OrganizationBranding = {
      ...PLATFORM_DEFAULT_BRANDING,
      ...(org.branding || {}),
      companyName: org.branding?.companyName || org.name || '360CRM Client',
      brandingVersion: org.brandingVersion || org.branding?.brandingVersion || 1
    };

    return res.json({
      success: true,
      data: {
        user: {
          id: user.userId,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          avatar: user.avatar,
          organizationId: org._id
        },
        organization: {
          id: org._id,
          _id: org._id,
          name: org.name,
          slug: org.slug,
          clientCode: org.clientCode,
          status: org.status
        },
        branding: resolvedBranding,
        features: org.features || {},
        permissions: user.permissions || [],
        isSuperAdmin: false
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 11: GET /api/public/branding/:slugOrCode
 * Resolves public branding for white-labeled login screens.
 */
export async function getPublicOrgBySlug(req: Request, res: Response) {
  try {
    const slugOrCode = String(
      req.params.slugOrCode || req.params.organizationSlug || req.params.slug || ''
    ).toLowerCase().trim();

    if (!slugOrCode) {
      return res.json({
        success: true,
        data: {
          organization: null,
          branding: { ...PLATFORM_DEFAULT_BRANDING, brandingVersion: 1 }
        }
      });
    }

    const org = db.organizations.findOne(
      o => o.slug.toLowerCase() === slugOrCode ||
           o.clientCode.toLowerCase() === slugOrCode ||
           o._id.toLowerCase() === slugOrCode
    );

    if (!org) {
      return res.status(404).json({
        success: false,
        code: 'ORGANIZATION_NOT_FOUND',
        message: `Organization '${slugOrCode}' not found.`
      });
    }

    const version = org.brandingVersion || org.branding?.brandingVersion || 1;
    const safeBranding = {
      ...PLATFORM_DEFAULT_BRANDING,
      ...(org.branding || {}),
      companyName: org.branding?.companyName || org.name,
      brandingVersion: version
    };

    return res.json({
      success: true,
      data: {
        organization: {
          name: org.name,
          slug: org.slug,
          clientCode: org.clientCode,
          status: org.status
        },
        branding: safeBranding,
        brandingVersion: version,
        // Backward compatibility properties
        name: org.name,
        slug: org.slug,
        clientCode: org.clientCode,
        status: org.status
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 4: GET /api/superadmin/organizations
 * Lists all client organizations with statistics.
 */
export async function getAllOrganizations(req: AuthenticatedRequest, res: Response) {
  try {
    const orgs = db.organizations.getAll();

    // Enrich with dynamic live counts
    const enriched = orgs.map(org => {
      const admins = db.users.countDocuments(u => u.organizationId === org._id && u.role === 'ADMIN');
      const employees = db.employees.countDocuments(e => e.organizationId === org._id);
      const leads = db.leads.countDocuments(l => l.organizationId === org._id);
      const workSessions = db.workSessions.countDocuments(w => w.organizationId === org._id);

      // Count enabled modules
      let enabledCount = 0;
      const f = org.features || {};
      if (f.crm?.leads) enabledCount++;
      if (f.crm?.customers) enabledCount++;
      if (f.sales?.quotations) enabledCount++;
      if (f.sales?.salesOrders) enabledCount++;
      if (f.inventory?.products) enabledCount++;
      if (f.accounts?.invoices) enabledCount++;
      if (f.hr?.employees) enabledCount++;
      if (f.hr?.attendance) enabledCount++;
      if (f.hr?.liveTracking) enabledCount++;
      if (f.hr?.workRecording) enabledCount++;
      if (f.marketing?.campaigns) enabledCount++;
      if (f.integrations) enabledCount++;

      return {
        ...org,
        adminCount: admins,
        employeeCount: employees,
        leadsCount: leads,
        workSessionsCount: workSessions,
        enabledModulesCount: enabledCount
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/superadmin/organizations/:id
 */
export async function getOrganizationById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this organization details' });
    }

    const org = db.organizations.findById(id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const admins = db.users.find(u => u.organizationId === org._id && u.role === 'ADMIN').map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      createdAt: u.createdAt
    }));

    const employees = db.employees.find(e => e.organizationId === org._id).map(e => ({
      _id: e._id,
      employeeId: e.employeeId,
      name: e.name,
      email: e.email,
      department: e.department,
      designation: e.designation,
      status: e.status
    }));

    return res.json({
      success: true,
      data: {
        ...org,
        admins,
        employees
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 5 & 12: POST /api/superadmin/organizations
 * Create a new Client Organization + optional initial Client Admin in a single transaction.
 */
export async function createOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      name,
      slug,
      clientCode,
      contactEmail,
      contactPhone,
      branding,
      features,
      subscription,
      settings,
      initialAdmin
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Organization name is required' });
    }

    const normalizedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const normalizedCode = (clientCode || name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''));

    // Check duplicates
    const existing = db.organizations.findOne(
      o => o.slug.toLowerCase() === normalizedSlug.toLowerCase() ||
           o.clientCode.toLowerCase() === normalizedCode.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An organization with slug '${normalizedSlug}' or code '${normalizedCode}' already exists.`
      });
    }

    const orgId = `org_${normalizedCode.toLowerCase()}_${Date.now().toString().slice(-4)}`;

    const newOrgDoc: OrganizationDoc = {
      _id: orgId,
      name,
      slug: normalizedSlug,
      clientCode: normalizedCode,
      status: 'ACTIVE',
      contactEmail: contactEmail || initialAdmin?.email || 'admin@' + normalizedSlug + '.com',
      contactPhone: contactPhone || initialAdmin?.phone || '',
      branding: {
        ...PLATFORM_DEFAULT_BRANDING,
        companyName: name,
        ...(branding || {})
      },
      features: features || ALL_FEATURES_ENABLED,
      subscription: subscription || {
        plan: 'STANDARD',
        status: 'ACTIVE',
        maxEmployees: 50,
        maxAdmins: 5,
        storageLimitGB: 20
      },
      settings: settings || {
        timezone: 'Asia/Kolkata',
        currency: 'INR'
      },
      adminCount: initialAdmin ? 1 : 0,
      employeeCount: 0,
      storageUsedBytes: 0,
      createdBy: req.user?.userId || 'usr_superadmin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const insertedOrg = db.organizations.insertOne(newOrgDoc);

    // If initial Admin account provided, create it immediately bound to this organizationId
    let createdAdmin = null;
    if (initialAdmin && initialAdmin.email && initialAdmin.password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(initialAdmin.password, salt);

      createdAdmin = db.users.insertOne({
        _id: `usr_admin_${orgId}_${Date.now().toString().slice(-4)}`,
        name: initialAdmin.name || `${name} Administrator`,
        email: initialAdmin.email.toLowerCase().trim(),
        passwordHash,
        phone: initialAdmin.phone || '',
        role: 'ADMIN',
        roleId: 'role_admin',
        organizationId: insertedOrg._id,
        organization: insertedOrg.name,
        status: 'ACTIVE',
        avatar: (initialAdmin.name || name).slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    recordAuditLog(
      req,
      'CREATE',
      'organizations',
      'Organization',
      insertedOrg._id,
      undefined,
      { name: insertedOrg.name, slug: insertedOrg.slug, clientCode: insertedOrg.clientCode }
    );

    return res.status(201).json({
      success: true,
      message: `Organization '${insertedOrg.name}' created successfully`,
      data: {
        organization: insertedOrg,
        admin: createdAdmin ? {
          _id: createdAdmin._id,
          name: createdAdmin.name,
          email: createdAdmin.email,
          role: createdAdmin.role
        } : null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/superadmin/organizations/:id
 * Update organization details, branding, features, or subscription
 */
export async function updateOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const existing = db.organizations.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // If regular Admin, only allow updating their own organization's branding/settings
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this organization' });
    }

    const { name, contactEmail, contactPhone, branding, features, subscription, settings } = req.body;

    const updates: Partial<OrganizationDoc> = {
      updatedAt: new Date().toISOString()
    };

    if (name) updates.name = name;
    if (contactEmail) updates.contactEmail = contactEmail;
    if (contactPhone) updates.contactPhone = contactPhone;

    if (branding) {
      const nextVersion = (existing.brandingVersion || existing.branding?.brandingVersion || 1) + 1;
      updates.brandingVersion = nextVersion;
      updates.branding = {
        ...existing.branding,
        ...branding,
        brandingVersion: nextVersion
      };
    }

    if (features && req.user?.role === 'SUPER_ADMIN') {
      updates.features = {
        ...existing.features,
        ...features
      };
    }

    if (subscription && req.user?.role === 'SUPER_ADMIN') {
      updates.subscription = {
        ...existing.subscription,
        ...subscription
      };
    }

    if (settings) {
      updates.settings = {
        ...existing.settings,
        ...settings
      };
    }

    const updated = db.organizations.updateById(id, updates);

    recordAuditLog(
      req,
      'UPDATE',
      'organizations',
      'Organization',
      id,
      existing,
      updated
    );

    return res.json({
      success: true,
      message: 'Organization settings updated successfully',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 32: PATCH /api/superadmin/organizations/:id/status
 * Suspend or activate a client organization
 */
export async function toggleOrganizationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'TRIAL', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (id === DEFAULT_ORG_ID && status === 'SUSPENDED') {
      return res.status(400).json({ success: false, message: 'Cannot suspend the default platform organization' });
    }

    const existing = db.organizations.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const updated = db.organizations.updateById(id, {
      status,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(
      req,
      'UPDATE',
      'organizations',
      'Organization',
      id,
      { status: existing.status },
      { status }
    );

    return res.json({
      success: true,
      message: `Organization is now ${status}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 6: POST /api/superadmin/organizations/:id/upload
 * Upload organization logo, dark logo, favicon, or login background
 */
export async function uploadOrganizationAsset(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id;
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to upload assets for this organization' });
    }

    const org = db.organizations.findById(id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const assetType = req.body.type || 'logo'; // 'logo' | 'logoDark' | 'favicon' | 'loginBackground'
    const publicUrl = `/uploads/organizations/${id}/${file.filename}`;

    const brandingUpdates: Partial<OrganizationBranding> = { ...org.branding };
    if (assetType === 'logo') brandingUpdates.logoUrl = publicUrl;
    if (assetType === 'logoDark') brandingUpdates.logoDarkUrl = publicUrl;
    if (assetType === 'favicon') brandingUpdates.faviconUrl = publicUrl;
    if (assetType === 'loginBackground') brandingUpdates.loginBackgroundUrl = publicUrl;

    const updated = db.organizations.updateById(id, {
      branding: brandingUpdates as OrganizationBranding,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `Organization ${assetType} uploaded successfully`,
      data: {
        assetType,
        url: publicUrl,
        organization: updated
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * MODULE 7: POST /api/superadmin/upload-asset
 * Upload generic image asset (logo, favicon, banner) during client creation wizard
 */
export async function uploadGenericAsset(req: AuthenticatedRequest, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const host = req.get('host') || 'localhost:5055';
    const protocol = req.protocol || 'http';
    const publicUrl = `${protocol}://${host}/uploads/organizations/common/${file.filename}`;
    const relativeUrl = `/uploads/organizations/common/${file.filename}`;

    return res.json({
      success: true,
      message: 'Asset uploaded successfully',
      data: {
        url: publicUrl,
        relativeUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

