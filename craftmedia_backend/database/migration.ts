import { db } from './db';
import { OrganizationDoc } from './types';

export const DEFAULT_ORG_ID = 'org_craftmedia';

export const DEFAULT_CRAFT_MEDIA_ORG: OrganizationDoc = {
  _id: DEFAULT_ORG_ID,
  name: 'Craft Media Hub',
  slug: 'craft-media-hub',
  clientCode: 'CMH',
  status: 'ACTIVE',
  contactEmail: 'admin@craftmediahub.com',
  contactPhone: '+91 98123 45678',
  branding: {
    companyName: 'Craft Media Hub',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: '#F59E0B',
    secondaryColor: '#111827',
    accentColor: '#EA580C',
    backgroundColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    sidebarBackground: '#080D1A',
    sidebarTextColor: '#94A3B8',
    sidebarActiveColor: '#F59E0B',
    headerBackground: '#FFFFFF',
    headerTextColor: '#0F172A',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EF4444',
    loginBackgroundUrl: '',
    loginTitle: 'Welcome to Craft Media Hub',
    loginSubtitle: 'Unified business platform for Sales, Inventory, Accounts & Telemetry',
    footerText: 'Craft Media Hub CRM Enterprise Suite • Secure Multi-Tenant Architecture',
    borderRadius: '12px',
    themeMode: 'LIGHT'
  },
  features: {
    dashboard: true,
    crm: {
      leads: true,
      customers: true,
      followUps: true
    },
    sales: {
      quotations: true,
      salesOrders: true,
      reports: true
    },
    inventory: {
      products: true,
      categories: true,
      warehouses: true,
      stockInOut: true,
      purchases: true,
      suppliers: true
    },
    accounts: {
      invoices: true,
      payments: true,
      expenses: true,
      creditNotes: true,
      reports: true
    },
    hr: {
      employees: true,
      attendance: true,
      liveTracking: true,
      workRecording: true,
      leave: true,
      salary: true,
      performance: true
    },
    marketing: {
      campaigns: true,
      tradeIndia: true,
      whatsApp: true,
      reports: true
    },
    integrations: true,
    reports: true
  },
  subscription: {
    plan: 'ENTERPRISE_UNLIMITED',
    status: 'ACTIVE',
    maxEmployees: 100,
    maxAdmins: 10,
    storageLimitGB: 50,
    recordingStorageGB: 50,
    maxMonthlyLeads: 10000
  },
  settings: {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY'
  },
  adminCount: 1,
  employeeCount: 5,
  storageUsedBytes: 10485760,
  createdBy: 'usr_superadmin',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

/**
 * Non-destructive Multi-Tenant Migration
 * Ensures Default Organization exists and all historical records are cleanly assigned.
 */
export async function runMultiTenantMigration() {
  console.log('[Migration] 🏢 Running Multi-Tenant Organization & Data Isolation migration...');

  // 1. Ensure Default Organization exists
  let defaultOrg = db.organizations.findById(DEFAULT_ORG_ID);
  if (!defaultOrg) {
    const existingCraft = db.organizations.findOne(o => o.slug === 'craft-media-hub');
    if (existingCraft) {
      defaultOrg = existingCraft;
    } else {
      defaultOrg = db.organizations.insertOne(DEFAULT_CRAFT_MEDIA_ORG);
      console.log(`[Migration] ✅ Created Default Organization: ${defaultOrg.name} (${defaultOrg._id})`);
    }
  }

  const targetOrgId = defaultOrg._id;

  // 2. Helper to batch tag documents with organizationId if missing
  function migrateCollection(name: string, collection: any, isUserCol = false) {
    if (!collection) return;
    const items = collection.getAll();
    let migratedCount = 0;

    for (const item of items) {
      if (isUserCol && item.role === 'SUPER_ADMIN') {
        if (item.organizationId !== null) {
          collection.updateById(item._id, { organizationId: null });
        }
        continue;
      }

      if (!item.organizationId) {
        collection.updateById(item._id, { organizationId: targetOrgId });
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`[Migration] Migrated ${migratedCount} ${name} to organization ${targetOrgId}`);
    }
  }

  // 3. Migrate core entities
  migrateCollection('users', db.users, true);
  migrateCollection('employees', db.employees);
  migrateCollection('leads', db.leads);
  migrateCollection('customers', db.customers);
  migrateCollection('quotations', db.quotations);
  migrateCollection('salesOrders', db.salesOrders);
  migrateCollection('invoices', db.invoices);
  migrateCollection('payments', db.payments);
  migrateCollection('expenses', db.expenses);
  migrateCollection('creditNotes', db.creditNotes);
  migrateCollection('products', db.products);
  migrateCollection('categories', db.categories);
  migrateCollection('warehouses', db.warehouses);
  migrateCollection('stockTransactions', db.stockTransactions);
  migrateCollection('suppliers', db.suppliers);
  migrateCollection('purchases', db.purchases);
  migrateCollection('attendance', db.attendance);
  migrateCollection('salaries', db.salaries);
  migrateCollection('performance', db.performance);
  migrateCollection('leaves', db.leaves);
  migrateCollection('tasks', db.tasks);
  migrateCollection('messages', db.messages);
  migrateCollection('campaigns', db.campaigns);
  migrateCollection('leadSources', db.leadSources);
  migrateCollection('followUps', db.followUps);
  migrateCollection('callLogs', db.callLogs);
  migrateCollection('activityTimeline', db.activityTimeline);
  migrateCollection('notifications', db.notifications);

  // 4. Migrate work sessions & telemetry
  migrateCollection('workSessions', db.workSessions);
  migrateCollection('recordingSegments', db.recordingSegments);
  migrateCollection('workSessionActivities', db.workSessionActivities);
  migrateCollection('workSessionPolicies', db.workSessionPolicies);
  migrateCollection('latestLocations', db.latestLocations);
  migrateCollection('locationHistory', db.locationHistory);
  migrateCollection('geofences', db.geofences);
  migrateCollection('geofenceEvents', db.geofenceEvents);
  migrateCollection('trackingPolicies', db.trackingPolicies);
  migrateCollection('dailyTrackingSummaries', db.dailyTrackingSummaries);
  migrateCollection('trackingAlerts', db.trackingAlerts);

  // 5. Update Organization Stats (Admin count, Employee count)
  const orgAdmins = db.users.countDocuments(u => u.organizationId === targetOrgId && u.role === 'ADMIN');
  const orgEmployees = db.employees.countDocuments(e => e.organizationId === targetOrgId);
  db.organizations.updateById(targetOrgId, {
    adminCount: orgAdmins,
    employeeCount: orgEmployees,
    updatedAt: new Date().toISOString()
  });

  console.log(`[Migration] ✅ Multi-Tenant migration completed successfully. Org: ${defaultOrg.name} (Admins: ${orgAdmins}, Employees: ${orgEmployees})`);
}
