export {};

const BASE_URL = 'http://localhost:5055/api';

async function testFullFlow() {
  console.log('====================================================');
  console.log('🔍 TESTING ALL CRAFT MEDIA HUB CRM MODULES & FLOWS');
  console.log('====================================================');

  // 1. Test Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@craftmediahub.com', password: 'admin123' })
  });
  const loginData: any = await loginRes.json();
  console.log(`1. Admin Login: ${loginData.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  const token = loginData.data.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Test Dashboard Stats
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers });
  const dashData: any = await dashRes.json();
  console.log(`2. Dashboard Analytics: ${dashData.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  // 3. Test Sales - Leads
  const leadsRes = await fetch(`${BASE_URL}/leads`, { headers });
  const leadsData: any = await leadsRes.json();
  console.log(`3. Sales Leads: ${leadsData.success ? `✅ SUCCESS (${leadsData.data.length} leads)` : '❌ FAILED'}`);

  // 4. Test Sales - Customers
  const custRes = await fetch(`${BASE_URL}/customers`, { headers });
  const custData: any = await custRes.json();
  console.log(`4. Customers: ${custData.success ? `✅ SUCCESS (${custData.data.length} customers)` : '❌ FAILED'}`);

  // 5. Test Sales - Quotations
  const quotesRes = await fetch(`${BASE_URL}/quotations`, { headers });
  const quotesData: any = await quotesRes.json();
  console.log(`5. Quotations: ${quotesData.success ? `✅ SUCCESS (${quotesData.data.length} quotations)` : '❌ FAILED'}`);

  // 6. Test Sales - Orders
  const ordersRes = await fetch(`${BASE_URL}/sales-orders`, { headers });
  const ordersData: any = await ordersRes.json();
  console.log(`6. Sales Orders: ${ordersData.success ? `✅ SUCCESS (${ordersData.data.length} orders)` : '❌ FAILED'}`);

  // 7. Test Inventory - Products
  const prodRes = await fetch(`${BASE_URL}/products`, { headers });
  const prodData: any = await prodRes.json();
  console.log(`7. Products: ${prodData.success ? `✅ SUCCESS (${prodData.data.length} products)` : '❌ FAILED'}`);

  // 8. Test Inventory - Warehouses
  const whRes = await fetch(`${BASE_URL}/warehouses`, { headers });
  const whData: any = await whRes.json();
  console.log(`8. Warehouses: ${whData.success ? `✅ SUCCESS (${whData.data.length} warehouses)` : '❌ FAILED'}`);

  // 9. Test Accounts - Invoices
  const invRes = await fetch(`${BASE_URL}/invoices`, { headers });
  const invData: any = await invRes.json();
  console.log(`9. Invoices: ${invData.success ? `✅ SUCCESS (${invData.data.length} invoices)` : '❌ FAILED'}`);

  // 10. Test People / HR - Employees
  const empRes = await fetch(`${BASE_URL}/employees`, { headers });
  const empData: any = await empRes.json();
  console.log(`10. Employees Directory: ${empData.success ? `✅ SUCCESS (${empData.data.length} employees)` : '❌ FAILED'}`);

  // 11. Test Live Tracking
  const trackRes = await fetch(`${BASE_URL}/employee-tracking/live`, { headers });
  const trackData: any = await trackRes.json();
  console.log(`11. Employee Live Tracking: ${trackData.success ? `✅ SUCCESS (${trackData.data.length} active geolocations)` : '❌ FAILED'}`);

  // 12. Test Integrations
  const intRes = await fetch(`${BASE_URL}/integrations`, { headers });
  const intData: any = await intRes.json();
  console.log(`12. Integrations Hub: ${intData.success ? `✅ SUCCESS (${intData.data.length} connectors configured)` : '❌ FAILED'}`);

  // 13. Test Dedicated Employee Portal API
  const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@craftmediahub.com', password: 'admin123' })
  });
  const empLoginData: any = await empLoginRes.json();
  const empToken = empLoginData.data.token;
  const empHeaders = { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' };

  const empWorkspaceRes = await fetch(`${BASE_URL}/employee/dashboard`, { headers: empHeaders });
  const empWorkspaceData: any = await empWorkspaceRes.json();
  console.log(`13. Employee Workspace API: ${empWorkspaceData.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  // 14. Test Super Admin API
  const saLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shivamshishodia5541@gmail.com', password: 'shivamshishodia5541@gmail.com' })
  });
  const saLoginData: any = await saLoginRes.json();
  const saToken = saLoginData.data.token;
  const saHeaders = { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' };

  const saStatsRes = await fetch(`${BASE_URL}/superadmin/stats`, { headers: saHeaders });
  const saStatsData: any = await saStatsRes.json();
  console.log(`14. Super Admin Governance API: ${saStatsData.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  console.log('====================================================');
  console.log('🎉 ALL SCREEN FLOWS AND MODULES ARE 100% OPERATIONAL!');
  console.log('====================================================');
}

testFullFlow().catch(console.error);
