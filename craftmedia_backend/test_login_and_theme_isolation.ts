export {};
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5055/api';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path: string, options: { method?: string; body?: any; headers?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ suite, name, status: 'PASSED' });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    results.push({ suite, name, status: 'FAILED', details: errorMsg });
    console.error(`  [FAIL] ${name}: ${errorMsg}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('  360CRM ENTERPRISE: MULTI-TENANT LOGIN & THEME ISOLATION SUITE');
  console.log('================================================================\n');

  let superAdminToken = '';

  // SUITE 1: Public Branding Endpoint & Security
  console.log('--- 1. Public Organization Branding Endpoint & Security ---');

  await runTest('Public Branding', 'Fetches safe public branding for valid slug', async () => {
    const res = await request('/public/organization-branding/craft-media-hub');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'Response success should be true');
    assert(!!res.data?.data?.branding, 'Should return branding object');
    assert(!!res.data?.data?.branding?.primaryColor, 'Should return primaryColor');
    assert(typeof res.data?.data?.brandingVersion === 'number', 'Should return brandingVersion');
    // Verify zero data leaks
    assert(!res.data?.data?.password, 'Should not leak password');
    assert(!res.data?.data?.initialAdmin, 'Should not leak initialAdmin credentials');
  });

  await runTest('Public Branding', 'Returns 404 for unknown organization slug', async () => {
    const res = await request('/public/organization-branding/non-existent-organization-xyz');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // SUITE 2: Super Admin Dedicated Login Endpoint
  console.log('\n--- 2. Super Admin Dedicated Login & Role Enforcement ---');

  await runTest('Super Admin Login', 'Allows valid Super Admin credentials', async () => {
    const res = await request('/auth/super-admin/login', {
      method: 'POST',
      body: {
        email: 'shivamshishodia5541@gmail.com',
        password: 'shivamshishodia5541@gmail.com'
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'Success should be true');
    assert(res.data?.data?.user?.role === 'SUPER_ADMIN', 'User role must be SUPER_ADMIN');
    assert(res.data?.data?.portal === 'SUPER_ADMIN', 'Portal must be SUPER_ADMIN');
    assert(!!res.data?.data?.token, 'Token should be returned');
    superAdminToken = res.data?.data?.token;
  });

  await runTest('Super Admin Login', 'Rejects Client Admin attempting Super Admin login (ROLE_MISMATCH)', async () => {
    const res = await request('/auth/super-admin/login', {
      method: 'POST',
      body: {
        email: 'admin@craftmediahub.com',
        password: 'admin123'
      }
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(
      res.data?.code === 'ROLE_MISMATCH' || res.data?.message?.includes('Super Administrator'),
      `Expected ROLE_MISMATCH, got ${JSON.stringify(res.data)}`
    );
  });

  // Provision second tenant organization (DeliveryPlus) for cross-tenant isolation testing
  console.log('\n--- Provisioning Secondary Tenant Organization for Isolation ---');
  let deliveryPlusOrgId = '';
  await runTest('Tenant Setup', 'Provision DeliveryPlus client organization', async () => {
    // Check if deliveryplus already exists
    const listRes = await request('/superadmin/organizations', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const existing = (listRes.data?.data || []).find((o: any) => o.slug === 'deliveryplus');
    if (existing) {
      deliveryPlusOrgId = existing._id || existing.id;
      console.log('    (DeliveryPlus organization already exists)');
      return;
    }

    const createRes = await request('/superadmin/organizations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        name: 'DeliveryPlus Logistics',
        clientCode: 'DLP',
        slug: 'deliveryplus',
        contactEmail: 'admin@deliveryplus.com',
        branding: {
          companyName: 'DeliveryPlus Logistics',
          primaryColor: '#0284C7',
          secondaryColor: '#0F172A',
          sidebarBackground: '#020617',
          themeMode: 'LIGHT'
        },
        features: { dashboard: true, crm: { leads: true, customers: true, followUps: true } },
        initialAdmin: {
          name: 'DeliveryPlus Admin',
          email: 'admin@deliveryplus.com',
          password: 'password123'
        }
      }
    });
    assert(createRes.status === 201 || createRes.status === 200, `Expected 201/200, got ${createRes.status}`);
    deliveryPlusOrgId = createRes.data?.data?._id || createRes.data?.data?.id;
  });

  // SUITE 3: Client Admin Login & Cross-Tenant Boundary Rejection
  console.log('\n--- 3. Client Admin Login & Tenant Boundary Isolation ---');

  await runTest('Admin Login', 'Allows Client Admin with matching organization slug', async () => {
    const res = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@craftmediahub.com',
        password: 'admin123',
        organizationSlug: 'craft-media-hub'
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'Success should be true');
    assert(res.data?.data?.user?.role === 'ADMIN', 'User role must be ADMIN');
    assert(res.data?.data?.portal === 'ADMIN', 'Portal must be ADMIN');
    assert(!!res.data?.data?.organization, 'Organization should be returned');
  });

  await runTest('Admin Login', 'Blocks Admin from foreign organization slug (ORGANIZATION_MISMATCH)', async () => {
    const res = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@craftmediahub.com',
        password: 'admin123',
        organizationSlug: 'deliveryplus' // Foreign organization slug
      }
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    assert(
      res.data?.code === 'ORGANIZATION_MISMATCH',
      `Expected code ORGANIZATION_MISMATCH, got ${res.data?.code}`
    );
  });

  // SUITE 4: Employee Login & Cross-Tenant Boundary Rejection
  console.log('\n--- 4. Employee Dedicated Login & Tenant Boundary Isolation ---');

  await runTest('Employee Login', 'Allows Employee with matching organization slug', async () => {
    const res = await request('/auth/employee/login', {
      method: 'POST',
      body: {
        identifier: 'hr@craftmediahub.com',
        password: 'admin123',
        organizationSlug: 'craft-media-hub'
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'Success should be true');
    assert(res.data?.data?.portal === 'EMPLOYEE', 'Portal must be EMPLOYEE');
    assert(!!res.data?.data?.employee, 'Employee profile must be attached');
  });

  await runTest('Employee Login', 'Blocks Employee from foreign organization slug (ORGANIZATION_MISMATCH)', async () => {
    const res = await request('/auth/employee/login', {
      method: 'POST',
      body: {
        identifier: 'hr@craftmediahub.com',
        password: 'admin123',
        organizationSlug: 'deliveryplus' // Foreign organization slug
      }
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    assert(
      res.data?.code === 'ORGANIZATION_MISMATCH',
      `Expected code ORGANIZATION_MISMATCH, got ${res.data?.code}`
    );
  });

  await runTest('Employee Login', 'Allows login via Employee ID code as well as email', async () => {
    const res = await request('/auth/employee/login', {
      method: 'POST',
      body: {
        identifier: 'EMP-0104',
        password: 'admin123',
        organizationSlug: 'craft-media-hub'
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'Success should be true');
  });

  // SUITE 5: Theme Versioning & Dynamic Cache Invalidation
  console.log('\n--- 5. Theme Versioning & Cache Invalidation ---');

  await runTest('Theme Versioning', 'Increments brandingVersion on organization branding update', async () => {
    const getInitial = await request('/public/organization-branding/craft-media-hub');
    const initialVersion = getInitial.data?.data?.brandingVersion || 1;

    const updateRes = await request('/superadmin/organizations/org_craftmedia', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        branding: {
          companyName: 'Craft Media Hub',
          primaryColor: '#F59E0B',
          secondaryColor: '#111827',
          accentColor: '#EA580C',
          sidebarBackground: '#080D1A',
          themeMode: 'LIGHT'
        }
      }
    });
    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);

    const getUpdated = await request('/public/organization-branding/craft-media-hub');
    const updatedVersion = getUpdated.data?.data?.brandingVersion;
    assert(updatedVersion > initialVersion, `Expected updated version (${updatedVersion}) > initial (${initialVersion})`);
  });

  // SUMMARY REPORT
  console.log('\n================================================================');
  console.log('                     TEST EXECUTION SUMMARY                     ');
  console.log('================================================================');
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.error(` - [${r.suite}] ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll Multi-Tenant Login and Isolation Tests Passed Successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
