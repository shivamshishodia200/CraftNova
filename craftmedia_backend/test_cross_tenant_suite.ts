import { generateToken, AuthenticatedUser } from './middleware/auth';
import { db } from './database/db';
import { createBackendApp } from './serverApp';
import http from 'http';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(category: string, name: string, condition: boolean, expected: string, actual: string, error?: string) {
  results.push({
    category,
    name,
    passed: condition,
    expected,
    actual,
    error
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${symbol} [${category}] ${name}`);
  if (!condition) {
    console.error(`     Expected: ${expected}`);
    console.error(`     Actual:   ${actual}`);
    if (error) console.error(`     Error:    ${error}`);
  }
}

async function makeRequest(
  port: number,
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: { raw: responseBody } });
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 CRAFTMEDIA ENTERPRISE MULTI-TENANT & IDOR SECURITY TEST SUITE');
  console.log('================================================================\n');

  // 1. Initialize Server & DB
  console.log('[Setup] Initializing server and database engine...');
  const app = await createBackendApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = server.address() as any;
  const PORT = address.port;
  console.log(`[Setup] Test server running on http://127.0.0.1:${PORT}\n`);

  // Ensure test organizations exist
  const dpOrgId = 'org_deliveryplus';
  const ssOrgId = 'org_shivshakti';

  let dpOrg = db.organizations.findById(dpOrgId);
  if (!dpOrg) {
    dpOrg = {
      _id: dpOrgId,
      name: 'DeliveryPlus Logistics',
      slug: 'deliveryplus',
      clientCode: 'DP01',
      status: 'ACTIVE',
      contactEmail: 'contact@deliveryplus.com',
      branding: {
        companyName: 'DeliveryPlus Logistics',
        primaryColor: '#F59E0B',
        secondaryColor: '#111827',
        accentColor: '#EA580C',
        sidebarBackground: '#0F172A',
        themeMode: 'LIGHT'
      },
      subscription: { plan: 'ENTERPRISE', status: 'ACTIVE', maxEmployees: 100, maxAdmins: 10, storageLimitGB: 50 },
      adminCount: 1,
      employeeCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.organizations.insertOne(dpOrg);
  } else {
    db.organizations.updateById(dpOrgId, { slug: 'deliveryplus', name: 'DeliveryPlus Logistics' });
  }

  let ssOrg = db.organizations.findById(ssOrgId);
  if (!ssOrg) {
    ssOrg = {
      _id: ssOrgId,
      name: 'Shiv Shakti Enterprises',
      slug: 'shiv-shakti',
      clientCode: 'SS01',
      status: 'ACTIVE',
      contactEmail: 'info@shivshakti.in',
      branding: {
        companyName: 'Shiv Shakti Enterprises',
        primaryColor: '#7C3AED',
        secondaryColor: '#1F2937',
        accentColor: '#8B5CF6',
        sidebarBackground: '#1E1B4B',
        themeMode: 'LIGHT'
      },
      subscription: { plan: 'PROFESSIONAL', status: 'ACTIVE', maxEmployees: 50, maxAdmins: 5, storageLimitGB: 20 },
      adminCount: 1,
      employeeCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.organizations.insertOne(ssOrg);
  } else {
    db.organizations.updateById(ssOrgId, { slug: 'shiv-shakti', name: 'Shiv Shakti Enterprises' });
  }

  // Ensure test users exist in DB
  const allPermissions = [
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
    'leads.view', 'leads.create', 'leads.update', 'leads.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.delete',
    'sales_orders.view', 'sales_orders.create', 'sales_orders.update', 'sales_orders.delete',
    'invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete',
    'payments.view', 'payments.create',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'employees.view', 'employees.create', 'employees.update', 'employees.delete',
    'attendance.view', 'attendance.create', 'attendance.update',
    'reports.view', 'settings.view', 'settings.update'
  ];

  // Super Admin
  let superAdminUser = db.users.findById('usr_test_superadmin');
  if (!superAdminUser) {
    superAdminUser = {
      _id: 'usr_test_superadmin',
      name: 'Global Super Admin',
      email: 'superadmin_test@craftmedia.com',
      role: 'SUPER_ADMIN',
      roleId: 'role_superadmin',
      organizationId: null,
      permissions: allPermissions,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.users.insertOne(superAdminUser);
  }

  // DeliveryPlus Admin
  let dpAdminUser = db.users.findById('usr_test_dp_admin');
  if (!dpAdminUser) {
    dpAdminUser = {
      _id: 'usr_test_dp_admin',
      name: 'DeliveryPlus Admin',
      email: 'admin_test@deliveryplus.com',
      role: 'ADMIN',
      roleId: 'role_admin',
      organizationId: dpOrgId,
      permissions: allPermissions,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.users.insertOne(dpAdminUser);
  }

  // Shiv Shakti Admin
  let ssAdminUser = db.users.findById('usr_test_ss_admin');
  if (!ssAdminUser) {
    ssAdminUser = {
      _id: 'usr_test_ss_admin',
      name: 'Shiv Shakti Admin',
      email: 'admin_test@shivshakti.com',
      role: 'ADMIN',
      roleId: 'role_admin',
      organizationId: ssOrgId,
      permissions: allPermissions,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.users.insertOne(ssAdminUser);
  }

  // Employees
  let dpEmployee = db.employees.findById('emp_dp_test_01');
  if (!dpEmployee) {
    dpEmployee = {
      _id: 'emp_dp_test_01',
      organizationId: dpOrgId,
      name: 'Jack Thompson (DeliveryPlus)',
      email: 'jack_test@deliveryplus.com',
      designation: 'Operations Executive',
      department: 'Logistics',
      salary: 65000,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.employees.insertOne(dpEmployee);
  }

  let ssEmployee = db.employees.findById('emp_ss_test_01');
  if (!ssEmployee) {
    ssEmployee = {
      _id: 'emp_ss_test_01',
      organizationId: ssOrgId,
      name: 'Amit Sharma (Shiv Shakti)',
      email: 'amit_test@shivshakti.com',
      designation: 'Warehouse Manager',
      department: 'Storage',
      salary: 45000,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.employees.insertOne(ssEmployee);
  }

  // DeliveryPlus Employee User
  let dpEmpUser = db.users.findById('usr_test_dp_emp');
  if (!dpEmpUser) {
    dpEmpUser = {
      _id: 'usr_test_dp_emp',
      name: 'Jack Thompson',
      email: 'jack_test@deliveryplus.com',
      role: 'EMPLOYEE',
      roleId: 'role_employee',
      organizationId: dpOrgId,
      employeeId: 'emp_dp_test_01',
      permissions: ['attendance.create', 'attendance.view', 'leads.view'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.users.insertOne(dpEmpUser);
  }

  // Seed sample records for both tenants
  let dpCustomer = db.customers.findById('cust_dp_test_01');
  if (!dpCustomer) {
    dpCustomer = {
      _id: 'cust_dp_test_01',
      organizationId: dpOrgId,
      name: 'Sydney Logistics Partner',
      company: 'Sydney Freight Pty Ltd',
      email: 'ops@sydneyfreight.com.au',
      phone: '+61 2 9000 1111',
      totalSpent: 45000,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.customers.insertOne(dpCustomer);
  }

  let ssCustomer = db.customers.findById('cust_ss_test_01');
  if (!ssCustomer) {
    ssCustomer = {
      _id: 'cust_ss_test_01',
      organizationId: ssOrgId,
      name: 'Delhi Retail Store',
      company: 'Shiv Shakti Retail',
      email: 'owner@shivshaktistore.in',
      phone: '+91 98111 22334',
      totalSpent: 120000,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.customers.insertOne(ssCustomer);
  }

  let dpLead = db.leads.findById('lead_dp_test_01');
  if (!dpLead) {
    dpLead = {
      _id: 'lead_dp_test_01',
      organizationId: dpOrgId,
      name: 'Melbourne Courier Client',
      company: 'Melbourne Express',
      email: 'client@melbexpress.com.au',
      phone: '+61 3 8000 2222',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.leads.insertOne(dpLead);
  }

  let ssLead = db.leads.findById('lead_ss_test_01');
  if (!ssLead) {
    ssLead = {
      _id: 'lead_ss_test_01',
      organizationId: ssOrgId,
      name: 'Noida Agro Trader',
      company: 'Noida Wholesale',
      email: 'trader@noidatrading.in',
      phone: '+91 98765 43210',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.leads.insertOne(ssLead);
  }

  let dpProduct = db.products.findById('prod_dp_test_01');
  if (!dpProduct) {
    dpProduct = {
      _id: 'prod_dp_test_01',
      organizationId: dpOrgId,
      name: 'GPS Tracker Device v2',
      sku: 'DP-GPS-002',
      category: 'Electronics',
      purchasePrice: 50,
      sellingPrice: 120,
      currentStock: 100,
      minStockLevel: 10,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.products.insertOne(dpProduct);
  }

  let ssProduct = db.products.findById('prod_ss_test_01');
  if (!ssProduct) {
    ssProduct = {
      _id: 'prod_ss_test_01',
      organizationId: ssOrgId,
      name: 'Premium Basmati Rice 25kg',
      sku: 'SS-RICE-025',
      category: 'Food',
      purchasePrice: 1800,
      sellingPrice: 2400,
      currentStock: 50,
      minStockLevel: 5,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.products.insertOne(ssProduct);
  }

  let dpInvoice = db.invoices.findById('inv_dp_test_01');
  if (!dpInvoice) {
    dpInvoice = {
      _id: 'inv_dp_test_01',
      invoiceNumber: 'INV-DP-1001',
      organizationId: dpOrgId,
      customerId: dpCustomer._id,
      customerName: dpCustomer.name,
      grandTotal: 5000,
      paidAmount: 5000,
      status: 'PAID',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.invoices.insertOne(dpInvoice);
  }

  let ssInvoice = db.invoices.findById('inv_ss_test_01');
  if (!ssInvoice) {
    ssInvoice = {
      _id: 'inv_ss_test_01',
      invoiceNumber: 'INV-SS-2001',
      organizationId: ssOrgId,
      customerId: ssCustomer._id,
      customerName: ssCustomer.name,
      grandTotal: 15000,
      paidAmount: 0,
      status: 'UNPAID',
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.invoices.insertOne(ssInvoice);
  }

  // Generate Tokens using authentic helper
  const superAdminToken = generateToken({
    userId: superAdminUser._id,
    email: superAdminUser.email,
    name: superAdminUser.name,
    role: superAdminUser.role,
    roleId: superAdminUser.roleId,
    permissions: superAdminUser.permissions || [],
    organizationId: null
  });

  const dpAdminToken = generateToken({
    userId: dpAdminUser._id,
    email: dpAdminUser.email,
    name: dpAdminUser.name,
    role: dpAdminUser.role,
    roleId: dpAdminUser.roleId,
    permissions: dpAdminUser.permissions || [],
    organizationId: dpOrgId
  });

  const ssAdminToken = generateToken({
    userId: ssAdminUser._id,
    email: ssAdminUser.email,
    name: ssAdminUser.name,
    role: ssAdminUser.role,
    roleId: ssAdminUser.roleId,
    permissions: ssAdminUser.permissions || [],
    organizationId: ssOrgId
  });

  const dpEmployeeToken = generateToken({
    userId: dpEmpUser._id,
    email: dpEmpUser.email,
    name: dpEmpUser.name,
    role: dpEmpUser.role,
    roleId: dpEmpUser.roleId,
    permissions: dpEmpUser.permissions || [],
    organizationId: dpOrgId
  });

  // =========================================================================
  // TEST GROUP 1: PUBLIC BRANDING & APP BOOTSTRAP
  // =========================================================================
  console.log('\n--- Group 1: Public Branding & App Bootstrap ---');

  const dpBrandingRes = await makeRequest(PORT, 'GET', '/api/public/branding/deliveryplus');
  assert(
    'Branding',
    'Public branding lookup by slug (deliveryplus)',
    dpBrandingRes.status === 200 && dpBrandingRes.body?.data?.branding?.companyName?.includes('DeliveryPlus'),
    'HTTP 200 with DeliveryPlus branding',
    `HTTP ${dpBrandingRes.status}, Name: ${dpBrandingRes.body?.data?.branding?.companyName}`
  );

  const ssBrandingRes = await makeRequest(PORT, 'GET', '/api/public/branding/shiv-shakti');
  assert(
    'Branding',
    'Public branding lookup by slug (shiv-shakti)',
    ssBrandingRes.status === 200 && ssBrandingRes.body?.data?.branding?.companyName?.includes('Shiv Shakti'),
    'HTTP 200 with Shiv Shakti branding',
    `HTTP ${ssBrandingRes.status}, Name: ${ssBrandingRes.body?.data?.branding?.companyName}`
  );

  const dpBootstrapRes = await makeRequest(PORT, 'GET', '/api/app/bootstrap', dpAdminToken);
  assert(
    'Bootstrap',
    'App bootstrap for DeliveryPlus Admin returns scoped organization config',
    dpBootstrapRes.status === 200 && dpBootstrapRes.body?.data?.organization?._id === dpOrgId,
    `HTTP 200 with orgId=${dpOrgId}`,
    `HTTP ${dpBootstrapRes.status}, orgId=${dpBootstrapRes.body?.data?.organization?._id}`
  );

  // =========================================================================
  // TEST GROUP 2: CROSS-TENANT DATA ISOLATION (ZERO IDOR)
  // =========================================================================
  console.log('\n--- Group 2: Cross-Tenant Data Isolation & Anti-IDOR Enforcement ---');

  // Test 2.1: Leads Isolation
  const dpLeadsRes = await makeRequest(PORT, 'GET', '/api/leads', dpAdminToken);
  const dpLeads = dpLeadsRes.body?.data || [];
  const dpLeadsClean = dpLeads.length > 0 && dpLeads.every((l: any) => l.organizationId === dpOrgId);
  assert(
    'IDOR: Leads Query',
    'DeliveryPlus Admin GET /api/leads only receives DeliveryPlus leads',
    dpLeadsRes.status === 200 && dpLeadsClean,
    `Only ${dpOrgId} leads`,
    `Found ${dpLeads.length} leads, all matching org: ${dpLeadsClean}`
  );

  // Test 2.2: Lead Modification IDOR Attack
  const idorLeadUpdateRes = await makeRequest(PORT, 'PUT', `/api/leads/${ssLead._id}`, dpAdminToken, {
    name: 'HACKED LEAD BY DELIVERYPLUS'
  });
  assert(
    'IDOR: Lead Modification',
    'DeliveryPlus Admin PUT /api/leads/:ss_lead_id is blocked with 403 Forbidden',
    idorLeadUpdateRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorLeadUpdateRes.status} - ${idorLeadUpdateRes.body?.message}`
  );

  // Test 2.3: Lead Deletion IDOR Attack
  const idorLeadDeleteRes = await makeRequest(PORT, 'DELETE', `/api/leads/${ssLead._id}`, dpAdminToken);
  assert(
    'IDOR: Lead Deletion',
    'DeliveryPlus Admin DELETE /api/leads/:ss_lead_id is blocked with 403 Forbidden',
    idorLeadDeleteRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorLeadDeleteRes.status} - ${idorLeadDeleteRes.body?.message}`
  );

  // Test 2.4: Customer Details IDOR Attack
  const idorCustDetailsRes = await makeRequest(PORT, 'GET', `/api/customers/${ssCustomer._id}/details`, dpAdminToken);
  assert(
    'IDOR: Customer Details',
    'DeliveryPlus Admin GET /api/customers/:ss_cust_id/details is blocked with 403 Forbidden',
    idorCustDetailsRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorCustDetailsRes.status} - ${idorCustDetailsRes.body?.message}`
  );

  // Test 2.5: Customer Modification IDOR Attack
  const idorCustUpdateRes = await makeRequest(PORT, 'PUT', `/api/customers/${ssCustomer._id}`, dpAdminToken, {
    name: 'HACKED CUSTOMER NAME'
  });
  assert(
    'IDOR: Customer Modification',
    'DeliveryPlus Admin PUT /api/customers/:ss_cust_id is blocked with 403 Forbidden',
    idorCustUpdateRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorCustUpdateRes.status} - ${idorCustUpdateRes.body?.message}`
  );

  // Test 2.6: Product Modification IDOR Attack
  const idorProductUpdateRes = await makeRequest(PORT, 'PUT', `/api/products/${dpProduct._id}`, ssAdminToken, {
    sellingPrice: 1
  });
  assert(
    'IDOR: Product Modification',
    'Shiv Shakti Admin PUT /api/products/:dp_prod_id is blocked with 403 Forbidden',
    idorProductUpdateRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorProductUpdateRes.status} - ${idorProductUpdateRes.body?.message}`
  );

  // Test 2.7: Invoice Fetch IDOR Attack
  const idorInvoiceRes = await makeRequest(PORT, 'GET', `/api/invoices/${ssInvoice._id}`, dpAdminToken);
  assert(
    'IDOR: Invoice View',
    'DeliveryPlus Admin GET /api/invoices/:ss_inv_id is blocked with 403 Forbidden',
    idorInvoiceRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorInvoiceRes.status} - ${idorInvoiceRes.body?.message}`
  );

  // Test 2.8: Employee Modification IDOR Attack
  const idorEmpUpdateRes = await makeRequest(PORT, 'PUT', `/api/employees/${ssEmployee._id}`, dpAdminToken, {
    salary: 999999
  });
  assert(
    'IDOR: Employee Modification',
    'DeliveryPlus Admin PUT /api/employees/:ss_emp_id is blocked with 403 Forbidden',
    idorEmpUpdateRes.status === 403,
    'HTTP 403 Forbidden',
    `HTTP ${idorEmpUpdateRes.status} - ${idorEmpUpdateRes.body?.message}`
  );

  // =========================================================================
  // TEST GROUP 3: SUPER ADMIN GLOBAL AUTHORITY
  // =========================================================================
  console.log('\n--- Group 3: Super Admin Global Authority ---');

  // Super Admin can list all organizations
  const saOrgsRes = await makeRequest(PORT, 'GET', '/api/superadmin/organizations', superAdminToken);
  assert(
    'SuperAdmin: Organizations',
    'Super Admin GET /api/superadmin/organizations returns all active client organizations',
    saOrgsRes.status === 200 && Array.isArray(saOrgsRes.body?.data) && saOrgsRes.body.data.length >= 2,
    'HTTP 200 with >= 2 organizations',
    `HTTP ${saOrgsRes.status}, total orgs: ${saOrgsRes.body?.data?.length}`
  );

  // Super Admin can access stats
  const saStatsRes = await makeRequest(PORT, 'GET', '/api/superadmin/stats', superAdminToken);
  assert(
    'SuperAdmin: Stats',
    'Super Admin GET /api/superadmin/stats returns real system telemetry and org metrics',
    saStatsRes.status === 200 && saStatsRes.body?.data?.totalOrganizations >= 2 && !!saStatsRes.body?.data?.memoryUsage,
    'HTTP 200 with memoryUsage & totalOrganizations',
    `HTTP ${saStatsRes.status}, orgs=${saStatsRes.body?.data?.totalOrganizations}, heapMB=${saStatsRes.body?.data?.memoryUsage?.heapUsedMB}`
  );

  // Super Admin can view customer from any tenant without 403
  const saCustRes = await makeRequest(PORT, 'GET', `/api/customers/${ssCustomer._id}/details`, superAdminToken);
  assert(
    'SuperAdmin: Global Access',
    'Super Admin can view Shiv Shakti customer details globally',
    saCustRes.status === 200 && (saCustRes.body?.data?.customer?._id === ssCustomer._id || saCustRes.body?.data?._id === ssCustomer._id),
    'HTTP 200 with customer details',
    `HTTP ${saCustRes.status}, custId=${saCustRes.body?.data?.customer?._id || saCustRes.body?.data?._id}`
  );

  // =========================================================================
  // TEST GROUP 4: TENANT-SCOPED ATTENDANCE & MULTI-BRANCH GEOFENCING
  // =========================================================================
  console.log('\n--- Group 4: Multi-Branch Geofencing & Attendance Verification ---');

  // Set up DeliveryPlus geofence (Sydney Office: -33.8688, 151.2093, radius: 200m)
  const dpBranch = {
    id: 'loc_sydney_hq',
    name: 'Sydney Central Office',
    latitude: -33.8688,
    longitude: 151.2093,
    radiusMeters: 200,
    address: 'George St, Sydney NSW 2000'
  };

  await makeRequest(PORT, 'POST', '/api/attendance-settings/locations', dpAdminToken, dpBranch);

  // Clock-in valid location (at Sydney office)
  const validClockInRes = await makeRequest(PORT, 'POST', '/api/attendance/clock-in', dpEmployeeToken, {
    employeeId: dpEmployee._id,
    location: {
      latitude: -33.86885, // 5 meters away
      longitude: 151.20932,
      accuracy: 5,
      address: 'George St, Sydney'
    },
    selfieImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'
  });

  assert(
    'Attendance: Valid Location',
    'DeliveryPlus employee clock-in within Sydney branch radius is ACCEPTED',
    (validClockInRes.status === 200 || validClockInRes.status === 201) && validClockInRes.body?.data?.status === 'PRESENT',
    'HTTP 200/201 with status=PRESENT',
    `HTTP ${validClockInRes.status}, message: ${validClockInRes.body?.message}`
  );

  // Clock-in invalid location (Melbourne coordinates when assigned to Sydney or out of radius: -37.8136, 144.9631)
  const invalidClockInRes = await makeRequest(PORT, 'POST', '/api/attendance/clock-in', dpEmployeeToken, {
    employeeId: dpEmployee._id,
    location: {
      latitude: -37.8136, // Melbourne (700km away)
      longitude: 144.9631,
      accuracy: 10,
      address: 'Melbourne VIC'
    },
    selfieImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'
  });

  assert(
    'Attendance: Geofence Rejection',
    'DeliveryPlus employee clock-in 700km away is REJECTED by Geofence Guard',
    (invalidClockInRes.status === 400 || invalidClockInRes.status === 403) && (invalidClockInRes.body?.message?.includes('radius') || invalidClockInRes.body?.message?.includes('outside')),
    'HTTP 403 Location outside allowed radius',
    `HTTP ${invalidClockInRes.status} - ${invalidClockInRes.body?.message}`
  );

  // =========================================================================
  // TEST GROUP 5: SUSPENDED ORGANIZATION BLOCKING
  // =========================================================================
  console.log('\n--- Group 5: Suspended Organization Access Blocking ---');

  // Create a temporary suspended org
  const suspendedOrgId = 'org_suspended_temp';
  db.organizations.insertOne({
    _id: suspendedOrgId,
    name: 'Suspended Logistics Co',
    slug: 'suspended-temp',
    clientCode: 'SUSP-01',
    status: 'SUSPENDED',
    branding: { companyName: 'Suspended Co' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  const suspUser = {
    _id: 'usr_test_susp_admin',
    name: 'Suspended Admin',
    email: 'admin_test@suspended.com',
    role: 'ADMIN' as const,
    roleId: 'role_admin',
    organizationId: suspendedOrgId,
    permissions: allPermissions,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.users.insertOne(suspUser as any);

  const suspendedToken = generateToken({
    userId: suspUser._id,
    email: suspUser.email,
    name: suspUser.name,
    role: suspUser.role,
    roleId: suspUser.roleId,
    permissions: suspUser.permissions,
    organizationId: suspendedOrgId
  });

  const suspReqRes = await makeRequest(PORT, 'GET', '/api/leads', suspendedToken);
  assert(
    'Tenant Lifecycle: Suspension',
    'User belonging to SUSPENDED organization is blocked from accessing API (403 Forbidden)',
    suspReqRes.status === 403 && (suspReqRes.body?.code === 'ORGANIZATION_SUSPENDED' || suspReqRes.body?.message?.includes('suspended')),
    'HTTP 403 Organization is currently suspended',
    `HTTP ${suspReqRes.status} - ${suspReqRes.body?.message}`
  );

  // =========================================================================
  // TEST GROUP 6: AUDIT TRAIL TENANT PARTITIONING
  // =========================================================================
  console.log('\n--- Group 6: Audit Trail Scoping ---');

  // Add an audit log for DeliveryPlus
  db.auditLogs.insertOne({
    _id: 'log_dp_01',
    organizationId: dpOrgId,
    action: 'CREATE',
    module: 'leads',
    entity: 'Lead',
    entityId: dpLead._id,
    userId: dpAdminUser._id,
    userName: dpAdminUser.name,
    userRole: 'ADMIN',
    timestamp: new Date().toISOString()
  } as any);

  const dpAuditRes = await makeRequest(PORT, 'GET', '/api/audit-logs', dpAdminToken);
  const dpLogs = dpAuditRes.body?.data?.logs || [];
  const dpLogsScoped = dpLogs.length > 0 && dpLogs.every((l: any) => l.organizationId === dpOrgId);
  assert(
    'Audit Logs: Tenant Scoping',
    'DeliveryPlus Admin GET /api/audit-logs only sees DeliveryPlus audit events',
    dpAuditRes.status === 200 && dpLogsScoped,
    'HTTP 200 with only org_deliveryplus logs',
    `HTTP ${dpAuditRes.status}, count: ${dpLogs.length}, scoped: ${dpLogsScoped}`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Assertions : ${total}`);
  console.log(`Passed           : ${passed} ✅`);
  console.log(`Failed           : ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Pass Rate        : ${((passed / total) * 100).toFixed(1)}%`);

  // Close test server
  server.close();

  if (failed > 0) {
    console.error('\n⚠️ SOME SECURITY / MULTI-TENANCY ASSERTIONS FAILED!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ENTERPRISE MULTI-TENANT & IDOR SECURITY TESTS PASSED PERFECTLY!');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('[Fatal Test Error]', err);
  process.exit(1);
});
