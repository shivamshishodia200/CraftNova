import bcrypt from 'bcryptjs';
import {
  UserDoc, RoleDoc, LeadDoc, CustomerDoc, ProductDoc, CategoryDoc,
  WarehouseDoc, SupplierDoc, PurchaseDoc, QuotationDoc, SalesOrderDoc,
  InvoiceDoc, PaymentDoc, ExpenseDoc, EmployeeDoc, AttendanceDoc,
  SalaryDoc, PerformanceDoc, CampaignDoc, LeadSourceDoc, IntegrationDoc, IntegrationLogDoc,
  AuditLogDoc, FollowUpDoc, StockTransactionDoc, CreditNoteDoc, CallLogDoc,
  LeaveDoc, TaskDoc, MessageDoc, ActivityTimelineDoc, NotificationDoc, AttendanceSettingsDoc,
  ActivitySessionDoc, DeviceDoc,
  LatestLocationDoc, LocationHistoryDoc, GeofenceDoc, GeofenceEventDoc, TrackingPolicyDoc,
  DailyTrackingSummaryDoc, TrackingAlertDoc
} from './types';
import { ALL_PERMISSIONS } from './permissionsList';

export async function getSeedData() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const superAdminHash = await bcrypt.hash('shivamshishodia5541@gmail.com', 10);

  const allPermCodes = ALL_PERMISSIONS.map(p => p.code);

  const employeePerms = [
    'attendance.clockin',
    'attendance.clockout',
    'attendance.view',
    'leads.view',
    'leads.update',
    'customers.view',
    'follow_ups.view',
    'follow_ups.create',
    'follow_ups.update',
    'calls.view',
    'calls.create',
    'messages.view',
    'messages.create',
    'tasks.view',
    'tasks.update',
    'quotations.view',
    'quotations.create',
    'sales_orders.view',
    'performance.view.self',
    'leave.view.self',
    'leave.create',
    'salary.view.self',
    'profile.view.self',
    'profile.update.self',
    'notifications.view'
  ];

  const salesPerms = ALL_PERMISSIONS.filter(p =>
    ['Dashboard', 'Sales', 'Marketing'].includes(p.category) ||
    ['products.view', 'inventory.view', 'reports.view'].includes(p.code)
  ).map(p => p.code);

  const storePerms = ALL_PERMISSIONS.filter(p =>
    ['Dashboard', 'Inventory'].includes(p.category) ||
    ['reports.view'].includes(p.code)
  ).map(p => p.code);

  const accountsPerms = ALL_PERMISSIONS.filter(p =>
    ['Dashboard', 'Accounts'].includes(p.category) ||
    ['customers.view', 'suppliers.view', 'invoices.view', 'reports.view'].includes(p.code)
  ).map(p => p.code);

  const hrPerms = ALL_PERMISSIONS.filter(p =>
    ['Dashboard', 'People'].includes(p.category) ||
    ['reports.view'].includes(p.code)
  ).map(p => p.code);

  const roles: RoleDoc[] = [
    {
      _id: 'role_super_admin',
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Unrestricted master access to all system modules, tenant configuration, and administrative controls',
      permissions: allPermCodes,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_admin',
      name: 'Full Admin',
      code: 'ADMIN',
      description: 'Comprehensive business administration access across Sales, Inventory, Accounts, and HR',
      permissions: allPermCodes.filter(p => !p.startsWith('settings.') && p !== 'audit_logs.view'),
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_manager',
      name: 'Business Manager',
      code: 'MANAGER',
      description: 'Oversees operational workflows, approvals, inventory tracking, and managerial reports',
      permissions: [
        'dashboard.view',
        'leads.view', 'leads.create', 'leads.update', 'leads.assign',
        'customers.view', 'customers.create', 'customers.update',
        'quotations.view', 'quotations.create', 'quotations.update', 'quotations.convert',
        'sales_orders.view', 'sales_orders.create', 'sales_orders.update', 'sales_orders.approve',
        'follow_ups.view', 'follow_ups.create', 'follow_ups.update',
        'products.view', 'inventory.view', 'warehouses.view',
        'purchase.view', 'purchase.create', 'purchase.receive',
        'invoices.view', 'payments.view', 'receivables.view', 'payables.view',
        'employees.view', 'attendance.view', 'reports.view'
      ],
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_sales',
      name: 'Sales Executive',
      code: 'SALES_EMPLOYEE',
      description: 'Manages sales funnel, customer relationship, quotations, and client follow-ups',
      permissions: salesPerms,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_store',
      name: 'Store & Inventory Officer',
      code: 'STORE_EMPLOYEE',
      description: 'Handles warehouse storage, stock receiving, dispatches, and supplier purchase orders',
      permissions: storePerms,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_accountant',
      name: 'Chief Accountant',
      code: 'ACCOUNTANT',
      description: 'Invoicing, receipts, payment reconciliations, expenses, receivables, and payables',
      permissions: accountsPerms,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_hr',
      name: 'HR Specialist',
      code: 'HR_EMPLOYEE',
      description: 'Employee profiles, daily attendance logging, salary disbursement, and performance reviews',
      permissions: hrPerms,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'role_employee',
      name: 'Field Sales & Operations Employee',
      code: 'EMPLOYEE',
      description: 'Dedicated employee portal for assigned leads, follow-ups, calls, attendance and personal records',
      permissions: employeePerms,
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  ];

  const users: UserDoc[] = [
    {
      _id: 'usr_superadmin',
      name: 'Priyanshu Agrawal',
      email: 'shivamshishodia5541@gmail.com',
      passwordHash: superAdminHash,
      phone: '+91 98765 43210',
      role: 'SUPER_ADMIN',
      roleId: 'role_super_admin',
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'PA',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'usr_admin_main',
      name: 'Rohan Sharma (Admin)',
      email: 'admin@craftmediahub.com',
      passwordHash,
      phone: '+91 98123 45678',
      role: 'ADMIN',
      roleId: 'role_admin',
      organization: 'CRAFT MEDIA HUB CRM',
      status: 'ACTIVE',
      avatar: 'RS',
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
    },
    {
      _id: 'usr_admin_sales',
      name: 'Vikram Mehta (Sales Admin)',
      email: 'sales@craftmediahub.com',
      passwordHash,
      phone: '+91 98234 56789',
      role: 'SALES_EMPLOYEE',
      roleId: 'role_sales',
      customPermissions: [
        'dashboard.view', 'leads.view', 'leads.create', 'leads.update', 'leads.delete', 'leads.assign',
        'customers.view', 'customers.create', 'customers.update',
        'quotations.view', 'quotations.create', 'quotations.update', 'quotations.convert',
        'sales_orders.view', 'sales_orders.create', 'sales_orders.update',
        'follow_ups.view', 'follow_ups.create', 'follow_ups.update',
        'campaigns.view', 'lead_sources.view', 'tradeindia.view', 'website_leads.view', 'whatsapp.view',
        'sales_reports.view', 'marketing_reports.view'
      ],
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'VM',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    },
    {
      _id: 'usr_admin_inventory',
      name: 'Anjali Verma (Store Head)',
      email: 'inventory@craftmediahub.com',
      passwordHash,
      phone: '+91 98345 67890',
      role: 'STORE_EMPLOYEE',
      roleId: 'role_store',
      customPermissions: [
        'dashboard.view',
        'products.view', 'products.create', 'products.update',
        'categories.view', 'categories.create',
        'inventory.view', 'inventory.update', 'inventory.adjust',
        'warehouses.view', 'warehouses.create',
        'stock_in.view', 'stock_in.create',
        'stock_out.view', 'stock_out.create',
        'purchase.view', 'purchase.create', 'purchase.receive',
        'suppliers.view', 'suppliers.create', 'suppliers.update'
      ],
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'AV',
      createdAt: '2026-01-12T00:00:00.000Z',
      updatedAt: '2026-01-12T00:00:00.000Z',
    },
    {
      _id: 'usr_admin_accounts',
      name: 'Suresh Patel (Accounts)',
      email: 'accounts@craftmediahub.com',
      passwordHash,
      phone: '+91 98456 78901',
      role: 'ACCOUNTANT',
      roleId: 'role_accountant',
      customPermissions: [
        'dashboard.view',
        'invoices.view', 'invoices.create', 'invoices.update',
        'payments.view', 'payments.create',
        'expenses.view', 'expenses.create', 'expenses.update',
        'receivables.view', 'payables.view',
        'credit_notes.view', 'credit_notes.create',
        'accounts_reports.view'
      ],
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'SP',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    },
    {
      _id: 'usr_admin_hr',
      name: 'Neha Kapoor (HR Lead)',
      email: 'hr@craftmediahub.com',
      passwordHash,
      phone: '+91 98567 89012',
      role: 'HR_EMPLOYEE',
      roleId: 'role_hr',
      customPermissions: [
        'dashboard.view',
        'employees.view', 'employees.create', 'employees.update',
        'attendance.view', 'attendance.create', 'attendance.update',
        'salary.view', 'salary.create', 'salary.update',
        'performance.view', 'performance.create',
        'reports.view'
      ],
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'NK',
      createdAt: '2026-01-18T00:00:00.000Z',
      updatedAt: '2026-01-18T00:00:00.000Z',
    },
    {
      _id: 'usr_employee_arjun',
      name: 'Arjun Singh',
      email: 'employee@craftmediahub.com',
      passwordHash: passwordHash,
      phone: '+91 98765 00112',
      role: 'EMPLOYEE',
      roleId: 'role_employee',
      customPermissions: employeePerms,
      organization: 'CRAFT MEDIA HUB ENTERPRISES',
      status: 'ACTIVE',
      avatar: 'AS',
      createdAt: '2026-01-20T00:00:00.000Z',
      updatedAt: '2026-01-20T00:00:00.000Z',
    }
  ];

  const categories: CategoryDoc[] = [
    { _id: 'cat_1', name: 'Industrial Valves', code: 'VALVE', description: 'High pressure stainless and brass valves', productsCount: 4, createdAt: '2026-01-02T00:00:00.000Z' },
    { _id: 'cat_2', name: 'Pipes & Fittings', code: 'PIPE', description: 'Seamless carbon steel and PVC piping', productsCount: 3, createdAt: '2026-01-02T00:00:00.000Z' },
    { _id: 'cat_3', name: 'Electrical Controls', code: 'ELEC', description: 'Circuit breakers, relays and PLCs', productsCount: 3, createdAt: '2026-01-02T00:00:00.000Z' },
    { _id: 'cat_4', name: 'Pumps & Motors', code: 'PUMP', description: 'Submersible and centrifugal pump assemblies', productsCount: 2, createdAt: '2026-01-02T00:00:00.000Z' }
  ];

  const warehouses: WarehouseDoc[] = [
    {
      _id: 'wh_main',
      name: 'Main Plant Warehouse (Unit 1)',
      code: 'WH-01',
      address: 'Plot 42, GIDC Industrial Estate',
      city: 'Ahmedabad',
      state: 'Gujarat',
      contactPerson: 'Mukesh Bhai',
      phone: '+91 97123 11223',
      status: 'ACTIVE',
      capacityUsage: 68,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'wh_depot',
      name: 'North Logistics Hub',
      code: 'WH-02',
      address: 'Sector 18, Udyog Vihar',
      city: 'Gurugram',
      state: 'Haryana',
      contactPerson: 'Davinder Singh',
      phone: '+91 98111 22334',
      status: 'ACTIVE',
      capacityUsage: 45,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  const products: ProductDoc[] = [
    {
      _id: 'prod_1',
      name: 'SS-316 Flanged Ball Valve 2"',
      sku: 'SSBV-316-2IN',
      barcode: '890123450001',
      category: 'Industrial Valves',
      unit: 'Pcs',
      purchasePrice: 2800,
      sellingPrice: 4200,
      taxPercent: 18,
      currentStock: 145,
      minStock: 30,
      maxStock: 500,
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      status: 'ACTIVE',
      description: 'Precision forged stainless steel ball valve with PTFE seal',
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z'
    },
    {
      _id: 'prod_2',
      name: 'Cast Iron Gate Valve 4" Class 150',
      sku: 'CIGV-150-4IN',
      barcode: '890123450002',
      category: 'Industrial Valves',
      unit: 'Pcs',
      purchasePrice: 4500,
      sellingPrice: 6800,
      taxPercent: 18,
      currentStock: 62,
      minStock: 20,
      maxStock: 200,
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      status: 'ACTIVE',
      description: 'Heavy duty flanged ends gate valve for water & oil steam lines',
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z'
    },
    {
      _id: 'prod_3',
      name: 'Seamless CS Pipe SCH 40 3"',
      sku: 'CSPIPE-SCH40-3IN',
      barcode: '890123450003',
      category: 'Pipes & Fittings',
      unit: 'Mtr',
      purchasePrice: 650,
      sellingPrice: 950,
      taxPercent: 18,
      currentStock: 480,
      minStock: 100,
      maxStock: 1500,
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      status: 'ACTIVE',
      description: 'ASTM A106 Grade B hot finished seamless carbon steel line pipe',
      createdAt: '2026-01-06T00:00:00.000Z',
      updatedAt: '2026-01-06T00:00:00.000Z'
    },
    {
      _id: 'prod_4',
      name: 'Submersible Centrifugal Pump 5HP',
      sku: 'PUMP-5HP-3PH',
      barcode: '890123450004',
      category: 'Pumps & Motors',
      unit: 'Set',
      purchasePrice: 18500,
      sellingPrice: 26000,
      taxPercent: 18,
      currentStock: 18,
      minStock: 5,
      maxStock: 50,
      warehouseId: 'wh_depot',
      warehouseName: 'North Logistics Hub',
      status: 'ACTIVE',
      description: 'Three phase 415V stainless impeller deep-well submersible motor pump',
      createdAt: '2026-01-08T00:00:00.000Z',
      updatedAt: '2026-01-08T00:00:00.000Z'
    },
    {
      _id: 'prod_5',
      name: 'Digital Schneider VFD Control Unit 7.5kW',
      sku: 'VFD-SCH-7KW',
      barcode: '890123450005',
      category: 'Electrical Controls',
      unit: 'Pcs',
      purchasePrice: 14200,
      sellingPrice: 19800,
      taxPercent: 18,
      currentStock: 24,
      minStock: 8,
      maxStock: 60,
      warehouseId: 'wh_depot',
      warehouseName: 'North Logistics Hub',
      status: 'ACTIVE',
      description: 'Variable frequency drive with Modbus RTU communication',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z'
    }
  ];

  const suppliers: SupplierDoc[] = [
    {
      _id: 'sup_1',
      name: 'Jindal Steel & Alloys Ltd',
      companyName: 'Jindal Steel & Alloys Ltd',
      phone: '+91 11 4123 8899',
      email: 'sales@jindalalloys.in',
      gstNumber: '07AAACJ1234F1Z8',
      address: 'Core 6, Scope Complex, Lodhi Road',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      paymentTerms: 'Net 30 Days',
      balancePayable: 142500,
      status: 'ACTIVE',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z'
    },
    {
      _id: 'sup_2',
      name: 'Apex Valve Foundry Works',
      companyName: 'Apex Precision Castings LLP',
      phone: '+91 265 289 4411',
      email: 'orders@apexvalve.com',
      gstNumber: '24AAKFA9876C1ZQ',
      address: 'GIDC Makarpura Industrial Area',
      city: 'Vadodara',
      state: 'Gujarat',
      country: 'India',
      paymentTerms: 'Net 15 Days',
      balancePayable: 88400,
      status: 'ACTIVE',
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z'
    }
  ];

  const customers: CustomerDoc[] = [
    {
      _id: 'cust_1',
      name: 'Shree Cement Infrastructure Corp',
      companyName: 'Shree Cement Infrastructure Corp',
      email: 'procurement@shreecementinfra.com',
      phone: '+91 141 278 9900',
      gstNumber: '08AABCS5544K1ZR',
      address: {
        street: 'Bangur Nagar, Beawar Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        pincode: '302001'
      },
      assignedTo: 'Vikram Mehta (Sales Admin)',
      totalOrdersCount: 8,
      totalSpent: 485000,
      status: 'ACTIVE',
      createdAt: '2026-01-08T00:00:00.000Z',
      updatedAt: '2026-01-08T00:00:00.000Z'
    },
    {
      _id: 'cust_2',
      name: 'Adani Petrochemicals Terminal Ltd',
      companyName: 'Adani Petrochemicals Terminal Ltd',
      email: 'purchase.dept@adanipetro.in',
      phone: '+91 79 2656 5555',
      gstNumber: '24AAACA3210M1Z2',
      address: {
        street: 'Adani Corporate House, Shantigram, SG Highway',
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
        pincode: '382421'
      },
      assignedTo: 'Vikram Mehta (Sales Admin)',
      totalOrdersCount: 14,
      totalSpent: 920000,
      status: 'ACTIVE',
      createdAt: '2026-01-09T00:00:00.000Z',
      updatedAt: '2026-01-09T00:00:00.000Z'
    },
    {
      _id: 'cust_3',
      name: 'Tata Chemical & Fertilizers Works',
      companyName: 'Tata Chemical & Fertilizers Works',
      email: 'mkt.vendor@tatachem.com',
      phone: '+91 22 6665 8282',
      gstNumber: '27AAACT2702H1ZV',
      address: {
        street: 'Bombay House, 24 Homi Mody Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001'
      },
      assignedTo: 'Rohan Sharma (Admin)',
      totalOrdersCount: 5,
      totalSpent: 310000,
      status: 'ACTIVE',
      createdAt: '2026-01-14T00:00:00.000Z',
      updatedAt: '2026-01-14T00:00:00.000Z'
    }
  ];

  const leads: LeadDoc[] = [
    {
      _id: 'lead_1',
      name: 'Rajesh Kulkarni',
      companyName: 'Kulkarni Sugar Refineries',
      email: 'rajesh.k@kulkarnisugar.com',
      phone: '+91 94220 44556',
      source: 'TradeIndia',
      status: 'QUALIFIED',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      estimatedValue: 340000,
      notes: 'Requires 40 units of SS-316 valves and 200m steam pipes for refinery expansion',
      tags: ['Hot Lead', 'TradeIndia Sync', 'Sugar Industry'],
      createdAt: '2026-02-01T10:15:00.000Z',
      updatedAt: '2026-02-02T11:20:00.000Z'
    },
    {
      _id: 'lead_2',
      name: 'Harpreet Singh',
      companyName: 'Punjab Agro Cold Storages',
      email: 'harpreet@punjabagrocold.in',
      phone: '+91 98140 12890',
      source: 'Website',
      status: 'PROPOSAL',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      estimatedValue: 180000,
      notes: 'Submitted quotation for 5HP submersible pumps with VFD controller',
      tags: ['Website Form', 'Agro'],
      createdAt: '2026-02-03T14:30:00.000Z',
      updatedAt: '2026-02-04T09:45:00.000Z'
    },
    {
      _id: 'lead_3',
      name: 'Karthik Raja',
      companyName: 'TN Power Dist Corp',
      email: 'karthik.raja@tnpowerdist.gov.in',
      phone: '+91 94440 98712',
      source: 'IndiaMART',
      status: 'NEGOTIATION',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      estimatedValue: 560000,
      notes: 'Reviewing discount terms for heavy order of CI Gate Valves',
      tags: ['Government Tender', 'High Value'],
      createdAt: '2026-02-05T16:00:00.000Z',
      updatedAt: '2026-02-06T12:00:00.000Z'
    },
    {
      _id: 'lead_4',
      name: 'Amitabh Sen',
      companyName: 'Bengal Paper Mills Pvt Ltd',
      email: 'sen.a@bengalpapermills.com',
      phone: '+91 98300 77665',
      source: 'WhatsApp',
      status: 'NEW',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      estimatedValue: 95000,
      notes: 'Inquired via WhatsApp Business regarding 2" flanged ball valves stock availability',
      tags: ['WhatsApp Direct'],
      createdAt: '2026-02-08T11:00:00.000Z',
      updatedAt: '2026-02-08T11:00:00.000Z'
    },
    {
      _id: 'lead_emp_1',
      name: 'Vikramaditya Solanki',
      companyName: 'Solanki Chemical Processing Ltd',
      email: 'v.solanki@solankichem.com',
      phone: '+91 98240 77112',
      source: 'IndiaMART',
      status: 'CONTACTED',
      assignedTo: 'Arjun Singh',
      estimatedValue: 280000,
      notes: 'Requires 30 units of SS-316 valves and 100m high-pressure steam pipes. Call completed, requested datasheet.',
      tags: ['Chemical Sector', 'High Priority'],
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-15T11:30:00.000Z'
    },
    {
      _id: 'lead_emp_2',
      name: 'Sunita Sharma',
      companyName: 'Jaipur Distilleries & Biofuels',
      email: 'purchase@jaipurdistilleries.in',
      phone: '+91 94140 33221',
      source: 'TradeIndia',
      status: 'QUALIFIED',
      assignedTo: 'Arjun Singh',
      estimatedValue: 420000,
      notes: 'Evaluating our stainless steel flanged ball valves for new ethanol blending expansion.',
      tags: ['Biofuel Project', 'TradeIndia'],
      createdAt: '2026-02-11T12:00:00.000Z',
      updatedAt: '2026-02-16T10:15:00.000Z'
    },
    {
      _id: 'lead_emp_3',
      name: 'Manoj Trivedi',
      companyName: 'Trivedi Engineering & Fabrication',
      email: 'm.trivedi@trivedifab.com',
      phone: '+91 97129 88440',
      source: 'Website',
      status: 'PROPOSAL',
      assignedTo: 'Arjun Singh',
      estimatedValue: 165000,
      notes: 'Formal proposal QT-2026-0045 submitted. Commercial negotiation scheduled.',
      tags: ['Fabrication', 'Quoted'],
      createdAt: '2026-02-12T14:20:00.000Z',
      updatedAt: '2026-02-16T15:00:00.000Z'
    },
    {
      _id: 'lead_emp_4',
      name: 'Deepak Chawla',
      companyName: 'Chawla Agro Cold Storage',
      email: 'deepak@chawlacoldchain.in',
      phone: '+91 98110 55443',
      source: 'Direct Call',
      status: 'WON',
      assignedTo: 'Arjun Singh',
      estimatedValue: 310000,
      notes: 'Deal closed! Advance payment 30% received. PO-2026-889 approved for dispatch.',
      tags: ['Closed Won', 'Cold Storage'],
      createdAt: '2026-02-05T09:00:00.000Z',
      updatedAt: '2026-02-14T17:00:00.000Z'
    },
    {
      _id: 'lead_emp_5',
      name: 'Ramesh Choudhary',
      companyName: 'Marwar Steel & Rolling Mills',
      email: 'ramesh.steel@marwarsteel.in',
      phone: '+91 94133 99881',
      source: 'WhatsApp',
      status: 'NEW',
      assignedTo: 'Arjun Singh',
      estimatedValue: 520000,
      notes: 'Fresh WhatsApp lead. Requested bulk wholesale pricelist for 4" CI gate valves.',
      tags: ['Fresh Inquiry', 'Steel Mills'],
      createdAt: '2026-02-16T09:30:00.000Z',
      updatedAt: '2026-02-16T09:30:00.000Z'
    }
  ];

  const followUps: FollowUpDoc[] = [
    {
      _id: 'fup_1',
      leadId: 'lead_1',
      type: 'Call',
      title: 'Discuss Technical Specs for SS-316 Valves',
      description: 'Clarify ASME standard flanges requirement with plant engineering team',
      scheduledAt: '2026-02-17T11:00:00.000Z',
      status: 'PENDING',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      createdAt: '2026-02-02T12:00:00.000Z',
      updatedAt: '2026-02-02T12:00:00.000Z'
    },
    {
      _id: 'fup_2',
      leadId: 'lead_2',
      type: 'Meeting',
      title: 'Quotation Review & Delivery Terms',
      description: 'Virtual meeting via Google Meet with Harpreet Singh',
      scheduledAt: '2026-02-18T15:30:00.000Z',
      status: 'PENDING',
      assignedTo: 'Vikram Mehta (Sales Admin)',
      createdAt: '2026-02-04T10:00:00.000Z',
      updatedAt: '2026-02-04T10:00:00.000Z'
    },
    {
      _id: 'fup_emp_1',
      leadId: 'lead_emp_1',
      type: 'Call',
      title: 'Technical review of SS Valve flanges with Plant Engineer',
      description: 'Call Vikramaditya to review ASME flange ratings and dispatch schedule',
      scheduledAt: '2026-02-17T11:30:00.000Z',
      status: 'PENDING',
      assignedTo: 'Arjun Singh',
      createdAt: '2026-02-15T12:00:00.000Z',
      updatedAt: '2026-02-15T12:00:00.000Z'
    },
    {
      _id: 'fup_emp_2',
      leadId: 'lead_emp_2',
      type: 'WhatsApp',
      title: 'Share updated GST tax invoice & material test certificates',
      description: 'Send Sunita Sharma MTC batch certs for SS-316 ball valves via WhatsApp',
      scheduledAt: '2026-02-17T15:00:00.000Z',
      status: 'PENDING',
      assignedTo: 'Arjun Singh',
      createdAt: '2026-02-16T10:30:00.000Z',
      updatedAt: '2026-02-16T10:30:00.000Z'
    },
    {
      _id: 'fup_emp_3',
      leadId: 'lead_emp_3',
      type: 'Meeting',
      title: 'Commercial proposal negotiation over Google Meet',
      description: 'Discuss 5% volume discount terms with Manoj Trivedi for unit 2 revamp',
      scheduledAt: '2026-02-22T16:00:00.000Z',
      status: 'PENDING',
      assignedTo: 'Arjun Singh',
      createdAt: '2026-02-16T15:30:00.000Z',
      updatedAt: '2026-02-16T15:30:00.000Z'
    }
  ];

  const quotations: QuotationDoc[] = [
    {
      _id: 'quot_1',
      quotationNumber: 'QT-2026-0041',
      customerId: 'cust_1',
      customerName: 'Shree Cement Infrastructure Corp',
      date: '2026-02-01',
      validUntil: '2026-03-01',
      items: [
        {
          productId: 'prod_1',
          productName: 'SS-316 Flanged Ball Valve 2"',
          sku: 'SSBV-316-2IN',
          quantity: 20,
          unitPrice: 4200,
          taxPercent: 18,
          discountPercent: 5,
          total: 94164
        },
        {
          productId: 'prod_3',
          productName: 'Seamless CS Pipe SCH 40 3"',
          sku: 'CSPIPE-SCH40-3IN',
          quantity: 100,
          unitPrice: 950,
          taxPercent: 18,
          discountPercent: 5,
          total: 106495
        }
      ],
      subTotal: 179000,
      taxAmount: 32220,
      discountAmount: 8950,
      grandTotal: 200659,
      status: 'CONVERTED',
      convertedSalesOrderId: 'so_1',
      notes: 'Delivery within 7 business days to Jaipur site.',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-03T11:00:00.000Z'
    },
    {
      _id: 'quot_2',
      quotationNumber: 'QT-2026-0042',
      customerId: 'cust_2',
      customerName: 'Adani Petrochemicals Terminal Ltd',
      date: '2026-02-05',
      validUntil: '2026-03-05',
      items: [
        {
          productId: 'prod_2',
          productName: 'Cast Iron Gate Valve 4" Class 150',
          sku: 'CIGV-150-4IN',
          quantity: 15,
          unitPrice: 6800,
          taxPercent: 18,
          discountPercent: 0,
          total: 120360
        }
      ],
      subTotal: 102000,
      taxAmount: 18360,
      discountAmount: 0,
      grandTotal: 120360,
      status: 'ACCEPTED',
      notes: 'Price includes freight to Mundra port facility.',
      createdAt: '2026-02-05T09:00:00.000Z',
      updatedAt: '2026-02-07T14:00:00.000Z'
    }
  ];

  const salesOrders: SalesOrderDoc[] = [
    {
      _id: 'so_1',
      salesOrderNumber: 'SO-2026-0028',
      customerId: 'cust_1',
      customerName: 'Shree Cement Infrastructure Corp',
      quotationId: 'quot_1',
      orderDate: '2026-02-03',
      expectedDelivery: '2026-02-12',
      items: [
        {
          productId: 'prod_1',
          productName: 'SS-316 Flanged Ball Valve 2"',
          sku: 'SSBV-316-2IN',
          quantity: 20,
          unitPrice: 4200,
          taxPercent: 18,
          discountPercent: 5,
          total: 94164
        },
        {
          productId: 'prod_3',
          productName: 'Seamless CS Pipe SCH 40 3"',
          sku: 'CSPIPE-SCH40-3IN',
          quantity: 100,
          unitPrice: 950,
          taxPercent: 18,
          discountPercent: 5,
          total: 106495
        }
      ],
      subTotal: 179000,
      taxAmount: 32220,
      discountAmount: 8950,
      shipping: 2500,
      grandTotal: 203159,
      status: 'APPROVED',
      isInvoiced: true,
      invoiceId: 'inv_1',
      approvedBy: 'Rohan Sharma (Admin)',
      notes: 'Order confirmed against PO #SCIC-9921',
      createdAt: '2026-02-03T11:00:00.000Z',
      updatedAt: '2026-02-03T11:30:00.000Z'
    }
  ];

  const invoices: InvoiceDoc[] = [
    {
      _id: 'inv_1',
      invoiceNumber: 'INV-2026-0012',
      customerId: 'cust_1',
      customerName: 'Shree Cement Infrastructure Corp',
      salesOrderId: 'so_1',
      invoiceDate: '2026-02-04',
      dueDate: '2026-03-04',
      items: [
        {
          productId: 'prod_1',
          productName: 'SS-316 Flanged Ball Valve 2"',
          quantity: 20,
          unitPrice: 4200,
          taxPercent: 18,
          total: 99120
        },
        {
          productId: 'prod_3',
          productName: 'Seamless CS Pipe SCH 40 3"',
          quantity: 100,
          unitPrice: 950,
          taxPercent: 18,
          total: 112100
        }
      ],
      subTotal: 179000,
      taxAmount: 32220,
      discountAmount: 8950,
      grandTotal: 203159,
      paidAmount: 100000,
      dueAmount: 103159,
      paymentStatus: 'PARTIAL',
      notes: 'Payment terms: 30 days. GST 18% inclusive.',
      createdAt: '2026-02-04T12:00:00.000Z',
      updatedAt: '2026-02-08T15:00:00.000Z'
    },
    {
      _id: 'inv_2',
      invoiceNumber: 'INV-2026-0013',
      customerId: 'cust_2',
      customerName: 'Adani Petrochemicals Terminal Ltd',
      invoiceDate: '2026-02-06',
      dueDate: '2026-03-06',
      items: [
        {
          productId: 'prod_2',
          productName: 'Cast Iron Gate Valve 4" Class 150',
          quantity: 15,
          unitPrice: 6800,
          taxPercent: 18,
          total: 120360
        }
      ],
      subTotal: 102000,
      taxAmount: 18360,
      discountAmount: 0,
      grandTotal: 120360,
      paidAmount: 120360,
      dueAmount: 0,
      paymentStatus: 'PAID',
      notes: 'Paid via RTGS on delivery.',
      createdAt: '2026-02-06T14:00:00.000Z',
      updatedAt: '2026-02-09T10:00:00.000Z'
    }
  ];

  const payments: PaymentDoc[] = [
    {
      _id: 'pay_1',
      paymentNumber: 'PAY-2026-0009',
      customerId: 'cust_1',
      customerName: 'Shree Cement Infrastructure Corp',
      invoiceId: 'inv_1',
      invoiceNumber: 'INV-2026-0012',
      amount: 100000,
      paymentMethod: 'BANK',
      referenceNumber: 'HDFC-NEFT-99128381',
      paymentDate: '2026-02-08',
      notes: 'Advance part payment received against INV-2026-0012',
      receivedBy: 'Suresh Patel (Accounts)',
      createdAt: '2026-02-08T15:00:00.000Z'
    },
    {
      _id: 'pay_2',
      paymentNumber: 'PAY-2026-0010',
      customerId: 'cust_2',
      customerName: 'Adani Petrochemicals Terminal Ltd',
      invoiceId: 'inv_2',
      invoiceNumber: 'INV-2026-0013',
      amount: 120360,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI-AXIS-00293817',
      paymentDate: '2026-02-09',
      notes: 'Full invoice settlement received',
      receivedBy: 'Suresh Patel (Accounts)',
      createdAt: '2026-02-09T10:00:00.000Z'
    }
  ];

  const purchases: PurchaseDoc[] = [
    {
      _id: 'po_1',
      purchaseNumber: 'PO-2026-0015',
      supplierId: 'sup_1',
      supplierName: 'Jindal Steel & Alloys Ltd',
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      purchaseDate: '2026-01-20',
      expectedDate: '2026-01-28',
      items: [
        {
          productId: 'prod_3',
          productName: 'Seamless CS Pipe SCH 40 3"',
          sku: 'CSPIPE-SCH40-3IN',
          quantity: 200,
          unitPrice: 650,
          taxPercent: 18,
          discountPercent: 0,
          total: 153400
        }
      ],
      subTotal: 130000,
      taxAmount: 23400,
      discountAmount: 0,
      shipping: 3500,
      grandTotal: 156900,
      paidAmount: 50000,
      dueAmount: 106900,
      paymentStatus: 'PARTIAL',
      status: 'RECEIVED',
      receivedAt: '2026-01-27T16:00:00.000Z',
      notes: 'Pipes delivered in good condition and quality inspected.',
      createdAt: '2026-01-20T10:00:00.000Z',
      updatedAt: '2026-01-27T16:00:00.000Z'
    },
    {
      _id: 'po_2',
      purchaseNumber: 'PO-2026-0016',
      supplierId: 'sup_2',
      supplierName: 'Apex Valve Foundry Works',
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      purchaseDate: '2026-02-05',
      expectedDate: '2026-02-18',
      items: [
        {
          productId: 'prod_1',
          productName: 'SS-316 Flanged Ball Valve 2"',
          sku: 'SSBV-316-2IN',
          quantity: 50,
          unitPrice: 2800,
          taxPercent: 18,
          discountPercent: 2,
          total: 161896
        }
      ],
      subTotal: 140000,
      taxAmount: 24696,
      discountAmount: 2800,
      shipping: 2000,
      grandTotal: 163896,
      paidAmount: 0,
      dueAmount: 163896,
      paymentStatus: 'UNPAID',
      status: 'ORDERED',
      notes: 'Delivery expected mid-February for batch restocking.',
      createdAt: '2026-02-05T14:00:00.000Z',
      updatedAt: '2026-02-05T14:00:00.000Z'
    }
  ];

  const stockTransactions: StockTransactionDoc[] = [
    {
      _id: 'stk_tx_1',
      productId: 'prod_3',
      productName: 'Seamless CS Pipe SCH 40 3"',
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      type: 'STOCK_IN',
      quantity: 200,
      previousStock: 280,
      newStock: 480,
      referenceType: 'PURCHASE',
      referenceId: 'po_1',
      reason: 'Purchase order goods received',
      supplierId: 'sup_1',
      supplierName: 'Jindal Steel & Alloys Ltd',
      createdBy: 'Anjali Verma (Store Head)',
      createdAt: '2026-01-27T16:00:00.000Z'
    },
    {
      _id: 'stk_tx_2',
      productId: 'prod_1',
      productName: 'SS-316 Flanged Ball Valve 2"',
      warehouseId: 'wh_main',
      warehouseName: 'Main Plant Warehouse (Unit 1)',
      type: 'STOCK_OUT',
      quantity: 15,
      previousStock: 160,
      newStock: 145,
      referenceType: 'SALES_ORDER',
      referenceId: 'so_1',
      reason: 'Dispatched to Shree Cement Infra',
      createdBy: 'Anjali Verma (Store Head)',
      createdAt: '2026-02-04T15:00:00.000Z'
    }
  ];

  const expenses: ExpenseDoc[] = [
    {
      _id: 'exp_1',
      category: 'Rent',
      title: 'Warehouse Unit 1 Monthly Lease',
      amount: 45000,
      expenseDate: '2026-02-01',
      paymentMethod: 'BANK',
      description: 'GIDC Industrial Estate rental payment',
      recordedBy: 'Suresh Patel (Accounts)',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'exp_2',
      category: 'Utilities',
      title: 'High Tension Electricity Bill',
      amount: 28400,
      expenseDate: '2026-02-03',
      paymentMethod: 'UPI',
      description: 'UGVCL Power bill for plant workshop',
      recordedBy: 'Suresh Patel (Accounts)',
      createdAt: '2026-02-03T11:00:00.000Z'
    },
    {
      _id: 'exp_3',
      category: 'Marketing',
      title: 'TradeIndia Annual B2B Verified Membership',
      amount: 35000,
      expenseDate: '2026-02-05',
      paymentMethod: 'CARD',
      description: 'Premium buyer inquiries subscription',
      recordedBy: 'Suresh Patel (Accounts)',
      createdAt: '2026-02-05T12:00:00.000Z'
    }
  ];

  const creditNotes: CreditNoteDoc[] = [
    {
      _id: 'cn_1',
      creditNoteNumber: 'CN-2026-0003',
      customerId: 'cust_1',
      customerName: 'Shree Cement Infrastructure Corp',
      invoiceId: 'inv_1',
      amount: 5000,
      reason: 'Volume discount rebate as agreed in contract',
      date: '2026-02-06',
      status: 'ACTIVE',
      createdAt: '2026-02-06T15:00:00.000Z'
    }
  ];

  const employees: EmployeeDoc[] = [
    {
      _id: 'emp_1',
      employeeId: 'EMP-0101',
      name: 'Vikram Mehta',
      email: 'sales@360crm.com',
      phone: '+91 98234 56789',
      department: 'Sales',
      designation: 'Senior Sales Executive',
      joiningDate: '2024-03-15',
      salary: 55000,
      status: 'ACTIVE',
      userId: 'usr_admin_sales',
      isFieldEmployee: false,
      trackingEnabled: true,
      trackingMode: 'WORKING_HOURS',
      locationConsent: {
        status: 'GRANTED',
        grantedAt: '2026-01-01T09:00:00.000Z',
        policyVersion: 'v1.0'
      },
      shiftStart: '09:30',
      shiftEnd: '18:30',
      bankDetails: {
        accountNumber: '91802001928371',
        bankName: 'HDFC Bank Ltd',
        ifsc: 'HDFC0001234'
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'emp_2',
      employeeId: 'EMP-0102',
      name: 'Anjali Verma',
      email: 'inventory@360crm.com',
      phone: '+91 98345 67890',
      department: 'Store',
      designation: 'Inventory & Dispatch Manager',
      joiningDate: '2024-06-01',
      salary: 48000,
      status: 'ACTIVE',
      userId: 'usr_admin_inventory',
      isFieldEmployee: false,
      trackingEnabled: true,
      trackingMode: 'WORKING_HOURS',
      locationConsent: {
        status: 'GRANTED',
        grantedAt: '2026-01-01T09:00:00.000Z',
        policyVersion: 'v1.0'
      },
      shiftStart: '09:00',
      shiftEnd: '18:00',
      bankDetails: {
        accountNumber: '50100293817263',
        bankName: 'ICICI Bank Ltd',
        ifsc: 'ICIC0005678'
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'emp_3',
      employeeId: 'EMP-0103',
      name: 'Suresh Patel',
      email: 'accounts@360crm.com',
      phone: '+91 98456 78901',
      department: 'Accounts',
      designation: 'Chief Accounts Officer',
      joiningDate: '2023-11-10',
      salary: 62000,
      status: 'ACTIVE',
      userId: 'usr_admin_accounts',
      isFieldEmployee: true,
      trackingEnabled: true,
      trackingMode: 'WORKING_HOURS',
      locationConsent: {
        status: 'GRANTED',
        grantedAt: '2026-01-01T09:00:00.000Z',
        policyVersion: 'v1.0'
      },
      shiftStart: '09:30',
      shiftEnd: '18:30',
      bankDetails: {
        accountNumber: '20491827364510',
        bankName: 'State Bank of India',
        ifsc: 'SBIN0009988'
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'emp_4',
      employeeId: 'EMP-0104',
      name: 'Neha Kapoor',
      email: 'hr@360crm.com',
      phone: '+91 98567 89012',
      department: 'HR',
      designation: 'Lead Human Resources',
      joiningDate: '2024-01-15',
      salary: 50000,
      status: 'ACTIVE',
      userId: 'usr_admin_hr',
      isFieldEmployee: false,
      trackingEnabled: true,
      trackingMode: 'WORKING_HOURS',
      locationConsent: {
        status: 'GRANTED',
        grantedAt: '2026-01-01T09:00:00.000Z',
        policyVersion: 'v1.0'
      },
      shiftStart: '09:30',
      shiftEnd: '18:30',
      bankDetails: {
        accountNumber: '60192837465019',
        bankName: 'Axis Bank Ltd',
        ifsc: 'UTIB0003344'
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'emp_arjun',
      employeeId: 'EMP-007',
      name: 'Arjun Singh',
      email: 'employee@360crm.com',
      phone: '+91 98765 00112',
      department: 'Sales',
      designation: 'Senior Sales & Field Representative',
      joiningDate: '2025-06-01',
      salary: 38000,
      status: 'ACTIVE',
      userId: 'usr_employee_arjun',
      isFieldEmployee: true,
      trackingEnabled: true,
      trackingMode: 'WORKING_HOURS',
      locationConsent: {
        status: 'GRANTED',
        grantedAt: '2026-01-20T09:00:00.000Z',
        policyVersion: 'v1.0'
      },
      shiftStart: '09:30',
      shiftEnd: '18:30',
      bankDetails: {
        accountNumber: '50100234891234',
        bankName: 'HDFC Bank Ltd',
        ifsc: 'HDFC0001234'
      },
      createdAt: '2026-01-20T00:00:00.000Z',
      updatedAt: '2026-01-20T00:00:00.000Z'
    }
  ];

  const attendance: AttendanceDoc[] = [
    {
      _id: 'att_1',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      date: '2026-02-16',
      checkIn: '09:05 AM',
      checkOut: '06:15 PM',
      status: 'PRESENT',
      remarks: 'On-time, completed client site calls',
      createdAt: '2026-02-16T09:05:00.000Z'
    },
    {
      _id: 'att_2',
      employeeId: 'emp_2',
      employeeName: 'Anjali Verma',
      date: '2026-02-16',
      checkIn: '08:58 AM',
      checkOut: '06:00 PM',
      status: 'PRESENT',
      remarks: 'Supervised morning truck offload',
      createdAt: '2026-02-16T08:58:00.000Z'
    },
    {
      _id: 'att_3',
      employeeId: 'emp_3',
      employeeName: 'Suresh Patel',
      date: '2026-02-16',
      checkIn: '09:12 AM',
      checkOut: '06:30 PM',
      status: 'PRESENT',
      remarks: 'Reconciled GST and bank ledgers',
      createdAt: '2026-02-16T09:12:00.000Z'
    },
    {
      _id: 'att_4',
      employeeId: 'emp_4',
      employeeName: 'Neha Kapoor',
      date: '2026-02-16',
      checkIn: '09:00 AM',
      checkOut: '06:00 PM',
      status: 'PRESENT',
      remarks: 'Conducted employee appraisals',
      createdAt: '2026-02-16T09:00:00.000Z'
    },
    {
      _id: 'att_arjun_today',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:15 AM',
      checkOut: '',
      status: 'PRESENT',
      workHours: 4.5,
      breaks: [{ _id: 'brk_arjun_1', start: '01:00 PM', end: '01:30 PM', durationMinutes: 30 }],
      remarks: 'Biometric selfie verified at Ahmedabad West Office',
      createdAt: new Date().toISOString()
    }
  ];

  const salaries: SalaryDoc[] = [
    {
      _id: 'sal_1',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      month: '2026-01',
      basicSalary: 45000,
      allowances: 10000,
      deductions: 2500,
      netSalary: 52500,
      paymentStatus: 'PAID',
      paymentDate: '2026-02-01',
      notes: 'Direct bank transfer credited',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'sal_2',
      employeeId: 'emp_2',
      employeeName: 'Anjali Verma',
      month: '2026-01',
      basicSalary: 40000,
      allowances: 8000,
      deductions: 2000,
      netSalary: 46000,
      paymentStatus: 'PAID',
      paymentDate: '2026-02-01',
      notes: 'Direct bank transfer credited',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'sal_3',
      employeeId: 'emp_3',
      employeeName: 'Suresh Patel',
      month: '2026-01',
      basicSalary: 52000,
      allowances: 10000,
      deductions: 3000,
      netSalary: 59000,
      paymentStatus: 'PAID',
      paymentDate: '2026-02-01',
      notes: 'Direct bank transfer credited',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'sal_4',
      employeeId: 'emp_4',
      employeeName: 'Neha Kapoor',
      month: '2026-01',
      basicSalary: 42000,
      allowances: 8000,
      deductions: 2000,
      netSalary: 48000,
      paymentStatus: 'PAID',
      paymentDate: '2026-02-01',
      notes: 'Direct bank transfer credited',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'sal_arjun_jan',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      month: '2026-01',
      basicSalary: 38000,
      allowances: 7500,
      deductions: 2100,
      netSalary: 43400,
      paymentStatus: 'PAID',
      paymentDate: '2026-02-01',
      notes: 'Direct credit to HDFC A/C ending 1234. Incentives included.',
      createdAt: '2026-02-01T10:00:00.000Z'
    }
  ];

  const performance: PerformanceDoc[] = [
    {
      _id: 'perf_1',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      reviewPeriod: 'Q4 2025',
      rating: 5,
      comments: 'Exceeded sales target by 140%. Excellent client retention and quotation conversion rates.',
      goalsAchieved: 'Closed Rs 1.8 Cr enterprise contracts across Gujarat and Rajasthan',
      reviewerName: 'Rohan Sharma (Admin)',
      reviewDate: '2026-01-10',
      createdAt: '2026-01-10T12:00:00.000Z'
    },
    {
      _id: 'perf_2',
      employeeId: 'emp_2',
      employeeName: 'Anjali Verma',
      reviewPeriod: 'Q4 2025',
      rating: 4,
      comments: 'Maintained 99.4% stock accuracy during annual inventory count. Minimal wastage.',
      goalsAchieved: 'Optimized warehouse racking layout, reducing dispatch turnaround by 25%',
      reviewerName: 'Rohan Sharma (Admin)',
      reviewDate: '2026-01-12',
      createdAt: '2026-01-12T14:00:00.000Z'
    },
    {
      _id: 'perf_arjun',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      reviewPeriod: 'Q4 2025',
      rating: 4.8,
      comments: 'Outstanding calling consistency and high client conversion on high-pressure valves catalog. Excellent punctuality.',
      goalsAchieved: 'Closed 12 new industrial valve orders worth Rs 45 Lakhs in Q4',
      reviewerName: 'Rohan Sharma (Admin)',
      reviewDate: '2026-01-15',
      createdAt: '2026-01-15T10:00:00.000Z'
    }
  ];

  const campaigns: CampaignDoc[] = [
    {
      _id: 'camp_1',
      name: 'Q1 Industrial Valves & Pipes Expo Push',
      source: 'Google Search & TradeIndia',
      budget: 80000,
      spent: 42500,
      startDate: '2026-01-15',
      endDate: '2026-03-31',
      leadsGenerated: 38,
      conversions: 9,
      status: 'ACTIVE',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-02-10T00:00:00.000Z'
    },
    {
      _id: 'camp_2',
      name: 'WhatsApp Direct Outreach - Sugar Mills',
      source: 'WhatsApp',
      budget: 25000,
      spent: 12000,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      leadsGenerated: 24,
      conversions: 6,
      status: 'ACTIVE',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z'
    }
  ];

  const leadSources: LeadSourceDoc[] = [
    { _id: 'lsrc_1', name: 'TradeIndia B2B Portal', type: 'Portal', status: 'ACTIVE', leadsCount: 42, conversionRate: 28, createdAt: '2026-01-01T00:00:00.000Z' },
    { _id: 'lsrc_2', name: 'Official Website Inquiries', type: 'Website', status: 'ACTIVE', leadsCount: 35, conversionRate: 32, createdAt: '2026-01-01T00:00:00.000Z' },
    { _id: 'lsrc_3', name: 'IndiaMART Directory', type: 'Portal', status: 'ACTIVE', leadsCount: 29, conversionRate: 22, createdAt: '2026-01-01T00:00:00.000Z' },
    { _id: 'lsrc_4', name: 'WhatsApp Business Inbound', type: 'Messaging', status: 'ACTIVE', leadsCount: 26, conversionRate: 38, createdAt: '2026-01-01T00:00:00.000Z' },
    { _id: 'lsrc_5', name: 'Direct Referral & Exhibitions', type: 'Referral', status: 'ACTIVE', leadsCount: 18, conversionRate: 50, createdAt: '2026-01-01T00:00:00.000Z' }
  ];

  const integrations: IntegrationDoc[] = [
    {
      _id: 'int_1',
      name: 'TradeIndia Lead Sync Connector',
      code: 'tradeindia',
      provider: 'TradeIndia',
      category: 'PORTAL',
      connectionMode: 'POLLING',
      status: 'ACTIVE',
      method: 'GET',
      endpointUrl: 'https://www.tradeindia.com/utils/my_buy_leads.html',
      authType: 'API_KEY',
      apiKey: process.env.TRADEINDIA_API_KEY && process.env.TRADEINDIA_API_KEY !== 'YOUR_API_KEY' ? process.env.TRADEINDIA_API_KEY : 'ti_live_sec_778899aabbcc',
      syncFrequency: 'EVERY_5_MIN',
      description: 'Automated 5-minute background synchronization of TradeIndia Buy Leads directly into CRM pipeline.',
      config: {
        userId: process.env.TRADEINDIA_USER_ID && process.env.TRADEINDIA_USER_ID !== 'YOUR_USER_ID' ? process.env.TRADEINDIA_USER_ID : 'TI_SHIV_SHAKTI_99',
        profileId: process.env.TRADEINDIA_PROFILE_ID && process.env.TRADEINDIA_PROFILE_ID !== 'YOUR_PROFILE_ID' ? process.env.TRADEINDIA_PROFILE_ID : '9876543',
        apiKey: process.env.TRADEINDIA_API_KEY && process.env.TRADEINDIA_API_KEY !== 'YOUR_API_KEY' ? process.env.TRADEINDIA_API_KEY : 'ti_live_sec_778899aabbcc',
        apiUrl: 'https://www.tradeindia.com/utils/my_buy_leads.html',
        webhookUrl: '/api/tradeindia/webhook',
        autoAssignLead: false,
        initialSyncDaysBack: 14,
        syncRespondedLeads: true,
        defaultPriority: 'MEDIUM'
      },
      lastSyncedAt: '2026-02-16T18:30:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T18:30:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (54ms) - TradeIndia handshake verified.',
      totalSyncedEvents: 142,
      totalFetched: 142,
      totalCreated: 135,
      totalUpdated: 7,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T18:30:00.000Z'
    },
    {
      _id: 'int_2',
      name: 'IndiaMART Lead Sync API',
      code: 'indiamart',
      provider: 'IndiaMART',
      category: 'PORTAL',
      connectionMode: 'POLLING',
      status: 'ACTIVE',
      method: 'GET',
      endpointUrl: 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/',
      authType: 'API_KEY',
      apiKey: 'im_crm_key_99887766aabb',
      syncFrequency: 'EVERY_5_MIN',
      description: 'Synchronizes IndiaMART buyer enquiries, RFQs and direct messages automatically.',
      config: {
        crmKey: 'im_crm_key_99887766aabb',
        glusrMobile: '9876543210',
        apiUrl: 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/',
        autoAssignLead: false,
        defaultPriority: 'MEDIUM',
        initialSyncDaysBack: 7
      },
      lastSyncedAt: '2026-02-16T17:45:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T17:45:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (62ms) - IndiaMART API connection authenticated.',
      totalSyncedEvents: 98,
      totalFetched: 98,
      totalCreated: 92,
      totalUpdated: 6,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T17:45:00.000Z'
    },
    {
      _id: 'int_3',
      name: 'Website Lead Capture Webhook',
      code: 'website_webhook',
      provider: 'Website',
      category: 'WEBHOOK',
      connectionMode: 'WEBHOOK',
      status: 'ACTIVE',
      method: 'POST',
      endpointUrl: '/api/webhooks/leads/int_3',
      authType: 'WEBHOOK_SECRET',
      webhookSecret: 'whsec_360crm_webleads_2026',
      syncFrequency: 'REALTIME',
      description: 'Real-time JSON webhook endpoint for website landing pages, inquiry forms and lead generation funnels.',
      fieldMapping: {
        'name': 'name',
        'full_name': 'name',
        'phone': 'phone',
        'mobile': 'phone',
        'email': 'email',
        'company': 'companyName',
        'requirement': 'requirement',
        'message': 'notes',
        'city': 'city',
        'state': 'state',
        'budget': 'estimatedValue'
      },
      config: {
        defaultSource: 'Website',
        defaultChannel: 'Website Inbound',
        defaultPriority: 'HIGH',
        autoAssignLead: false
      },
      lastSyncedAt: '2026-02-16T14:15:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T14:15:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (31ms) - Webhook endpoint active & ready for POST payloads.',
      totalSyncedEvents: 89,
      totalFetched: 89,
      totalCreated: 89,
      totalUpdated: 0,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T14:15:00.000Z'
    },
    {
      _id: 'int_4',
      name: 'Meta WhatsApp Cloud API Gateway',
      code: 'whatsapp',
      provider: 'WhatsApp',
      category: 'COMMUNICATION',
      connectionMode: 'WEBHOOK',
      status: 'ACTIVE',
      method: 'POST',
      endpointUrl: '/api/webhooks/whatsapp/int_4',
      authType: 'BEARER_TOKEN',
      apiKey: 'EAAO...whatsapp_cloud_token_live',
      webhookSecret: 'whatsapp_verify_token_360crm_2026',
      syncFrequency: 'REALTIME',
      description: 'Direct Meta WhatsApp Cloud API integration for inbound chats, automatic lead creation and message timeline logging.',
      config: {
        phoneNumberId: '109283746501928',
        businessAccountId: '992837162534',
        accessToken: 'EAAO...whatsapp_cloud_token_live',
        verifyToken: 'whatsapp_verify_token_360crm_2026',
        appSecret: 'sec_meta_app_secret_889900',
        verifiedName: 'Shiv Shakti ERP / CRM',
        defaultPriority: 'HIGH'
      },
      lastSyncedAt: '2026-02-16T20:45:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T20:45:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (45ms) - Meta webhook verification handshake valid.',
      totalSyncedEvents: 310,
      totalFetched: 310,
      totalCreated: 42,
      totalUpdated: 268,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T20:45:00.000Z'
    },
    {
      _id: 'int_5',
      name: 'Razorpay Payment Gateway Hook',
      code: 'razorpay',
      provider: 'Razorpay',
      category: 'PAYMENT',
      connectionMode: 'WEBHOOK',
      status: 'ACTIVE',
      method: 'POST',
      endpointUrl: '/api/webhooks/razorpay/int_5',
      authType: 'WEBHOOK_SECRET',
      apiKey: 'rzp_live_key_998877aabb',
      apiSecret: 'rzp_sec_secret_778899aabb',
      webhookSecret: 'whsec_rzp_hook_sec_2026',
      syncFrequency: 'REALTIME',
      description: 'Processes payment.captured, order.paid and refunds to automatically settle CRM Invoices and log Payments.',
      config: {
        keyId: 'rzp_live_key_998877aabb',
        keySecret: 'rzp_sec_secret_778899aabb',
        webhookSecret: 'whsec_rzp_hook_sec_2026',
        autoSettleInvoice: true
      },
      lastSyncedAt: '2026-02-16T19:30:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T19:30:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (38ms) - Razorpay API key validated.',
      totalSyncedEvents: 74,
      totalFetched: 74,
      totalCreated: 74,
      totalUpdated: 0,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T19:30:00.000Z'
    },
    {
      _id: 'int_6',
      name: 'Stripe Global Payment Hook',
      code: 'stripe',
      provider: 'Stripe',
      category: 'PAYMENT',
      connectionMode: 'WEBHOOK',
      status: 'ACTIVE',
      method: 'POST',
      endpointUrl: '/api/webhooks/stripe/int_6',
      authType: 'WEBHOOK_SECRET',
      apiKey: 'pk_live_stripe_public_9988',
      apiSecret: 'sk_live_stripe_secret_7766',
      webhookSecret: 'whsec_stripe_signing_secret_2026',
      syncFrequency: 'REALTIME',
      description: 'Ingests Stripe payment_intent.succeeded and checkout.session.completed to update Accounts & Finance in CRM.',
      config: {
        publishableKey: 'pk_live_stripe_public_9988',
        secretKey: 'sk_live_stripe_secret_7766',
        webhookSecret: 'whsec_stripe_signing_secret_2026',
        autoSettleInvoice: true
      },
      lastSyncedAt: '2026-02-16T12:00:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T12:00:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (50ms) - Stripe webhook signing secret configured.',
      totalSyncedEvents: 35,
      totalFetched: 35,
      totalCreated: 35,
      totalUpdated: 0,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T12:00:00.000Z'
    },
    {
      _id: 'int_7',
      name: 'Custom ERP / External CRM REST Connector',
      code: 'custom_rest_api',
      provider: 'Custom REST',
      category: 'CUSTOM',
      connectionMode: 'POLLING',
      status: 'CONFIGURED',
      method: 'GET',
      endpointUrl: 'https://api.shivshakti-erp.com/v1/inbound-leads',
      authType: 'API_KEY',
      apiKey: 'crm_sec_custom_rest_api_key_2026',
      syncFrequency: 'HOURLY',
      description: 'Configurable REST polling connector with dynamic JSON response mapping, custom headers, and pagination.',
      fieldMapping: {
        'id': 'externalLeadId',
        'customer_name': 'name',
        'contact_number': 'phone',
        'email_address': 'email',
        'organization': 'companyName',
        'product_interest': 'productName',
        'inquiry_notes': 'requirement',
        'location_city': 'city',
        'estimated_deal_value': 'estimatedValue'
      },
      config: {
        responseRootPath: 'data.leads',
        paginationType: 'PAGE_NUMBER',
        pageParam: 'page',
        limitParam: 'limit',
        limit: 50,
        headers: {
          'x-client-id': 'shivshakti_360crm'
        },
        defaultSource: 'Custom REST API',
        defaultChannel: 'Enterprise Sync',
        defaultPriority: 'MEDIUM',
        autoAssignLead: false
      },
      lastSyncedAt: '2026-02-16T15:00:00.000Z',
      lastSuccessfulSyncAt: '2026-02-16T15:00:00.000Z',
      lastSyncStatus: 'SUCCESS',
      lastTestStatus: 'SUCCESS',
      lastTestResponse: 'HTTP 200 OK (72ms) - REST API connection handshake verified.',
      totalSyncedEvents: 52,
      totalFetched: 52,
      totalCreated: 48,
      totalUpdated: 4,
      totalFailed: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-16T15:00:00.000Z'
    }
  ];

  const integrationLogs: IntegrationLogDoc[] = [
    {
      _id: 'intlog_1',
      integrationId: 'int_1',
      integrationName: 'TradeIndia Lead Sync Connector',
      provider: 'TradeIndia',
      triggerType: 'SCHEDULED',
      status: 'SUCCESS',
      startedAt: '2026-02-16T18:29:58.000Z',
      completedAt: '2026-02-16T18:30:00.000Z',
      durationMs: 2140,
      fetched: 12,
      created: 12,
      updated: 0,
      skipped: 0,
      failed: 0,
      requestId: 'req_ti_sync_101',
      createdAt: '2026-02-16T18:30:00.000Z'
    },
    {
      _id: 'intlog_2',
      integrationId: 'int_2',
      integrationName: 'IndiaMART Lead Sync API',
      provider: 'IndiaMART',
      triggerType: 'SCHEDULED',
      status: 'SUCCESS',
      startedAt: '2026-02-16T17:44:59.000Z',
      completedAt: '2026-02-16T17:45:00.000Z',
      durationMs: 1650,
      fetched: 8,
      created: 7,
      updated: 1,
      skipped: 0,
      failed: 0,
      requestId: 'req_im_sync_102',
      createdAt: '2026-02-16T17:45:00.000Z'
    },
    {
      _id: 'intlog_3',
      integrationId: 'int_3',
      integrationName: 'Website Lead Capture Webhook',
      provider: 'Website',
      triggerType: 'WEBHOOK',
      status: 'SUCCESS',
      startedAt: '2026-02-16T14:14:59.800Z',
      completedAt: '2026-02-16T14:15:00.000Z',
      durationMs: 200,
      fetched: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      requestId: 'req_wh_web_103',
      createdAt: '2026-02-16T14:15:00.000Z'
    },
    {
      _id: 'intlog_4',
      integrationId: 'int_5',
      integrationName: 'Razorpay Payment Gateway Hook',
      provider: 'Razorpay',
      triggerType: 'WEBHOOK',
      status: 'SUCCESS',
      startedAt: '2026-02-16T19:29:59.500Z',
      completedAt: '2026-02-16T19:30:00.000Z',
      durationMs: 500,
      fetched: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      requestId: 'req_rzp_hook_104',
      createdAt: '2026-02-16T19:30:00.000Z'
    }
  ];

  const auditLogs: AuditLogDoc[] = [
    {
      _id: 'aud_1',
      userId: 'usr_superadmin',
      userName: 'Priyanshu Agrawal',
      userEmail: 'shivamshishodia5541@gmail.com',
      role: 'SUPER_ADMIN',
      action: 'LOGIN',
      module: 'auth',
      entity: 'session',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: '2026-02-16T19:00:00.000Z'
    },
    {
      _id: 'aud_2',
      userId: 'usr_admin_inventory',
      userName: 'Anjali Verma (Store Head)',
      userEmail: 'inventory@360crm.com',
      role: 'STORE_EMPLOYEE',
      action: 'STOCK_IN',
      module: 'inventory',
      entity: 'StockTransaction',
      entityId: 'stk_tx_1',
      newData: { product: 'Seamless CS Pipe SCH 40 3"', quantity: 200, warehouse: 'Main Plant Warehouse (Unit 1)' },
      ipAddress: '192.168.1.104',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-01-27T16:00:00.000Z'
    },
    {
      _id: 'aud_3',
      userId: 'usr_admin_sales',
      userName: 'Vikram Mehta (Sales Admin)',
      userEmail: 'sales@360crm.com',
      role: 'SALES_EMPLOYEE',
      action: 'CREATE',
      module: 'quotations',
      entity: 'Quotation',
      entityId: 'quot_1',
      newData: { quotationNumber: 'QT-2026-0041', customer: 'Shree Cement Infrastructure Corp', total: 200659 },
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-02-01T10:00:00.000Z'
    },
    {
      _id: 'aud_4',
      userId: 'usr_admin_main',
      userName: 'Rohan Sharma (Admin)',
      userEmail: 'admin@360crm.com',
      role: 'ADMIN',
      action: 'UPDATE',
      module: 'sales_orders',
      entity: 'SalesOrder',
      entityId: 'so_1',
      newData: { status: 'APPROVED' },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-02-03T11:30:00.000Z'
    }
  ];

  const callLogs: CallLogDoc[] = [
    {
      _id: 'call_1',
      leadId: 'lead_1',
      leadName: 'Rajesh Agrawal',
      leadPhone: '+91 98250 11223',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      direction: 'OUTBOUND',
      durationSeconds: 145,
      outcome: 'INTERESTED',
      notes: 'Discussed requirements for 100 units of SS Ball Valves for chemical plant revamp. Client requested 8% commercial discount on batch order.',
      recordingName: 'rec_lead1_valves_discussion.wav',
      followUpDate: '2026-02-20',
      followUpNotes: 'Send revised formal quotation with expedited dispatch commitment',
      timestamp: '2026-02-16T11:45:00.000Z',
      createdAt: '2026-02-16T11:45:00.000Z'
    },
    {
      _id: 'call_2',
      leadId: 'lead_2',
      leadName: 'Pooja Hegde',
      leadPhone: '+91 94140 88776',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      direction: 'OUTBOUND',
      durationSeconds: 88,
      outcome: 'FOLLOWUP_REQUESTED',
      notes: 'Purchase head requested latest 2026 stainless steel fittings technical datasheet and GST invoice sample via WhatsApp.',
      recordingName: 'rec_lead2_catalog_inquiry.wav',
      followUpDate: '2026-02-18',
      followUpNotes: 'Share brochure link on WhatsApp and confirm management approval',
      timestamp: '2026-02-16T14:10:00.000Z',
      createdAt: '2026-02-16T14:10:00.000Z'
    },
    {
      _id: 'call_arjun_1',
      leadId: 'lead_emp_1',
      leadName: 'Vikramaditya Solanki',
      leadPhone: '+91 98240 77112',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      direction: 'OUTBOUND',
      durationSeconds: 210,
      outcome: 'INTERESTED',
      notes: 'Customer confirmed requirement of 30 pcs of SS-316 2" ball valves for chemical batch line. Requested official quote with test certs.',
      recordingName: 'rec_solanki_chem_valve_quote.wav',
      recordingUrl: 'mock_audio_rec_solanki.wav',
      followUpDate: '2026-02-17',
      followUpNotes: 'Call plant engineer to finalize flange standards',
      timestamp: '2026-02-16T11:20:00.000Z',
      createdAt: '2026-02-16T11:20:00.000Z'
    },
    {
      _id: 'call_arjun_2',
      leadId: 'lead_emp_2',
      leadName: 'Sunita Sharma',
      leadPhone: '+91 94140 33221',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      direction: 'INBOUND',
      durationSeconds: 95,
      outcome: 'CONNECTED',
      notes: 'Inquired about dispatch transit time to Jaipur factory. Promised 48hr turnaround from Unit 1 Ahmedabad.',
      recordingName: 'rec_jaipur_distilleries_dispatch.wav',
      recordingUrl: 'mock_audio_rec_jaipur.wav',
      timestamp: '2026-02-16T14:45:00.000Z',
      createdAt: '2026-02-16T14:45:00.000Z'
    }
  ];

  const leaves: LeaveDoc[] = [
    {
      _id: 'lev_1',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      leaveType: 'CASUAL',
      startDate: '2026-01-22',
      endDate: '2026-01-23',
      totalDays: 2,
      reason: 'Family function in native town',
      status: 'APPROVED',
      approvedBy: 'Rohan Sharma (Admin)',
      appliedAt: '2026-01-18T10:00:00.000Z',
      createdAt: '2026-01-18T10:00:00.000Z'
    },
    {
      _id: 'lev_2',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      leaveType: 'SICK',
      startDate: '2026-02-09',
      endDate: '2026-02-09',
      totalDays: 1,
      reason: 'Viral fever & medical rest',
      status: 'APPROVED',
      approvedBy: 'Neha Kapoor (HR)',
      appliedAt: '2026-02-09T08:30:00.000Z',
      createdAt: '2026-02-09T08:30:00.000Z'
    }
  ];

  const tasks: TaskDoc[] = [
    {
      _id: 'tsk_1',
      title: 'Dispatch Material Test Certificates to Solanki Chemical',
      description: 'Collect signed metallurgical lab test certificates from Quality Dept and email to purchase head',
      assignedTo: 'Arjun Singh',
      assignedToId: 'emp_arjun',
      priority: 'HIGH',
      dueDate: '2026-02-18',
      status: 'IN_PROGRESS',
      relatedTo: 'Lead: Vikramaditya Solanki',
      createdBy: 'Rohan Sharma (Admin)',
      createdAt: '2026-02-15T10:00:00.000Z'
    },
    {
      _id: 'tsk_2',
      title: 'Submit Monthly Sales Territory Velocity Report',
      description: 'Prepare summary of Gujarat industrial corridor inquiries and quotation closing ratios',
      assignedTo: 'Arjun Singh',
      assignedToId: 'emp_arjun',
      priority: 'MEDIUM',
      dueDate: '2026-02-28',
      status: 'PENDING',
      relatedTo: 'Monthly Review',
      createdBy: 'Rohan Sharma (Admin)',
      createdAt: '2026-02-16T09:00:00.000Z'
    }
  ];

  const messages: MessageDoc[] = [
    {
      _id: 'msg_1',
      leadId: 'lead_emp_1',
      recipientName: 'Vikramaditya Solanki',
      recipientPhone: '+91 98240 77112',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      message: 'Respected Solanki ji, Greetings from Shiv Shakti Enterprises! As requested on call, please find our ISO certified valve catalog link: https://shivshakticrm.in/catalog/valves2026.pdf',
      messageType: 'WHATSAPP',
      direction: 'OUTBOUND',
      status: 'DELIVERED',
      timestamp: '2026-02-16T11:25:00.000Z',
      createdAt: '2026-02-16T11:25:00.000Z'
    },
    {
      _id: 'msg_2',
      leadId: 'lead_emp_2',
      recipientName: 'Sunita Sharma',
      recipientPhone: '+91 94140 33221',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      message: 'Hello Sunita Ma\'am, we have ready dispatch stock of 40 units SS-316 valves at our Ahmedabad plant. Formal quote sent to your email.',
      messageType: 'WHATSAPP',
      direction: 'OUTBOUND',
      status: 'READ',
      timestamp: '2026-02-16T15:10:00.000Z',
      createdAt: '2026-02-16T15:10:00.000Z'
    }
  ];

  const activityTimeline: ActivityTimelineDoc[] = [
    {
      _id: 'act_1',
      leadId: 'lead_emp_1',
      employeeId: 'usr_employee_arjun',
      employeeName: 'Arjun Singh',
      activityType: 'ASSIGNED',
      description: 'Lead assigned to Arjun Singh by Sales Dispatch Router',
      timestamp: '2026-02-10T10:00:00.000Z'
    },
    {
      _id: 'act_2',
      leadId: 'lead_emp_1',
      employeeId: 'usr_employee_arjun',
      employeeName: 'Arjun Singh',
      activityType: 'CALL_MADE',
      description: 'Outbound Discovery Call (3m 30s) - Client requested SS-316 flanged valves quotation',
      timestamp: '2026-02-16T11:20:00.000Z'
    },
    {
      _id: 'act_3',
      leadId: 'lead_emp_1',
      employeeId: 'usr_employee_arjun',
      employeeName: 'Arjun Singh',
      activityType: 'RECORDING_ATTACHED',
      description: 'Voice call recording rec_solanki_chem_valve_quote.wav attached to lead profile',
      timestamp: '2026-02-16T11:22:00.000Z'
    },
    {
      _id: 'act_4',
      leadId: 'lead_emp_1',
      employeeId: 'usr_employee_arjun',
      employeeName: 'Arjun Singh',
      activityType: 'MESSAGE_SENT',
      description: 'WhatsApp catalog brochure sent to +91 98240 77112',
      timestamp: '2026-02-16T11:25:00.000Z'
    }
  ];

  const notifications: NotificationDoc[] = [
    {
      _id: 'not_1',
      userId: 'usr_employee_arjun',
      title: 'New Lead Assigned',
      message: 'Ramesh Choudhary from Marwar Steel & Rolling Mills has been assigned to you.',
      type: 'LEAD_ASSIGNED',
      isRead: false,
      createdAt: '2026-02-16T09:30:00.000Z'
    },
    {
      _id: 'not_2',
      userId: 'usr_employee_arjun',
      title: 'Follow-up Reminder',
      message: 'Call scheduled with Vikramaditya Solanki (Solanki Chem) today at 11:30 AM.',
      type: 'FOLLOWUP_REMINDER',
      isRead: false,
      createdAt: '2026-02-16T09:00:00.000Z'
    },
    {
      _id: 'not_3',
      userId: 'usr_employee_arjun',
      title: 'Salary Credited',
      message: 'January 2026 salary slip of ₹43,400 has been processed and credited to your account.',
      type: 'SALARY_PUBLISHED',
      isRead: true,
      createdAt: '2026-02-01T10:00:00.000Z'
    }
  ];

  const activitySessions: ActivitySessionDoc[] = [
    {
      _id: 'act_sess_1',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      attendanceId: 'att_arjun_today',
      date: new Date().toISOString().split('T')[0],
      deviceId: 'dev_arjun_win11',
      deviceName: 'DESKTOP-ARJUN-W11',
      applicationName: 'Google Chrome',
      windowTitle: '360CRM - Enterprise Workspace & Calling Hub',
      category: 'WORK',
      startedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      durationSeconds: 5400,
      activeSeconds: 4800,
      idleSeconds: 600,
      isIdle: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'act_sess_2',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      attendanceId: 'att_arjun_today',
      date: new Date().toISOString().split('T')[0],
      deviceId: 'dev_arjun_win11',
      deviceName: 'DESKTOP-ARJUN-W11',
      applicationName: 'Visual Studio Code',
      windowTitle: '360project - Client CRM Integration',
      category: 'WORK',
      startedAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      durationSeconds: 5400,
      activeSeconds: 5100,
      idleSeconds: 300,
      isIdle: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'act_sess_3',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      attendanceId: 'att_arjun_today',
      date: new Date().toISOString().split('T')[0],
      deviceId: 'dev_arjun_win11',
      deviceName: 'DESKTOP-ARJUN-W11',
      applicationName: 'Microsoft Excel',
      windowTitle: 'Q3_Sales_Invoices_Pipeline.xlsx',
      category: 'WORK',
      startedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 3600,
      activeSeconds: 3200,
      idleSeconds: 400,
      isIdle: false,
      createdAt: new Date().toISOString()
    }
  ];

  const devices: DeviceDoc[] = [
    {
      _id: 'dev_1',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      deviceId: 'dev_arjun_win11',
      deviceName: 'DESKTOP-ARJUN-W11',
      os: 'Windows 11 Pro 64-bit',
      platform: 'win32',
      agentVersion: '1.0.0',
      status: 'ONLINE',
      lastSeenAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'dev_2',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      deviceId: 'dev_vikram_dell',
      deviceName: 'LAPTOP-VIKRAM-DELL',
      os: 'Windows 10 Enterprise',
      platform: 'win32',
      agentVersion: '1.0.0',
      status: 'ONLINE',
      lastSeenAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: '2026-01-15T09:00:00.000Z',
      updatedAt: new Date().toISOString()
    }
  ];

  // ==========================================
  // ENTERPRISE EMPLOYEE TRACKING & GEOFENCING SEEDS
  // ==========================================

  const geofences: GeofenceDoc[] = [
    {
      _id: 'geo_noida_hq',
      name: 'Noida Corporate Office',
      code: 'HQ-NOIDA',
      category: 'OFFICE',
      latitude: 28.6139,
      longitude: 77.2090,
      radiusMeters: 250,
      address: 'Plot B-14, Sector 63, Noida, Uttar Pradesh 201301',
      city: 'Noida',
      state: 'Uttar Pradesh',
      assignedDepartments: ['Sales', 'HR', 'Management', 'Accounts'],
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'geo_delhi_hub',
      name: 'Delhi Logistics Depot & Warehouse',
      code: 'WH-DELHI',
      category: 'WAREHOUSE',
      latitude: 28.5355,
      longitude: 77.3910,
      radiusMeters: 200,
      address: 'Okhla Industrial Area Phase-2, New Delhi 110020',
      city: 'New Delhi',
      state: 'Delhi',
      assignedDepartments: ['Store', 'Technical'],
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'geo_ahmedabad_plant',
      name: 'Ahmedabad Manufacturing Plant',
      code: 'PLANT-AHMD',
      category: 'OFFICE',
      latitude: 23.0225,
      longitude: 72.5714,
      radiusMeters: 300,
      address: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445',
      city: 'Ahmedabad',
      state: 'Gujarat',
      assignedDepartments: ['Store', 'Technical', 'Management'],
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      _id: 'geo_shree_cement_site',
      name: 'Shree Cement Infrastructure Site',
      code: 'CLI-SHREE',
      category: 'CLIENT_SITE',
      latitude: 28.5480,
      longitude: 77.3750,
      radiusMeters: 350,
      address: 'Industrial Plot 8, Sector 132, Noida Expressway',
      city: 'Noida',
      state: 'Uttar Pradesh',
      assignedDepartments: ['Sales', 'Technical'],
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z'
    },
    {
      _id: 'geo_tata_chem_site',
      name: 'Tata Chemical & Fertilizers Site',
      code: 'CLI-TATA',
      category: 'CLIENT_SITE',
      latitude: 28.6250,
      longitude: 77.2200,
      radiusMeters: 200,
      address: 'Barakhamba Rd, Connaught Place, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      assignedDepartments: ['Sales', 'Accounts'],
      alertOnEntry: true,
      alertOnExit: true,
      enabled: true,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    }
  ];

  const trackingPolicies: TrackingPolicyDoc[] = [
    {
      _id: 'tracking_policy_config',
      enabled: true,
      trackingMode: 'WORKING_HOURS',
      updateFrequencySeconds: 60,
      stationaryFrequencySeconds: 300,
      minAcceptableAccuracyMeters: 100,
      maxAllowableSpeedKmh: 140,
      stopRadiusMeters: 60,
      stopMinDurationMinutes: 10,
      storeRouteHistory: true,
      routeRetentionDays: 30,
      enableGeofencing: true,
      notifyEmployeeWhenTracking: true,
      requireEmployeeConsent: true,
      allowOfflineQueue: true,
      maxOfflineQueueItems: 50,
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: 'Rohan Sharma (Admin)'
    }
  ];

  const latestLocations: LatestLocationDoc[] = [
    {
      _id: 'loc_latest_emp_arjun',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      employeeCode: 'EMP-007',
      department: 'Sales',
      designation: 'Senior Sales & Field Representative',
      phone: '+91 98765 00112',
      latitude: 28.5480,
      longitude: 77.3750,
      accuracy: 14,
      speed: 0,
      speedKmh: 0,
      heading: 145,
      batteryLevel: 84,
      isCharging: false,
      trackingStatus: 'ONLINE',
      workLocationType: 'CLIENT_SITE',
      currentGeofenceId: 'geo_shree_cement_site',
      currentGeofenceName: 'Shree Cement Infrastructure Site',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 8400,
      address: 'Industrial Plot 8, Sector 132, Noida Expressway',
      lastRecordedAt: new Date(Date.now() - 35000).toISOString(),
      lastReceivedAt: new Date(Date.now() - 30000).toISOString(),
      distanceTodayKm: 18.6,
      currentStopDurationMinutes: 24,
      stoppedSince: new Date(Date.now() - 24 * 60000).toISOString(),
      deviceId: 'dev_arjun_pixel',
      platform: 'Android 14 / Chrome Mobile',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'loc_latest_emp_1',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      employeeCode: 'EMP-0101',
      department: 'Sales',
      designation: 'Senior Sales Executive',
      phone: '+91 98234 56789',
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 12,
      speed: 0,
      speedKmh: 0,
      heading: 0,
      batteryLevel: 92,
      isCharging: true,
      trackingStatus: 'ONLINE',
      workLocationType: 'OFFICE',
      currentGeofenceId: 'geo_noida_hq',
      currentGeofenceName: 'Noida Corporate Office',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 35,
      address: 'Plot B-14, Sector 63, Noida, Uttar Pradesh',
      lastRecordedAt: new Date(Date.now() - 20000).toISOString(),
      lastReceivedAt: new Date(Date.now() - 15000).toISOString(),
      distanceTodayKm: 4.2,
      deviceId: 'dev_vikram_dell',
      platform: 'Windows 11 / Chrome Desktop',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'loc_latest_emp_2',
      employeeId: 'emp_2',
      employeeName: 'Anjali Verma',
      employeeCode: 'EMP-0102',
      department: 'Store',
      designation: 'Inventory & Dispatch Manager',
      phone: '+91 98345 67890',
      latitude: 28.5355,
      longitude: 77.3910,
      accuracy: 15,
      speed: 0,
      speedKmh: 0,
      heading: 270,
      batteryLevel: 76,
      isCharging: false,
      trackingStatus: 'ONLINE',
      workLocationType: 'OFFICE',
      currentGeofenceId: 'geo_delhi_hub',
      currentGeofenceName: 'Delhi Logistics Depot & Warehouse',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 28,
      address: 'Okhla Industrial Area Phase-2, New Delhi',
      lastRecordedAt: new Date(Date.now() - 45000).toISOString(),
      lastReceivedAt: new Date(Date.now() - 40000).toISOString(),
      distanceTodayKm: 2.1,
      deviceId: 'dev_anjali_samsung',
      platform: 'Android 13 / Chrome Mobile',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'loc_latest_emp_3',
      employeeId: 'emp_3',
      employeeName: 'Suresh Patel',
      employeeCode: 'EMP-0103',
      department: 'Accounts',
      designation: 'Chief Accounts Officer',
      phone: '+91 98456 78901',
      latitude: 28.6250,
      longitude: 77.2200,
      accuracy: 18,
      speed: 0,
      speedKmh: 0,
      heading: 90,
      batteryLevel: 62,
      isCharging: false,
      trackingStatus: 'STOPPED',
      workLocationType: 'FIELD',
      currentGeofenceId: 'geo_tata_chem_site',
      currentGeofenceName: 'Tata Chemical & Fertilizers Site',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 2400,
      address: 'Barakhamba Rd, Connaught Place, New Delhi',
      lastRecordedAt: new Date(Date.now() - 110000).toISOString(),
      lastReceivedAt: new Date(Date.now() - 100000).toISOString(),
      distanceTodayKm: 9.8,
      currentStopDurationMinutes: 35,
      stoppedSince: new Date(Date.now() - 35 * 60000).toISOString(),
      deviceId: 'dev_suresh_oneplus',
      platform: 'Android 14 / Edge Mobile',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'loc_latest_emp_4',
      employeeId: 'emp_4',
      employeeName: 'Neha Kapoor',
      employeeCode: 'EMP-0104',
      department: 'HR',
      designation: 'Lead Human Resources',
      phone: '+91 98567 89012',
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10,
      speed: 0,
      speedKmh: 0,
      heading: 0,
      batteryLevel: 88,
      isCharging: true,
      trackingStatus: 'ONLINE',
      workLocationType: 'OFFICE',
      currentGeofenceId: 'geo_noida_hq',
      currentGeofenceName: 'Noida Corporate Office',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 15,
      address: 'Plot B-14, Sector 63, Noida, Uttar Pradesh',
      lastRecordedAt: new Date(Date.now() - 18000).toISOString(),
      lastReceivedAt: new Date(Date.now() - 12000).toISOString(),
      distanceTodayKm: 1.5,
      deviceId: 'dev_neha_mac',
      platform: 'macOS / Safari Desktop',
      updatedAt: new Date().toISOString()
    }
  ];

  const locationHistory: LocationHistoryDoc[] = [
    {
      _id: 'hist_arjun_1',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10,
      speed: 0,
      speedKmh: 0,
      heading: 0,
      batteryLevel: 98,
      recordedAt: '2026-08-29T09:28:00.000Z',
      receivedAt: '2026-08-29T09:28:02.000Z',
      source: 'GPS',
      geofenceId: 'geo_noida_hq',
      geofenceName: 'Noida Corporate Office',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 0,
      address: 'Noida Corporate Office, Sector 63'
    },
    {
      _id: 'hist_arjun_2',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      latitude: 28.6010,
      longitude: 77.2350,
      accuracy: 12,
      speed: 8.5,
      speedKmh: 30.6,
      heading: 135,
      batteryLevel: 96,
      recordedAt: '2026-08-29T10:15:00.000Z',
      receivedAt: '2026-08-29T10:15:02.000Z',
      source: 'GPS',
      isInsideGeofence: false,
      distanceFromOfficeMeters: 2800,
      address: 'Noida Greater Noida Link Rd'
    },
    {
      _id: 'hist_arjun_3',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      latitude: 28.5750,
      longitude: 77.3100,
      accuracy: 15,
      speed: 12.2,
      speedKmh: 43.9,
      heading: 150,
      batteryLevel: 92,
      recordedAt: '2026-08-29T10:45:00.000Z',
      receivedAt: '2026-08-29T10:45:03.000Z',
      source: 'GPS',
      isInsideGeofence: false,
      distanceFromOfficeMeters: 5600,
      address: 'Near Sector 93 Flyover'
    },
    {
      _id: 'hist_arjun_4',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      latitude: 28.5480,
      longitude: 77.3750,
      accuracy: 14,
      speed: 0,
      speedKmh: 0,
      heading: 145,
      batteryLevel: 84,
      recordedAt: '2026-08-29T11:20:00.000Z',
      receivedAt: '2026-08-29T11:20:02.000Z',
      source: 'GPS',
      geofenceId: 'geo_shree_cement_site',
      geofenceName: 'Shree Cement Infrastructure Site',
      isInsideGeofence: true,
      distanceFromOfficeMeters: 8400,
      isStop: true,
      stopDurationMinutes: 24,
      address: 'Industrial Plot 8, Sector 132, Noida Expressway'
    }
  ];

  const geofenceEvents: GeofenceEventDoc[] = [
    {
      _id: 'geve_1',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      geofenceId: 'geo_noida_hq',
      geofenceName: 'Noida Corporate Office',
      eventType: 'ENTER',
      timestamp: '2026-08-29T09:27:00.000Z',
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10
    },
    {
      _id: 'geve_2',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      geofenceId: 'geo_noida_hq',
      geofenceName: 'Noida Corporate Office',
      eventType: 'EXIT',
      timestamp: '2026-08-29T10:05:00.000Z',
      durationMinutes: 38,
      latitude: 28.6145,
      longitude: 77.2115,
      accuracy: 12
    },
    {
      _id: 'geve_3',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      geofenceId: 'geo_shree_cement_site',
      geofenceName: 'Shree Cement Infrastructure Site',
      eventType: 'ENTER',
      timestamp: '2026-08-29T11:18:00.000Z',
      latitude: 28.5480,
      longitude: 77.3750,
      accuracy: 14
    }
  ];

  const dailyTrackingSummaries: DailyTrackingSummaryDoc[] = [
    {
      _id: 'sum_emp_arjun_2026-08-29',
      employeeId: 'emp_arjun',
      employeeName: 'Arjun Singh',
      department: 'Sales',
      date: '2026-08-29',
      checkInTime: '09:28 AM',
      totalWorkingMinutes: 380,
      totalTrackedMinutes: 375,
      totalFieldMinutes: 240,
      totalOfficeMinutes: 38,
      totalStopMinutes: 45,
      totalDistanceKm: 18.6,
      geofenceVisitsCount: 2,
      stopsCount: 2,
      firstLocationTime: '09:28 AM',
      lastLocationTime: '03:45 PM',
      firstLocationAddress: 'Noida Corporate Office, Sector 63',
      lastLocationAddress: 'Industrial Plot 8, Sector 132, Noida Expressway',
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'sum_emp_1_2026-08-29',
      employeeId: 'emp_1',
      employeeName: 'Vikram Mehta',
      department: 'Sales',
      date: '2026-08-29',
      checkInTime: '09:15 AM',
      totalWorkingMinutes: 390,
      totalTrackedMinutes: 385,
      totalFieldMinutes: 0,
      totalOfficeMinutes: 385,
      totalStopMinutes: 0,
      totalDistanceKm: 4.2,
      geofenceVisitsCount: 1,
      stopsCount: 0,
      firstLocationTime: '09:15 AM',
      lastLocationTime: '03:45 PM',
      firstLocationAddress: 'Noida Corporate Office, Sector 63',
      lastLocationAddress: 'Noida Corporate Office, Sector 63',
      updatedAt: new Date().toISOString()
    }
  ];

  const trackingAlerts: TrackingAlertDoc[] = [
    {
      _id: 'tr_alt_1',
      employeeId: 'emp_3',
      employeeName: 'Suresh Patel',
      type: 'OUTSIDE_GEOFENCE',
      severity: 'LOW',
      message: 'Suresh Patel is currently at external location (Connaught Place). Stop duration: 35 min.',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      acknowledged: false
    }
  ];

  return {
    users,
    roles,
    permissions: ALL_PERMISSIONS,
    leads,
    customers,
    followUps,
    products,
    categories,
    warehouses,
    stockTransactions,
    suppliers,
    purchases,
    quotations,
    salesOrders,
    invoices,
    payments,
    expenses,
    creditNotes,
    employees,
    attendance,
    activitySessions,
    devices,
    salaries,
    performance,
    campaigns,
    leadSources,
    integrations,
    integrationLogs,
    auditLogs,
    callLogs,
    leaves,
    tasks,
    messages,
    activityTimeline,
    notifications,
    attendanceSettings: [
      {
        _id: 'attendance_security_config',
        requireSelfie: true,
        requireLocation: true,
        requireSelfieClockIn: true,
        requireLocationClockIn: true,
        requireSelfieClockOut: false,
        requireLocationClockOut: false,
        desktopTrackingEnabled: true,
        trackActiveApplications: true,
        trackIdleTime: true,
        idleThresholdMinutes: 5,
        activityDetectionIntervalSeconds: 5,
        activitySyncIntervalSeconds: 30,
        allowOfflineTracking: true,
        maxGpsAccuracyMeters: 100,
        allowedLocations: [
          {
            id: 'loc_main_office',
            name: 'Craft Media Hub Head Office',
            lat: 28.606469,
            lng: 77.430023,
            radiusMeters: 2500,
            maxAccuracyMeters: 300,
            address: 'Craft Media Hub, 28.606469, 77.430023 (Noida Extension)',
            enabled: true
          },
          {
            id: 'loc_noida_hq',
            name: 'Noida Corporate Office',
            lat: 28.6139,
            lng: 77.2090,
            radiusMeters: 250,
            maxAccuracyMeters: 50,
            address: 'Plot B-14, Sector 63, Noida, Uttar Pradesh 201301',
            enabled: true
          },
          {
            id: 'loc_delhi_branch',
            name: 'Delhi Regional Office & Warehouse',
            lat: 28.5355,
            lng: 77.3910,
            radiusMeters: 200,
            maxAccuracyMeters: 50,
            address: 'Okhla Industrial Area Phase-2, New Delhi 110020',
            enabled: true
          },
          {
            id: 'loc_ahmedabad_facility',
            name: 'Ahmedabad Manufacturing Plant',
            lat: 23.0225,
            lng: 72.5714,
            radiusMeters: 300,
            maxAccuracyMeters: 50,
            address: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445',
            enabled: true
          }
        ],
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ] as AttendanceSettingsDoc[],
    latestLocations,
    locationHistory,
    geofences,
    geofenceEvents,
    trackingPolicies,
    dailyTrackingSummaries,
    trackingAlerts
  };
}

