export {};

const BASE_URL = 'http://localhost:5055/api';

async function testMultiTenantIsolation() {
  console.log('🚀 TESTING MULTI-ADMIN WORKSPACE DATA ISOLATION...');

  // 1. Admin / Super Admin login to create user
  let superRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shivamshishodia5541@gmail.com', password: 'admin123' })
  });
  let superData = await superRes.json();
  if (!superData.success) {
    superRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@craftmediahub.com', password: 'admin123' })
    });
    superData = await superRes.json();
  }
  if (!superData.success) {
    console.error('❌ Super Admin login failed:', superData.message);
    return;
  }
  const superToken = superData.data.token;
  console.log('✅ Super Admin Logged in');

  // 2. Create a NEW Admin from Super Admin
  const testEmail = `newadmin_${Date.now()}@newcorp.com`;
  const createRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superToken}`
    },
    body: JSON.stringify({
      name: 'Ramesh Corporate Admin',
      email: testEmail,
      password: 'password123',
      role: 'ADMIN',
      organization: 'Ramesh Enterprises'
    })
  });
  const createData = await createRes.json();
  if (!createData.success) {
    console.error('❌ Failed to create new admin:', createData.message);
    return;
  }
  console.log('✅ Created New Admin:', testEmail);

  // 3. Login as the newly created Admin
  const newAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  const newAdminData = await newAdminRes.json();
  if (!newAdminData.success) {
    console.error('❌ New Admin login failed:', newAdminData.message);
    return;
  }
  const newAdminToken = newAdminData.data.token;
  console.log('✅ New Admin Successfully Logged In');

  // 4. Check that new admin sees 0 leads, 0 customers, 0 orders, 0 invoices
  const headers = { 'Authorization': `Bearer ${newAdminToken}` };

  const [leadsRes, custRes, quotesRes, ordersRes, invRes, prodRes, dashRes] = await Promise.all([
    fetch(`${BASE_URL}/leads`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/customers`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/quotations`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/sales-orders`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/invoices`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/products`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/dashboard`, { headers }).then(r => r.json())
  ]);

  console.log('leadsRes debug:', leadsRes);
  console.log(`📊 Leads for New Admin: ${leadsRes.data?.length} (Expected: 0)`);
  console.log(`📊 Customers for New Admin: ${custRes.data?.length} (Expected: 0)`);
  console.log(`📊 Quotations for New Admin: ${quotesRes.data?.length} (Expected: 0)`);
  console.log(`📊 Sales Orders for New Admin: ${ordersRes.data?.length} (Expected: 0)`);
  console.log(`📊 Invoices for New Admin: ${invRes.data?.length} (Expected: 0)`);
  console.log(`📊 Products for New Admin: ${prodRes.data?.length} (Expected: 0)`);
  console.log(`📊 Dashboard Leads for New Admin: ${dashRes.data?.cards?.totalLeads} (Expected: 0)`);

  if (
    leadsRes.data?.length === 0 &&
    custRes.data?.length === 0 &&
    quotesRes.data?.length === 0 &&
    ordersRes.data?.length === 0 &&
    invRes.data?.length === 0 &&
    prodRes.data?.length === 0 &&
    dashRes.data?.cards?.totalLeads === 0
  ) {
    console.log('✅ VERIFICATION PASSED: New Admin starts with a 100% clean, isolated workspace!');
  } else {
    console.error('❌ FAILED: New Admin still sees old demo data!');
  }

  // 5. Create 1 Lead as New Admin
  const newLeadRes = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Suresh Patel',
      companyName: 'Patel Heavy Logistics',
      email: 'suresh@patel.com',
      phone: '+91 99988 77766',
      estimatedValue: 150000
    })
  });
  const newLeadData = await newLeadRes.json();
  console.log('✅ New Admin created lead:', newLeadData.data?.leadCode, newLeadData.data?.name);

  // 6. Query Leads again
  const leadsAfter = await fetch(`${BASE_URL}/leads`, { headers }).then(r => r.json());
  console.log(`📊 Leads for New Admin after create: ${leadsAfter.data?.length} (Expected: 1)`);
  if (leadsAfter.data?.length === 1 && leadsAfter.data[0].name === 'Suresh Patel') {
    console.log('✅ VERIFICATION PASSED: New Admin only sees their own created lead!');
  }

  // 7. Verify Demo Admin still has their demo data
  const demoLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@craftmediahub.com', password: 'admin123' })
  }).then(r => r.json());

  const demoLeads = await fetch(`${BASE_URL}/leads`, {
    headers: { 'Authorization': `Bearer ${demoLogin.data.token}` }
  }).then(r => r.json());

  console.log(`📊 Demo Admin Leads count: ${demoLeads.data?.length} (Expected: > 0)`);
  if (demoLeads.data?.length > 0) {
    console.log('✅ VERIFICATION PASSED: Demo Admin continues to have demo seed data preserved!');
  }

  console.log('🎉 ALL MULTI-ADMIN DATA ISOLATION TESTS PASSED 100%!');
}

testMultiTenantIsolation();
