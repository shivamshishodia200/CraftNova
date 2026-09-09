export {};

const BASE_URL = 'http://localhost:5055/api';


const log = (step: string, msg: string) => {
  console.log(`\n======================================================`);
  console.log(`[TEST] ${step.toUpperCase()}: ${msg}`);
  console.log(`======================================================`);
};

const assert = (condition: boolean, msg: string) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✅ Passed: ${msg}`);
};

async function req(url: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function runMultiTenantVerification() {
  console.log('\n🚀 STARTING COMPREHENSIVE MULTI-TENANT & WHITE-LABEL TEST SUITE\n');

  // =========================================================================
  // 1. SUPER ADMIN AUTHENTICATION
  // =========================================================================
  log('Step 1', 'Authenticating Super Admin and checking global scope');
  const superAdminLogin = await req('/auth/login', {
    method: 'POST',
    body: {
      email: 'shivamshishodia5541@gmail.com',
      password: 'shivamshishodia5541@gmail.com'
    }
  });


  assert(superAdminLogin.status === 200, 'Super Admin login succeeded with 200');
  assert(superAdminLogin.data.success === true, 'Response marked success');
  const superAdminToken = superAdminLogin.data.data.token;
  const superAdminUser = superAdminLogin.data.data.user;

  assert(superAdminUser.role === 'SUPER_ADMIN', 'User has SUPER_ADMIN role');
  assert(
    superAdminUser.organizationId === null || superAdminUser.organizationId === undefined,
    'Super Admin has global organizationId (null)'
  );

  const saBootstrap = await req('/app/bootstrap', { token: superAdminToken });
  assert(saBootstrap.status === 200, 'Super Admin /app/bootstrap succeeded');
  assert(saBootstrap.data.data.isSuperAdmin === true, 'Bootstrap reports isSuperAdmin: true');

  // =========================================================================
  // 2. CLIENT ORGANIZATIONS CREATION / CONFIGURATION
  // =========================================================================
  log('Step 2', 'Configuring Client Organizations (Craft Media Hub & DeliveryPlus)');

  const orgsListRes = await req('/superadmin/organizations', { token: superAdminToken });
  assert(orgsListRes.status === 200, 'Fetched organizations list');
  const orgs = orgsListRes.data.data;
  console.log(`  ℹ Found ${orgs.length} existing organizations`);

  // 2a. Ensure Craft Media Hub (Org A)
  let orgCraft = orgs.find((o: any) => o.slug === 'craft-media-hub' || o.clientCode === 'CMH');
  if (!orgCraft) {
    const createOrgRes = await req('/superadmin/organizations', {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Craft Media Hub',
        clientCode: 'CMH',
        slug: 'craft-media-hub',
        contactEmail: 'admin@craftmediahub.com',
        branding: {
          companyName: 'Craft Media Hub Enterprise',
          primaryColor: '#F59E0B',
          secondaryColor: '#111827',
          accentColor: '#EA580C',
          sidebarBackground: '#080D1A',
          headerBackground: '#FFFFFF',
          loginTitle: 'Craft Media Hub Workspace',
          themeMode: 'LIGHT'
        },
        features: {
          dashboard: true,
          crm: { leads: true, customers: true, followUps: true },
          hr: { employees: true, attendance: true, workRecording: true }
        }
      }
    });
    assert(createOrgRes.status === 201 || createOrgRes.status === 200, 'Created Craft Media Hub organization');
    orgCraft = createOrgRes.data.data.organization;
  }
  assert(Boolean(orgCraft), 'Org Craft Media Hub is ready');

  // 2b. Ensure DeliveryPlus (Org B) with workRecording = FALSE
  let orgDeliv = orgs.find((o: any) => o.slug === 'deliveryplus' || o.clientCode === 'DELIV');
  if (!orgDeliv) {
    const createDelivRes = await req('/superadmin/organizations', {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'DeliveryPlus Logistics',
        clientCode: 'DELIV',
        slug: 'deliveryplus',
        contactEmail: 'admin@deliveryplus.com',
        branding: {
          companyName: 'DeliveryPlus Global CRM',
          primaryColor: '#2563EB',
          secondaryColor: '#0F172A',
          accentColor: '#06B6D4',
          sidebarBackground: '#0F172A',
          headerBackground: '#F8FAFC',
          loginTitle: 'DeliveryPlus Portal Sign-In',
          themeMode: 'LIGHT'
        },
        features: {
          dashboard: true,
          crm: { leads: true, customers: true, followUps: true },
          hr: { employees: true, attendance: true, workRecording: false } // WORK RECORDING DISABLED
        },
        initialAdmin: {
          name: 'DeliveryPlus Admin',
          email: 'admin@deliveryplus.com',
          password: 'deliveryPassword123'
        }
      }
    });
    assert(createDelivRes.status === 201 || createDelivRes.status === 200, 'Created DeliveryPlus organization');
    orgDeliv = createDelivRes.data.data.organization;
  }
  assert(Boolean(orgDeliv), 'Org DeliveryPlus is ready');

  // =========================================================================
  // 3. PUBLIC WHITE-LABEL BRANDING ENDPOINTS
  // =========================================================================
  log('Step 3', 'Testing Public White-Label Branding Endpoints');
  const craftBranding = await req(`/public/branding/${orgCraft.slug}`);
  assert(craftBranding.status === 200, 'Public branding for craftmedia returned 200');
  assert(craftBranding.data.data.branding.primaryColor === '#F59E0B', 'Craft Media Hub primary color is #F59E0B');

  const delivBranding = await req(`/public/branding/${orgDeliv.slug}`);
  assert(delivBranding.status === 200, 'Public branding for deliveryplus returned 200');
  assert(delivBranding.data.data.branding.primaryColor === '#2563EB', 'DeliveryPlus primary color is #2563EB');
  assert(delivBranding.data.data.branding.companyName === 'DeliveryPlus Global CRM', 'DeliveryPlus custom company name matches');

  // =========================================================================
  // 4. CLIENT ADMIN AUTHENTICATION & BOOTSTRAP
  // =========================================================================
  log('Step 4', 'Logging in Client Admins and verifying tenant branding inheritance');

  // Admin Craft Media
  const adminCraftLogin = await req('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@craftmediahub.com',
      password: 'admin123'
    }
  });
  assert(adminCraftLogin.status === 200, 'Admin Craft Media login succeeded');
  const tokenCraft = adminCraftLogin.data.data.token;

  const craftBootstrap = await req('/app/bootstrap', { token: tokenCraft });
  assert(craftBootstrap.status === 200, 'Craft Admin /app/bootstrap succeeded');
  assert(craftBootstrap.data.data.organization.slug === orgCraft.slug, 'Craft Admin belongs to craftmedia');
  assert(craftBootstrap.data.data.features.hr.workRecording === true, 'Craft Admin has workRecording enabled');


  // Admin DeliveryPlus
  const adminDelivLogin = await req('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@deliveryplus.com',
      password: 'deliveryPassword123'
    }
  });
  assert(adminDelivLogin.status === 200, 'Admin DeliveryPlus login succeeded');
  const tokenDeliv = adminDelivLogin.data.data.token;

  const delivBootstrap = await req('/app/bootstrap', { token: tokenDeliv });
  assert(delivBootstrap.status === 200, 'DeliveryPlus Admin /app/bootstrap succeeded');
  assert(delivBootstrap.data.data.organization.slug === 'deliveryplus', 'DeliveryPlus Admin belongs to deliveryplus');
  assert(delivBootstrap.data.data.features.hr.workRecording === false, 'DeliveryPlus Admin has workRecording DISABLED');

  // =========================================================================
  // 5. AUTOMATIC INHERITANCE ON EMPLOYEE CREATION
  // =========================================================================
  log('Step 5', 'Testing Automatic Employee Organization Inheritance (No Org Picker)');

  const testStamp = Date.now();
  // Craft Admin creates Employee (NO organizationId provided in body)
  const craftEmpRes = await req('/employees', {
    method: 'POST',
    token: tokenCraft,
    body: {
      name: `Craft Specialist ${testStamp}`,
      email: `emp_craft_${testStamp}@craftmedia.com`,
      phone: '9876500001',
      department: 'Sales',
      designation: 'Sales Executive',
      salary: 50000,
      status: 'ACTIVE'
    }
  });
  assert(craftEmpRes.status === 201 || craftEmpRes.status === 200, 'Craft Admin successfully created Employee');
  const craftEmp = craftEmpRes.data.data;
  assert(
    craftEmp.organizationId === orgCraft._id || craftEmp.organizationId === orgCraft.id,
    'Employee automatically inherited Craft Media organizationId'
  );

  // DeliveryPlus Admin creates Employee (NO organizationId provided in body)
  const delivEmpRes = await req('/employees', {
    method: 'POST',
    token: tokenDeliv,
    body: {
      name: `Delivery Fleet Driver ${testStamp}`,
      email: `emp_deliv_${testStamp}@deliveryplus.com`,
      phone: '9876500002',
      department: 'Operations',
      designation: 'Route Specialist',
      salary: 42000,
      status: 'ACTIVE'
    }
  });
  assert(delivEmpRes.status === 201 || delivEmpRes.status === 200, 'DeliveryPlus Admin successfully created Employee');
  const delivEmp = delivEmpRes.data.data;
  assert(
    delivEmp.organizationId === orgDeliv._id || delivEmp.organizationId === orgDeliv.id,
    'Employee automatically inherited DeliveryPlus organizationId'
  );

  // =========================================================================
  // 6. STRICT DATA ISOLATION VERIFICATION
  // =========================================================================
  log('Step 6', 'Verifying Strict Cross-Tenant Data Isolation');

  // Create Leads in both organizations
  const leadCraftRes = await req('/leads', {
    method: 'POST',
    token: tokenCraft,
    body: {
      name: `Craft Lead ${testStamp}`,
      email: `lead_craft_${testStamp}@test.com`,
      phone: '9900112233',
      source: 'Website',
      estimatedValue: 150000,
      status: 'NEW'
    }
  });
  assert(leadCraftRes.status === 201 || leadCraftRes.status === 200, 'Craft Lead created');
  const leadCraft = leadCraftRes.data.data;

  const leadDelivRes = await req('/leads', {
    method: 'POST',
    token: tokenDeliv,
    body: {
      name: `Delivery Lead ${testStamp}`,
      email: `lead_deliv_${testStamp}@test.com`,
      phone: '9900112244',
      source: 'TradeIndia',
      estimatedValue: 85000,
      status: 'NEW'
    }
  });
  assert(leadDelivRes.status === 201 || leadDelivRes.status === 200, 'Delivery Lead created');
  const leadDeliv = leadDelivRes.data.data;

  // Query Leads as Craft Admin
  const craftLeadsRes = await req('/leads', { token: tokenCraft });
  const craftLeads = craftLeadsRes.data.data;
  const hasCraftLeadInCraft = craftLeads.some((l: any) => l.email === leadCraft.email);
  const hasDelivLeadInCraft = craftLeads.some((l: any) => l.email === leadDeliv.email);
  assert(hasCraftLeadInCraft === true, 'Craft Admin can see their own lead');
  assert(hasDelivLeadInCraft === false, 'CRITICAL: Craft Admin CANNOT see DeliveryPlus lead!');

  // Query Leads as DeliveryPlus Admin
  const delivLeadsRes = await req('/leads', { token: tokenDeliv });
  const delivLeads = delivLeadsRes.data.data;
  const hasDelivLeadInDeliv = delivLeads.some((l: any) => l.email === leadDeliv.email);
  const hasCraftLeadInDeliv = delivLeads.some((l: any) => l.email === leadCraft.email);
  assert(hasDelivLeadInDeliv === true, 'DeliveryPlus Admin can see their own lead');
  assert(hasCraftLeadInDeliv === false, 'CRITICAL: DeliveryPlus Admin CANNOT see Craft Media Hub lead!');

  // Cross-tenant direct resource access by ID
  const crossAccessRes = await req(`/employees/${delivEmp._id || delivEmp.id}`, { token: tokenCraft });
  assert(
    crossAccessRes.status === 404 || crossAccessRes.status === 403,
    'Craft Admin accessing DeliveryPlus Employee ID correctly rejected (404/403)'
  );

  // =========================================================================
  // 7. CLIENT-SUPPLIED ORGANIZATIONID TAMPER RESISTANCE
  // =========================================================================
  log('Step 7', 'Testing Client-Supplied organizationId Tamper Resistance');

  // Malicious attempt: Craft Admin tries to inject organizationId: orgDeliv._id
  const tamperRes = await req('/leads', {
    method: 'POST',
    token: tokenCraft,
    body: {
      name: `Tamper Attempt ${testStamp}`,
      email: `tamper_${testStamp}@test.com`,
      phone: '9900998877',
      source: 'Website',
      estimatedValue: 100000,
      status: 'NEW',
      organizationId: orgDeliv._id || orgDeliv.id // MALICIOUS INJECTION
    }
  });
  assert(tamperRes.status === 201 || tamperRes.status === 200, 'Lead created');
  const tamperedLead = tamperRes.data.data;
  assert(
    tamperedLead.organizationId === (orgCraft._id || orgCraft.id),
    'CRITICAL: Malicious client organizationId was ignored and replaced with authenticated token organizationId!'
  );

  // =========================================================================
  // 8. FEATURE GUARD ENFORCEMENT
  // =========================================================================
  log('Step 8', 'Testing Backend Feature Guard (workRecording disabled for DeliveryPlus)');

  // Craft Admin (workRecording enabled) accessing /hr/work-sessions
  const craftWorkRes = await req('/hr/work-sessions', { token: tokenCraft });
  console.log('  ℹ craftWorkRes:', craftWorkRes.status, craftWorkRes.data);
  assert(craftWorkRes.status === 200, 'Craft Admin can access work sessions (feature enabled)');


  // DeliveryPlus Admin (workRecording disabled) accessing /hr/work-sessions
  const delivWorkRes = await req('/hr/work-sessions', { token: tokenDeliv });
  console.log('  ℹ delivWorkRes:', delivWorkRes.status, delivWorkRes.data);
  assert(
    delivWorkRes.status === 403 && (delivWorkRes.data?.code === 'FEATURE_DISABLED' || delivWorkRes.data?.code === 'FEATURE_NOT_PERMITTED_FOR_ORGANIZATION'),
    'DeliveryPlus access to work-sessions correctly blocked with 403 FEATURE_DISABLED'
  );



  // =========================================================================
  // 9. CLIENT SUSPENSION ENFORCEMENT
  // =========================================================================
  log('Step 9', 'Testing Organization Suspension (Instant Lockout)');

  // Super Admin suspends DeliveryPlus
  const suspendRes = await req(`/superadmin/organizations/${orgDeliv._id || orgDeliv.id}/status`, {
    method: 'PUT',
    token: superAdminToken,
    body: { status: 'SUSPENDED' }
  });
  assert(suspendRes.status === 200, 'Super Admin suspended DeliveryPlus organization');

  // DeliveryPlus Admin attempts API call -> must get 403 ORGANIZATION_SUSPENDED
  const suspendedCall = await req('/leads', { token: tokenDeliv });
  assert(
    suspendedCall.status === 403 && suspendedCall.data?.code === 'ORGANIZATION_SUSPENDED',
    'Suspended client request instantly rejected with 403 ORGANIZATION_SUSPENDED'
  );

  // Super Admin reactivates DeliveryPlus
  const reactivateRes = await req(`/superadmin/organizations/${orgDeliv._id || orgDeliv.id}/status`, {
    method: 'PUT',
    token: superAdminToken,
    body: { status: 'ACTIVE' }
  });
  assert(reactivateRes.status === 200, 'Super Admin reactivated DeliveryPlus organization');

  // DeliveryPlus Admin attempts API call -> should succeed again
  const reactivatedCall = await req('/leads', { token: tokenDeliv });
  assert(reactivatedCall.status === 200, 'Reactivated client can resume normal operations');

  console.log('\n======================================================');
  console.log('🎉 ALL 9 MULTI-TENANT VERIFICATION SUITES PASSED FLAWLESSLY!');
  console.log('======================================================\n');
}

runMultiTenantVerification().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
