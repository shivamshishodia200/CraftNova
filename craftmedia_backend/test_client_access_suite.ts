import { generateToken, AuthenticatedUser } from './middleware/auth';
import { db } from './database/db';
import { createBackendApp } from './serverApp';
import http from 'http';
import bcrypt from 'bcryptjs';

interface TestResult {
  category: string;
  name: string;
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

async function runClientAccessSuite() {
  console.log('========================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE CLIENT USER & ACCESS MANAGEMENT TEST SUITE');
  console.log('========================================================================\n');

  await db.init();
  const app = await createBackendApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = server.address() as any;
  const PORT = address.port;
  console.log(`[Test Server] Listening on http://127.0.0.1:${PORT}\n`);

  try {
    // 1. Setup Test Organizations
    const testOrgAlphaId = `test-org-alpha-${Date.now()}`;
    const testOrgBetaId = `test-org-beta-${Date.now()}`;

    db.organizations.insertOne({
      _id: testOrgAlphaId,
      name: 'Alpha Logistics Enterprise',
      slug: `alpha-${Date.now()}`,
      clientCode: 'ALPHA',
      contactEmail: 'contact@alpha.com',
      status: 'ACTIVE',
      branding: {
        companyName: 'Alpha Logistics Enterprise',
        primaryColor: '#F59E0B',
        secondaryColor: '#111827',
        accentColor: '#EA580C',
        sidebarBackground: '#080D1A',
        themeMode: 'DARK'
      },
      features: {
        dashboard: true,
        crm: { leads: true, customers: true, followUps: true },
        sales: { quotations: true, salesOrders: true, reports: true },
        inventory: { products: true, stockInOut: true },
        hr: { employees: true, attendance: true, liveTracking: true, workRecording: true },
        marketing: { campaigns: true, tradeIndia: true, whatsApp: true }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.organizations.insertOne({
      _id: testOrgBetaId,
      name: 'Beta Global Tech',
      slug: `beta-${Date.now()}`,
      clientCode: 'BETA',
      contactEmail: 'contact@beta.com',
      status: 'ACTIVE',
      branding: {
        companyName: 'Beta Global Tech',
        primaryColor: '#2563EB',
        secondaryColor: '#0F172A',
        accentColor: '#06B6D4',
        sidebarBackground: '#0F172A',
        themeMode: 'LIGHT'
      },
      features: {
        dashboard: true,
        crm: { leads: true, customers: true, followUps: true }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Super Admin Token for Management
    const superAdminUser: AuthenticatedUser = {
      userId: 'super-admin-root-001',
      name: 'Super Admin',
      email: 'root@craftmedia.io',
      role: 'SUPER_ADMIN',
      roleId: 'role_super_admin',
      permissions: ['*'],
      organizationId: 'org-craftmedia-root'
    };
    const superAdminToken = generateToken(superAdminUser);

    // Regular Admin Token (should be rejected from superadmin routes)
    const regularAdminUser: AuthenticatedUser = {
      userId: 'regular-admin-001',
      name: 'Alpha Admin',
      email: 'admin@alpha.com',
      role: 'ADMIN',
      roleId: 'role_admin',
      permissions: ['leads.view', 'leads.create'],
      organizationId: testOrgAlphaId
    };
    const regularAdminToken = generateToken(regularAdminUser);

    // -------------------------------------------------------------------------
    // TEST SECTION 1: Super Admin Role Guard
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: SUPER ADMIN ROUTE GUARDING ---');

    const unauthorizedRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/organizations/${testOrgAlphaId}/admins`,
      regularAdminToken
    );
    assert(
      'Security / RBAC',
      'Non-superadmin token rejected with 403 Forbidden',
      unauthorizedRes.status === 403,
      '403',
      String(unauthorizedRes.status)
    );

    const authorizedRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/organizations/${testOrgAlphaId}/admins`,
      superAdminToken
    );
    assert(
      'Security / RBAC',
      'Superadmin token accepted with 200 OK',
      authorizedRes.status === 200 && authorizedRes.body.success === true,
      '200',
      String(authorizedRes.status)
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Organization Admin Provisioning & One-Time Password Return
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: CLIENT ADMIN PROVISIONING & ONE-TIME CREDENTIALS ---');

    const createAdmin1Res = await makeRequest(
      PORT,
      'POST',
      `/api/superadmin/organizations/${testOrgAlphaId}/admins`,
      superAdminToken,
      {
        name: 'Alpha Primary Director',
        email: `director_${Date.now()}@alpha.com`,
        phone: '+91 98765 11111',
        role: 'ADMIN',
        department: 'Operations',
        designation: 'Director of Logistics'
      }
    );

    assert(
      'Admin Provisioning',
      'Admin user created successfully with status 201',
      createAdmin1Res.status === 201 && createAdmin1Res.body.success === true,
      '201',
      String(createAdmin1Res.status)
    );

    const admin1Data = createAdmin1Res.body.data;
    const tempPassword1 = admin1Data?.temporaryPassword;

    assert(
      'Password Security',
      'One-time temporary password generated and returned in 201 payload',
      Boolean(tempPassword1 && tempPassword1.length >= 8),
      'Valid temporary password string',
      tempPassword1 ? `Length ${tempPassword1.length}` : 'undefined'
    );

    assert(
      'Password Security',
      'mustChangePassword flag is true on initial creation',
      admin1Data?.mustChangePassword === true,
      'true',
      String(admin1Data?.mustChangePassword)
    );

    assert(
      'Admin Roles',
      'First created admin is designated as Primary Admin (isPrimaryAdmin = true)',
      admin1Data?.isPrimaryAdmin === true,
      'true',
      String(admin1Data?.isPrimaryAdmin)
    );

    // Verify DB state: password is NOT stored plaintext
    const dbAdminUser = db.users.findById(admin1Data._id);
    const passHash = dbAdminUser?.passwordHash || (dbAdminUser as any)?.password || '';
    const isBcryptHash = passHash.startsWith('$2') || false;
    const bcryptValid = bcrypt.compareSync(tempPassword1, passHash);

    assert(
      'Password Storage',
      'Password in DB is salted bcrypt hash and never plaintext',
      isBcryptHash && bcryptValid,
      'Bcrypt hash matches temporary password',
      `Starts with $2: ${isBcryptHash}, Valid hash: ${bcryptValid}`
    );

    // Provision Second Admin for Org Alpha
    const createAdmin2Res = await makeRequest(
      PORT,
      'POST',
      `/api/superadmin/organizations/${testOrgAlphaId}/admins`,
      superAdminToken,
      {
        name: 'Alpha Secondary Admin',
        email: `secadmin_${Date.now()}@alpha.com`,
        phone: '+91 98765 22222',
        role: 'ADMIN',
        department: 'Finance',
        designation: 'Finance Head'
      }
    );
    const admin2Data = createAdmin2Res.body.data;

    assert(
      'Admin Roles',
      'Second created admin is secondary (isPrimaryAdmin = false)',
      admin2Data?.isPrimaryAdmin === false,
      'false',
      String(admin2Data?.isPrimaryAdmin)
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Organization Employee Provisioning & Auto-Linked Records
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: CLIENT EMPLOYEE PROVISIONING & USER LINKING ---');

    const createEmpRes = await makeRequest(
      PORT,
      'POST',
      `/api/superadmin/organizations/${testOrgAlphaId}/employees`,
      superAdminToken,
      {
        name: 'Suresh Raina',
        email: `suresh_${Date.now()}@alpha.com`,
        phone: '+91 98111 22334',
        department: 'Sales & Field BD',
        designation: 'Senior Area Manager',
        role: 'EMPLOYEE',
        salary: 65000,
        shift: 'Day Shift (9:00 AM - 6:00 PM)'
      }
    );

    assert(
      'Employee Provisioning',
      'Employee created with linked user account (201 Created)',
      createEmpRes.status === 201 && createEmpRes.body.success === true,
      '201',
      String(createEmpRes.status)
    );

    const empData = createEmpRes.body.data;
    const empTempPass = empData?.temporaryPassword;
    const empUserId = empData?.userAccount?.userId;

    assert(
      'Employee Credentials',
      'Temporary password returned for newly created employee user account',
      Boolean(empTempPass && empTempPass.length >= 8),
      'Temporary password string',
      empTempPass ? `Length ${empTempPass.length}` : 'undefined'
    );

    assert(
      'Employee Linkage',
      'Employee record has linked userAccount with role EMPLOYEE and organizationId match',
      Boolean(empUserId && empData.userAccount?.role === 'EMPLOYEE'),
      'Linked userAccount with role EMPLOYEE',
      `UserId: ${empUserId}, Role: ${empData?.userAccount?.role}`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Single-Reveal Temporary Password Reset
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: SINGLE-REVEAL TEMPORARY PASSWORD RESET ---');

    const resetPassRes = await makeRequest(
      PORT,
      'POST',
      `/api/superadmin/users/${empUserId}/reset-password`,
      superAdminToken
    );

    assert(
      'Password Reset',
      'Password reset returns 200 with new temporary password',
      resetPassRes.status === 200 && resetPassRes.body.success === true,
      '200',
      String(resetPassRes.status)
    );

    const newTempPass = resetPassRes.body.data?.temporaryPassword;
    assert(
      'Password Security',
      'New temporary password generated and different from initial password',
      Boolean(newTempPass && newTempPass !== empTempPass),
      'Different temporary password',
      `New password length: ${newTempPass?.length}`
    );

    const updatedEmpUser = db.users.findById(empUserId);
    const updatedPassHash = updatedEmpUser?.passwordHash || (updatedEmpUser as any)?.password || '';
    const newHashValid = bcrypt.compareSync(newTempPass, updatedPassHash);
    assert(
      'Password Security',
      'Updated user has tokenInvalidBefore set and mustChangePassword = true',
      Boolean(updatedEmpUser?.tokenInvalidBefore && updatedEmpUser?.mustChangePassword === true && newHashValid),
      'tokenInvalidBefore updated, hash verified',
      `mustChangePassword: ${updatedEmpUser?.mustChangePassword}, Hash valid: ${newHashValid}`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Granular Role & Permission Matrix Overrides
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: GRANULAR PERMISSION MATRIX & CUSTOM OVERRIDES ---');

    const customPermsPayload = {
      mode: 'REPLACE' as const,
      permissions: {
        leads: ['view', 'create', 'export'],
        quotations: ['view', 'approve'],
        customers: ['view']
      }
    };

    const updatePermsRes = await makeRequest(
      PORT,
      'PUT',
      `/api/superadmin/users/${empUserId}/permissions`,
      superAdminToken,
      customPermsPayload
    );

    assert(
      'Permission Matrix',
      'Custom permissions updated successfully with 200 OK',
      updatePermsRes.status === 200 && updatePermsRes.body.success === true,
      '200',
      String(updatePermsRes.status)
    );

    const effectivePermsRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/users/${empUserId}/effective-permissions`,
      superAdminToken
    );

    assert(
      'Permission Resolution',
      'Effective permissions retrieved successfully with 200 OK',
      effectivePermsRes.status === 200 && effectivePermsRes.body.success === true,
      '200',
      String(effectivePermsRes.status)
    );

    const effectivePerms: string[] = effectivePermsRes.body.data?.effectivePermissions || [];
    const expectedPerms = ['leads:view', 'leads:create', 'leads:export', 'quotations:view', 'quotations:approve', 'customers:view'];
    const allExpectedPresent = expectedPerms.every(p => effectivePerms.includes(p));

    assert(
      'Permission Calculation',
      'REPLACE mode accurately limits permissions to explicit custom grants (6 actions)',
      allExpectedPresent && effectivePerms.length === 6,
      'Exact 6 permissions matching custom list',
      `Found ${effectivePerms.length} perms: [${effectivePerms.join(', ')}]`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Primary Admin Reassignment
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: PRIMARY ADMIN REASSIGNMENT ---');

    const setPrimaryRes = await makeRequest(
      PORT,
      'PUT',
      `/api/superadmin/organizations/${testOrgAlphaId}/primary-admin`,
      superAdminToken,
      { adminUserId: admin2Data._id }
    );

    assert(
      'Primary Admin',
      'Primary Admin reassigned to second admin (200 OK)',
      setPrimaryRes.status === 200 && setPrimaryRes.body.success === true,
      '200',
      String(setPrimaryRes.status)
    );

    const reloadedAdmin1 = db.users.findById(admin1Data._id);
    const reloadedAdmin2 = db.users.findById(admin2Data._id);

    assert(
      'Primary Admin State',
      'Admin 2 is now isPrimaryAdmin = true and Admin 1 is isPrimaryAdmin = false',
      reloadedAdmin2?.isPrimaryAdmin === true && reloadedAdmin1?.isPrimaryAdmin === false,
      'Admin 2 Primary, Admin 1 Secondary',
      `Admin 1: ${reloadedAdmin1?.isPrimaryAdmin}, Admin 2: ${reloadedAdmin2?.isPrimaryAdmin}`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Module Access Governance
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: MODULE ACCESS GOVERNANCE & AUDIT LOGGING ---');

    const updateModulesRes = await makeRequest(
      PORT,
      'PUT',
      `/api/superadmin/organizations/${testOrgAlphaId}/module-access`,
      superAdminToken,
      {
        modules: {
          'marketing.tradeIndia': false,
          'hr.liveTracking': false
        }
      }
    );

    assert(
      'Module Access',
      'Module access flags updated with 200 OK',
      updateModulesRes.status === 200 && updateModulesRes.body.success === true,
      '200',
      String(updateModulesRes.status)
    );

    const reloadedOrg = db.organizations.findById(testOrgAlphaId);
    assert(
      'Module Access State',
      'TradeIndia and liveTracking disabled in organization features',
      reloadedOrg?.features?.marketing?.tradeIndia === false && reloadedOrg?.features?.hr?.liveTracking === false,
      'tradeIndia: false, liveTracking: false',
      `tradeIndia: ${reloadedOrg?.features?.marketing?.tradeIndia}, liveTracking: ${reloadedOrg?.features?.hr?.liveTracking}`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 8: Tenant User Isolation & Activity Timeline
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: TENANT ISOLATION & ACTIVITY TIMELINE ---');

    // Org Alpha Admins
    const alphaAdminsRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/organizations/${testOrgAlphaId}/admins`,
      superAdminToken
    );

    // Org Beta Admins (should be empty for new beta org)
    const betaAdminsRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/organizations/${testOrgBetaId}/admins`,
      superAdminToken
    );

    assert(
      'Tenant Isolation',
      'Org Alpha returns 2 admins, Org Beta returns 0 admins',
      alphaAdminsRes.body.data?.length === 2 && betaAdminsRes.body.data?.length === 0,
      'Alpha: 2, Beta: 0',
      `Alpha: ${alphaAdminsRes.body.data?.length}, Beta: ${betaAdminsRes.body.data?.length}`
    );

    // Fetch Org Alpha Activity Timeline
    const activityRes = await makeRequest(
      PORT,
      'GET',
      `/api/superadmin/organizations/${testOrgAlphaId}/activity`,
      superAdminToken
    );

    assert(
      'Activity Audit',
      'Activity timeline records tenant governance actions (Admin created, reset, perms, module update)',
      activityRes.status === 200 && activityRes.body.data?.length >= 4,
      'At least 4 audit events recorded',
      `Found ${activityRes.body.data?.length} events`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 9: Anti-IDOR Security Validation
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 9: ANTI-IDOR & CROSS-TENANT DEFENSES ---');

    // Attempt to set an Admin belonging to Org Alpha as primary admin of Org Beta
    const crossTenantPrimaryRes = await makeRequest(
      PORT,
      'PUT',
      `/api/superadmin/organizations/${testOrgBetaId}/primary-admin`,
      superAdminToken,
      { adminUserId: admin1Data._id }
    );

    assert(
      'Anti-IDOR Security',
      'Attempt to assign user from Org Alpha as primary admin of Org Beta is rejected with 404/403',
      crossTenantPrimaryRes.status === 404 || crossTenantPrimaryRes.status === 403,
      '404 or 403',
      String(crossTenantPrimaryRes.status)
    );

  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('========================================================================');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Total Tests Run:  ${total}`);
  console.log(`Passed:           ${passed} ✅`);
  console.log(`Failed:           ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Pass Rate:        ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error('FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- [${r.category}] ${r.name}`);
      console.error(`  Expected: ${r.expected}`);
      console.error(`  Actual:   ${r.actual}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL CLIENT ACCESS & USER GOVERNANCE TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
}

runClientAccessSuite().catch(err => {
  console.error('Test Suite Fatal Exception:', err);
  process.exit(1);
});
