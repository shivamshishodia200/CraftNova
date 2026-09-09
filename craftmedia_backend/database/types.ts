export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES_EMPLOYEE' | 'STORE_EMPLOYEE' | 'ACCOUNTANT' | 'HR_EMPLOYEE' | 'EMPLOYEE' | 'SALES_REP' | string;

export interface UserDoc {
  _id: string;
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: RoleType;
  roleId?: string;
  permissions?: string[];
  customPermissions?: string[]; // Overrides or specific grants
  permissionMode?: 'ROLE' | 'REPLACE';
  showLoginCredentials?: boolean; // Controls whether the login email is shown in admin directory views
  showOnLogin?: boolean; // Controls whether this account appears in the login quick-access list
  organizationId?: string | null;
  organization?: string;
  department?: string;
  designation?: string;
  isPrimaryAdmin?: boolean;
  mustChangePassword?: boolean;
  tokenInvalidBefore?: string;
  lastPasswordResetAt?: string;
  failedLoginCount?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrganizationBranding {
  companyName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  surfaceColor?: string;
  sidebarBackground: string;
  sidebarTextColor?: string;
  sidebarActiveColor?: string;
  headerBackground?: string;
  headerTextColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  loginBackgroundUrl?: string;
  loginGradientStart?: string;
  loginGradientEnd?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  footerText?: string;
  borderRadius?: string;
  brandingVersion?: number;
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM' | 'CUSTOM';
}

export interface OrganizationFeatures {
  dashboard?: boolean;
  crm?: {
    leads?: boolean;
    customers?: boolean;
    followUps?: boolean;
  };
  sales?: {
    quotations?: boolean;
    salesOrders?: boolean;
    reports?: boolean;
  };
  inventory?: {
    products?: boolean;
    categories?: boolean;
    warehouses?: boolean;
    stockInOut?: boolean;
    purchases?: boolean;
    suppliers?: boolean;
  };
  accounts?: {
    invoices?: boolean;
    payments?: boolean;
    expenses?: boolean;
    creditNotes?: boolean;
    reports?: boolean;
  };
  hr?: {
    employees?: boolean;
    attendance?: boolean;
    liveTracking?: boolean;
    workRecording?: boolean;
    leave?: boolean;
    salary?: boolean;
    performance?: boolean;
  };
  marketing?: {
    campaigns?: boolean;
    tradeIndia?: boolean;
    whatsApp?: boolean;
    reports?: boolean;
  };
  integrations?: boolean;
  reports?: boolean;
  [key: string]: any;
}

export interface OrganizationSubscription {
  plan?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  maxEmployees?: number;
  maxAdmins?: number;
  storageLimitGB?: number;
  recordingStorageGB?: number;
  maxMonthlyLeads?: number;
  expiresAt?: string;
}

export interface OrganizationDoc {
  _id: string;
  name: string;
  slug: string;
  clientCode: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'INACTIVE';
  contactEmail: string;
  contactPhone?: string;
  branding: OrganizationBranding;
  features: OrganizationFeatures;
  subscription?: OrganizationSubscription;
  settings?: Record<string, any>;
  adminCount?: number;
  employeeCount?: number;
  storageUsedBytes?: number;
  brandingVersion?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDoc {
  _id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDoc {
  _id: string;
  module: string;
  action: string;
  code: string; // e.g. 'leads.view'
  name: string;
  description: string;
  category: string;
}

export interface LeadDoc {
  _id: string;
  organizationId?: string | null;
  leadCode?: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  source: string; // 'Website' | 'TradeIndia' | 'IndiaMART' | 'WhatsApp' | 'Referral' | 'Google' | 'Manual'
  channel?: string; // 'B2B Portal' | 'Website' | 'Direct' | 'Campaign' | string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CONVERTED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  leadScore?: number;
  stage?: string;
  assignedTo?: string; // User ID or Name
  assignedToId?: string;
  estimatedValue: number;
  probability?: number;
  city?: string;
  state?: string;
  country?: string;
  productName?: string;
  requirement?: string;
  quantity?: number | string;
  sourceLeadId?: string; // Unique external Lead ID (e.g. TradeIndia generated_id / lead_id)
  externalLeadId?: string;
  rawSourceData?: any;
  convertedCustomerId?: string;
  convertedQuotationId?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDoc {
  _id: string;
  organizationId?: string | null;
  customerCode?: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  gstNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  address: {
    street?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
  };
  billingAddress?: {
    street?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
  };
  shippingAddress?: {
    street?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
  };
  assignedTo?: string;
  totalOrdersCount: number;
  totalSpent: number;
  outstandingBalance?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpDoc {
  _id: string;
  leadId?: string;
  customerId?: string;
  leadName?: string;
  customerName?: string;
  type: 'Call' | 'Meeting' | 'WhatsApp' | 'Email' | 'Task' | 'Reminder';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description?: string;
  scheduledAt: string;
  completedAt?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  assignedTo: string;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDoc {
  _id: string;
  name: string;
  source?: string;
  type?: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  leadsGenerated: number;
  conversions: number;
  revenueGenerated?: number;
  roi?: number;
  targetAudience?: string;
  description?: string;
  createdBy?: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  updatedAt?: string;
}

export interface LeadSourceDoc {
  _id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'INACTIVE';
  leadsCount: number;
  conversionRate: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductDoc {
  _id: string;
  organizationId?: string | null;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  categoryId?: string;
  unit: string; // 'Pcs' | 'Kg' | 'Mtr' | 'Box' | 'Ltr' | 'Set'
  purchasePrice: number;
  sellingPrice: number;
  taxPercent?: number;
  taxRate?: number;
  currentStock: number;
  minStock?: number;
  minStockLevel?: number;
  maxStock?: number;
  warehouseId?: string;
  warehouseName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDoc {
  _id: string;
  name: string;
  code?: string;
  parentId?: string;
  description?: string;
  productsCount?: number;
  createdAt: string;
}

export interface WarehouseDoc {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  manager?: string;
  contactPerson?: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  capacityUsage?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StockTransactionDoc {
  _id: string;
  productId: string;
  productName: string;
  sku?: string;
  warehouseId: string;
  warehouseName?: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'PURCHASE_RECEIVE' | 'SALES_FULFILL';
  quantity: number;
  previousStock?: number;
  newStock?: number;
  unitPrice?: number;
  totalAmount?: number;
  performedBy?: string;
  date?: string;
  notes?: string;
  referenceType: 'MANUAL' | 'PURCHASE' | 'SALES_ORDER' | 'RETURN' | 'DAMAGE' | 'INITIAL';
  referenceId?: string;
  reason?: string;
  supplierId?: string;
  supplierName?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface SupplierDoc {
  _id: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone: string;
  email: string;
  gstNumber?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  country?: string;
  paymentTerms: string;
  balancePayable?: number;
  outstandingBalance?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
  taxRate?: number;
  discountPercent?: number;
  total: number;
}

export interface PurchaseDoc {
  _id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId?: string;
  warehouseName?: string;
  purchaseDate?: string;
  date?: string;
  expectedDate?: string;
  items: PurchaseItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount?: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  receivedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
  taxRate?: number;
  discountPercent?: number;
  total: number;
}

export interface QuotationDoc {
  _id: string;
  quotationNumber: string;
  version?: number;
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'APPROVED' | 'EXPIRED';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  convertedSalesOrderId?: string;
  termsAndConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesOrderDoc {
  _id: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  quotationId?: string;
  quotationNumber?: string;
  orderDate: string;
  expectedDelivery: string;
  items: QuotationItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  stage?: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  warehouseId?: string;
  warehouseName?: string;
  deliveryAddress?: string;
  trackingNumber?: string;
  transporterName?: string;
  isInvoiced: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
  taxRate?: number;
  total: number;
}

export interface InvoiceDoc {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  salesOrderId?: string;
  invoiceDate?: string;
  date?: string;
  dueDate: string;
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  status?: string;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  paymentTerms?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentDoc {
  _id: string;
  paymentNumber: string;
  partyId?: string;
  partyName?: string;
  type?: 'INFLOW' | 'OUTFLOW' | string;
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  paymentMode?: string;
  paymentMethod?: 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'CHEQUE' | 'OTHER' | string;
  referenceNumber?: string;
  transactionReference?: string;
  paymentDate?: string;
  date?: string;
  notes?: string;
  receivedBy: string;
  createdAt: string;
}

export interface ExpenseDoc {
  _id: string;
  expenseNumber?: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Marketing' | 'Supplies' | 'Travel' | 'Maintenance' | 'Other' | string;
  title: string;
  amount: number;
  expenseDate?: string;
  date?: string;
  paymentMethod?: 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'CHEQUE' | string;
  paymentMode?: string;
  vendor?: string;
  description?: string;
  receiptUrl?: string;
  status?: string;
  recordedBy?: string;
  submittedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface CreditNoteDoc {
  _id: string;
  creditNoteNumber: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  amount: number;
  reason: string;
  items?: any[];
  date: string;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'ISSUED';
  createdBy?: string;
  createdAt: string;
}

export interface EmployeeDoc {
  _id: string;
  organizationId?: string | null;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: 'Sales' | 'Store' | 'Accounts' | 'HR' | 'Management' | 'Technical' | string;
  designation: string;
  joiningDate: string;
  salary: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
  userId?: string;
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifsc: string;
  };
  trackingEnabled?: boolean;
  trackingMode?: 'ATTENDANCE_ONLY' | 'WORKING_HOURS' | 'ACTIVE_SHIFT' | 'FIELD_ONLY' | 'MANUAL' | 'DEFAULT';
  locationConsent?: {
    status: 'GRANTED' | 'DENIED' | 'PENDING';
    grantedAt?: string;
    ipAddress?: string;
    policyVersion?: string;
  };
  isFieldEmployee?: boolean;
  assignedGeofenceIds?: string[];
  shiftStart?: string; // e.g. "09:30"
  shiftEnd?: string;   // e.g. "18:30"
  workingDays?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CallLogDoc {
  _id: string;
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  employeeId?: string;
  employeeName: string;
  direction: 'OUTBOUND' | 'INBOUND';
  durationSeconds: number;
  outcome: 'CONNECTED' | 'BUSY' | 'NO_ANSWER' | 'WRONG_NUMBER' | 'FOLLOWUP_REQUESTED' | 'INTERESTED' | 'CONVERTED' | 'NOT_INTERESTED';
  notes: string;
  recordingUrl?: string; // Audio Data URL / Base64 / MP3 URL
  recordingName?: string;
  followUpDate?: string;
  followUpNotes?: string;
  timestamp: string;
  createdAt?: string;
}

export interface AttendanceBreak {
  _id: string;
  start: string; // e.g. "01:00:00 PM"
  end?: string;   // e.g. "01:30:00 PM"
  durationMinutes?: number;
  reason?: string;
}

export interface VerificationStamp {
  selfieRequired?: boolean;
  selfieVerified?: boolean;
  selfieUrl?: string;
  locationRequired?: boolean;
  locationVerified?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  officeLocationId?: string;
  officeLocationName?: string;
  distanceFromOffice?: number;
  verifiedAt?: string;
}

export interface AttendanceDoc {
  _id: string;
  organizationId?: string | null;
  employeeId: string;
  employeeName: string;
  department?: string;
  date: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'ON_BREAK' | 'COMPLETED' | 'WORKING' | 'IDLE';
  remarks?: string;
  selfieCheckIn?: string;
  selfieCheckOut?: string;
  locationCheckIn?: {
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
    verifiedDistance?: number;
    matchedLocationName?: string;
  };
  locationCheckOut?: {
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
    verifiedDistance?: number;
    matchedLocationName?: string;
  };
  clockInVerification?: VerificationStamp;
  clockOutVerification?: VerificationStamp;
  breaks?: AttendanceBreak[];
  workHours?: number; // In hours (e.g. 7.5)
  totalAttendanceMinutes?: number;
  totalWorkingMinutes?: number;
  totalBreakMinutes?: number;
  totalActiveMinutes?: number;
  totalIdleMinutes?: number;
  activeRatio?: number; // e.g. 91.5%
  createdAt: string;
  updatedAt?: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number; // In meters e.g. 100
  maxAccuracyMeters?: number; // e.g. 50
  address?: string;
  enabled: boolean;
}

export interface AttendanceSettingsDoc {
  _id: string; // 'attendance_security_config' or `attendance_security_${orgId}`
  organizationId?: string | null;
  requireSelfie: boolean;
  requireLocation: boolean;
  requireSelfieClockIn: boolean;
  requireLocationClockIn: boolean;
  requireSelfieClockOut: boolean;
  requireLocationClockOut: boolean;
  desktopTrackingEnabled: boolean;
  trackActiveApplications: boolean;
  trackIdleTime: boolean;
  idleThresholdMinutes: number; // e.g. 5
  activityDetectionIntervalSeconds: number; // e.g. 5
  activitySyncIntervalSeconds: number; // e.g. 30
  allowOfflineTracking: boolean;
  maxGpsAccuracyMeters: number; // e.g. 100 meters
  allowedLocations: OfficeLocation[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type ActivityEventType =
  | 'APPLICATION'
  | 'ACTIVE'
  | 'IDLE'
  | 'BREAK'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'SCREEN_ON'
  | 'SCREEN_OFF'
  | 'LOCK'
  | 'UNLOCK'
  | 'SLEEP'
  | 'WAKE'
  | 'AGENT_START'
  | 'AGENT_STOP';

export interface ActivitySessionDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  date: string; // YYYY-MM-DD
  deviceId?: string;
  deviceName?: string;
  type?: ActivityEventType;
  status?: 'ACTIVE' | 'IDLE' | 'BREAK' | 'COMPLETED' | 'SYSTEM';
  applicationName: string;
  windowTitle?: string;
  category?: 'WORK' | 'COMMUNICATION' | 'BROWSING' | 'MEETING' | 'IDLE' | 'SYSTEM' | 'OTHER';
  startedAt: string; // ISO string
  endedAt: string;   // ISO string
  durationSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  isIdle: boolean;
  createdAt: string;
  syncedAt?: string;
}

export interface DeviceDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  deviceId: string;
  deviceName: string;
  os: string;
  platform: string;
  agentVersion: string;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  lastSeenAt: string;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "2026-08"
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: 'PENDING' | 'PROCESSED' | 'PAID';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface LeaveDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'CASUAL' | 'SICK' | 'PAID' | 'EMERGENCY' | 'UNPAID';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedAt: string;
  reviewedBy?: string;
  approvedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskDoc {
  _id: string;
  title: string;
  description: string;
  assignedTo: string; // User / Employee ID or Name
  assignedToId?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  relatedTo?: {
    type: 'LEAD' | 'CUSTOMER' | 'QUOTATION' | 'SALES_ORDER' | 'GENERAL';
    id: string;
    name: string;
  } | string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface MessageDoc {
  _id: string;
  leadId?: string;
  customerId?: string;
  recipientName?: string;
  recipientPhone: string;
  recipientEmail?: string;
  employeeId?: string;
  employeeName?: string;
  message?: string;
  content?: string;
  channel?: string;
  messageType?: 'WHATSAPP' | 'SMS' | 'EMAIL';
  direction?: 'OUTBOUND' | 'INBOUND';
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | string;
  deliveryStatus?: string;
  sentBy?: string;
  sentAt?: string;
  templateId?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface ActivityTimelineDoc {
  _id: string;
  organizationId?: string | null;
  leadId?: string;
  entityType?: string;
  entityId?: string;
  employeeId?: string;
  employeeName?: string;
  performedBy?: string;
  action?: string;
  type?: string;
  title?: string;
  activityType?: 'LEAD_CREATED' | 'ASSIGNED' | 'CALL_MADE' | 'RECORDING_ATTACHED' | 'MESSAGE_SENT' | 'FOLLOWUP_CREATED' | 'FOLLOWUP_COMPLETED' | 'QUOTATION_CREATED' | 'SALES_ORDER_CREATED' | 'STATUS_CHANGED' | 'NOTE_ADDED' | string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface NotificationDoc {
  _id: string;
  userId?: string;
  recipientId?: string;
  title: string;
  message: string;
  type: 'LEAD_ASSIGNED' | 'FOLLOWUP_REMINDER' | 'TASK_ASSIGNED' | 'LEAVE_STATUS' | 'SALARY_PUBLISHED' | 'ADMIN_ALERT' | string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PerformanceDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  reviewPeriod: string; // e.g. "Q2 2026"
  rating: number; // 1 to 5
  comments: string;
  goalsAchieved?: string;
  reviewerName: string;
  reviewDate: string;
  createdAt: string;
}

export interface AuditLogDoc {
  _id: string;
  organizationId?: string | null;
  userId: string;
  userName: string;
  userEmail?: string;
  role?: string;
  userRole?: string;
  action: string; // 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'PERMISSION_CHANGED' | 'ROLE_CHANGED' | 'STOCK_IN' | 'STOCK_OUT' | 'PURCHASE_RECEIVED' | 'INVOICE_CREATED' | 'PAYMENT_CREATED' | 'USER_CREATED' | 'USER_DISABLED' | string
  module: string;
  entity?: string;
  entityId?: string;
  description?: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  createdAt?: string;
}

export interface IntegrationDoc {
  _id: string;
  name: string;
  code: string; // 'tradeindia' | 'indiamart' | 'whatsapp' | 'website_webhook' | 'custom_rest_api' | 'razorpay' | 'stripe' | string
  provider?: string; // 'TradeIndia' | 'IndiaMART' | 'Website' | 'WhatsApp' | 'Razorpay' | 'Stripe' | 'Custom REST' | string
  category?: 'PORTAL' | 'WEBHOOK' | 'COMMUNICATION' | 'PAYMENT' | 'CUSTOM' | string;
  connectionMode?: 'POLLING' | 'WEBHOOK' | 'API' | 'HYBRID' | string;
  status: 'ACTIVE' | 'INACTIVE' | 'CONFIGURED' | 'ERROR' | 'PAUSED';
  endpointUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  authType?: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'NO_AUTH' | 'WEBHOOK_SECRET' | 'CUSTOM_HEADERS' | 'QUERY_PARAM' | string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  syncFrequency?: 'REALTIME' | 'EVERY_5_MIN' | 'EVERY_15_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'MANUAL' | string;
  description?: string;
  config: Record<string, any>;
  fieldMapping?: Record<string, string>;
  credentials?: Record<string, any>;
  lastSyncedAt?: string;
  lastSuccessfulSyncAt?: string;
  nextSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IDLE' | 'ERROR';
  lastSyncError?: string;
  lastSyncResult?: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  totalFetched?: number;
  totalCreated?: number;
  totalUpdated?: number;
  totalFailed?: number;
  totalSyncedEvents: number;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastTestResponse?: string;
  isSyncing?: boolean;
  syncStartedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface IntegrationLogDoc {
  _id: string;
  integrationId: string;
  integrationName: string;
  provider: string;
  triggerType: 'SCHEDULED' | 'MANUAL' | 'WEBHOOK' | string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'RUNNING' | string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errorMessage?: string;
  details?: any;
  requestId?: string;
  createdAt: string;
}

// ==========================================
// ENTERPRISE EMPLOYEE LIVE TRACKING & GEOFENCING
// ==========================================

export type TrackingModeType =
  | 'ATTENDANCE_ONLY'
  | 'ACTIVE_SHIFT'
  | 'WORKING_HOURS'
  | 'FIELD_TASK_ONLY'
  | 'MANUAL_WORK_SESSION'
  | 'FIELD_ONLY'
  | 'MANUAL';

export type LiveTrackingStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'IDLE'
  | 'STALE'
  | 'TRAVELLING'
  | 'STOPPED'
  | 'ON_LEAVE';

export type WorkLocationType =
  | 'OFFICE'
  | 'FIELD'
  | 'REMOTE'
  | 'TRANSIT'
  | 'CLIENT_SITE';

export interface LatestLocationDoc {
  _id: string; // e.g. `loc_latest_${employeeId}`
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  avatar?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  speed?: number; // m/s
  speedKmh?: number;
  heading?: number; // degrees (0-360)
  altitude?: number;
  batteryLevel?: number; // 0-100%
  isCharging?: boolean;
  trackingStatus: LiveTrackingStatus;
  workLocationType: WorkLocationType;
  currentGeofenceId?: string;
  currentGeofenceName?: string;
  isInsideGeofence: boolean;
  distanceFromOfficeMeters: number;
  address?: string;
  lastRecordedAt: string; // ISO
  lastReceivedAt: string; // ISO
  shiftId?: string;
  attendanceId?: string;
  attendanceStatus?: string;
  distanceTodayKm: number;
  currentStopDurationMinutes?: number;
  stoppedSince?: string;
  deviceId?: string;
  platform?: string;
  anomalyFlags?: string[]; // e.g. ['POOR_ACCURACY', 'JUMP_DETECTED']
  isMockLocation?: boolean;
  updatedAt: string;
}

export interface LocationHistoryDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  speedKmh?: number;
  heading?: number;
  altitude?: number;
  activity?: 'STILL' | 'WALKING' | 'IN_VEHICLE' | string;
  batteryLevel?: number;
  recordedAt: string; // ISO
  receivedAt: string; // ISO
  source: 'GPS' | 'NETWORK' | 'WEB_BROWSER' | 'MOBILE_APP' | 'OFFLINE_SYNC';
  shiftId?: string;
  trackingSessionId?: string;
  attendanceId?: string;
  taskId?: string;
  customerId?: string;
  geofenceId?: string;
  geofenceName?: string;
  isInsideGeofence: boolean;
  distanceFromOfficeMeters: number;
  address?: string;
  isStop?: boolean;
  stopDurationMinutes?: number;
  deviceId?: string;
  anomalyFlag?: string;
  anomalyFlags?: string[];
}

export interface GeofenceDoc {
  _id: string;
  name: string;
  code: string;
  category: 'OFFICE' | 'WAREHOUSE' | 'BRANCH' | 'PLANT' | 'CLIENT_SITE' | 'CUSTOMER' | 'PROJECT_SITE' | 'PROJECT' | 'TASK' | 'TEMPORARY';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address?: string;
  city?: string;
  state?: string;
  assignedDepartments?: string[];
  assignedEmployees?: string[];
  taskId?: string;
  customerId?: string;
  leadId?: string;
  employeeId?: string;
  validFrom?: string;
  validUntil?: string;
  isExpired?: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  enabled: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceEventDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  geofenceId: string;
  geofenceName: string;
  eventType: 'ENTER' | 'EXIT' | 'DWELL';
  timestamp: string;
  durationMinutes?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  taskId?: string;
  customerId?: string;
}

export interface TrackingPolicyDoc {
  _id: string; // 'tracking_policy_config'
  enabled: boolean;
  trackingEnabled?: boolean;
  trackingMode: TrackingModeType;
  requireConsent?: boolean;
  requireEmployeeConsent: boolean;
  requireLocationClockIn?: boolean;
  requireLocationClockOut?: boolean;
  requireSelfieClockIn?: boolean;
  requireSelfieClockOut?: boolean;
  maxGpsAccuracyMeters?: number;
  minAcceptableAccuracyMeters: number;
  movingUpdateFrequencySeconds?: number;
  stationaryUpdateFrequencySeconds?: number;
  updateFrequencySeconds: number;
  stationaryFrequencySeconds: number;
  maxAllowableSpeedKmh: number;
  stopRadiusMeters: number;
  stopMinDurationMinutes: number;
  storeRouteHistory: boolean;
  routeHistoryEnabled?: boolean;
  routeRetentionDays: number;
  locationRetentionDays?: number;
  enableGeofencing: boolean;
  geofenceEnabled?: boolean;
  anomalyDetectionEnabled?: boolean;
  notifyEmployeeWhenTracking: boolean;
  allowOfflineQueue: boolean;
  offlineQueueEnabled?: boolean;
  maxOfflineQueueItems: number;
  updatedAt: string;
  updatedBy: string;
}

export interface DailyTrackingSummaryDoc {
  _id: string; // `sum_${employeeId}_${date}`
  employeeId: string;
  employeeName: string;
  department?: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkingMinutes: number;
  totalTrackedMinutes: number;
  totalFieldMinutes: number;
  totalOfficeMinutes: number;
  totalStopMinutes: number;
  totalDistanceKm: number;
  clientSiteDurationMinutes?: number;
  geofenceVisitsCount: number;
  stopsCount: number;
  firstLocationTime?: string;
  lastLocationTime?: string;
  firstLocationAddress?: string;
  lastLocationAddress?: string;
  visitedGeofences?: string[];
  routeStart?: string;
  routeEnd?: string;
  updatedAt: string;
}

export interface TrackingAlertDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  type: 'OUTSIDE_GEOFENCE' | 'LOW_BATTERY' | 'TRACKING_OFFLINE' | 'ANOMALY_SPEED' | 'LOCATION_SPOOF_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details?: any;
  timestamp: string;
  acknowledged: boolean;
}

export interface FieldVisitProofDoc {
  _id: string;
  employeeId: string;
  employeeName?: string;
  taskId?: string;
  leadId?: string;
  customerId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  geofenceId?: string;
  distanceFromExpectedSite?: number;
  selfieUrl?: string;
  sitePhotoUrls?: string[];
  customerSignatureUrl?: string;
  signedByName?: string;
  notes?: string;
  timestamp: string;
  deviceId?: string;
  verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'REVIEW_REQUIRED';
  createdAt?: string;
}

export interface DocumentAttachmentDoc {
  _id: string;
  employeeId: string;
  employeeName?: string;
  entityType: 'LEAD' | 'CUSTOMER' | 'TASK' | 'FOLLOWUP' | 'QUOTATION' | 'EXPENSE' | 'GENERAL';
  entityId?: string;
  documentType: 'VISITING_CARD' | 'PURCHASE_ORDER' | 'SITE_DOCUMENT' | 'ID_DOCUMENT' | 'CHEQUE_IMAGE' | 'EXPENSE_RECEIPT' | 'OTHER';
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt: string;
}

export interface VoiceNoteDoc {
  _id: string;
  employeeId: string;
  employeeName?: string;
  leadId?: string;
  customerId?: string;
  taskId?: string;
  followUpId?: string;
  audioUrl: string;
  durationSeconds?: number;
  transcription?: string;
  notes?: string;
  createdAt: string;
}

export interface SafetyEventDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  type: 'SOS' | 'CHECK_IN' | 'SAFE_ALERT';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  message?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  timestamp: string;
}

export interface ManagerFeedbackDoc {
  _id: string;
  employeeId: string;
  employeeName?: string;
  managerId: string;
  managerName: string;
  entityType: 'TASK' | 'VISIT' | 'LEAD' | 'PERFORMANCE';
  entityId: string;
  rating?: number; // 1 to 5
  remarks: string;
  verificationStatus?: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
  createdAt: string;
}

export interface TravelExpenseDraftDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  ratePerKm: number;
  calculatedAmount: number;
  manualAdjustment?: number;
  totalClaimAmount: number;
  notes?: string;
  routeStart?: string;
  routeEnd?: string;
  receiptUrls?: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShiftHandoverDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  handoverNotes: string;
  pendingLeadIds?: string[];
  pendingTaskIds?: string[];
  followUpIds?: string[];
  handoverToEmployeeId?: string;
  handoverToEmployeeName?: string;
  createdAt: string;
}

export type WorkSessionStatus =
  | 'PREPARING'
  | 'ACTIVE'
  | 'ON_BREAK'
  | 'ACTIVE_WITH_WARNING'
  | 'COMPLETING'
  | 'COMPLETED_UPLOAD_PENDING'
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'REVIEW_REQUIRED';

export type ScreenRecordingStatus =
  | 'NOT_STARTED'
  | 'PERMISSION_REQUIRED'
  | 'STARTING'
  | 'NOT_REQUIRED'
  | 'PENDING_PERMISSION'
  | 'ACTIVE'
  | 'PAUSED'
  | 'INTERRUPTED'
  | 'STOPPING'
  | 'UPLOAD_PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'STOPPED'
  | 'DENIED'
  | 'FAILED';

export type MicrophoneStatus =
  | 'NOT_REQUIRED'
  | 'PENDING_PERMISSION'
  | 'ACTIVE'
  | 'INTERRUPTED'
  | 'DENIED'
  | 'FAILED';

export type WorkSessionTrackingStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'STOPPED'
  | 'STALE'
  | 'OFFLINE';

export interface WorkSessionDailySummary {
  shift: string;
  netWorkHours: string;
  crmActiveHours: string;
  breakMinutes: number;
  leadsCount: number;
  callsCount: number;
  followUpsCount: number;
  tasksCount: number;
  visitsCount: number;
  quotationsCount: number;
  travelDistanceKm: number;
  recordingDurationFormatted: string;
  interruptionsCount: number;
}

export interface WorkSessionDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  organizationId?: string;
  sessionDate: string; // YYYY-MM-DD
  status: WorkSessionStatus;
  startedAt: string;
  endedAt?: string;
  shiftStart?: string;
  shiftEnd?: string;
  deviceSessionId?: string;
  browserSessionId?: string;
  trackingEnabled: boolean;
  recordingEnabled: boolean;
  audioEnabled: boolean;
  screenRecordingStatus: ScreenRecordingStatus;
  microphoneStatus: MicrophoneStatus;
  trackingStatus: WorkSessionTrackingStatus;
  consentId?: string;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  totalActiveAppSeconds: number;
  totalBackgroundSeconds: number;
  recordingDurationSeconds: number;
  recordingSegmentsCount: number;
  interruptionCount: number;
  failureReason?: string;
  dailySummary?: WorkSessionDailySummary;
  lastHeartbeatAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSessionPolicyDoc {
  _id: string;
  requireGeofencePunchIn: boolean;
  allowRemotePunchIn?: boolean;
  requireSelfiePunchIn: boolean;
  requireScreenRecording: boolean;
  requireMicrophoneRecording: boolean;
  allowPunchInWithoutRecording: boolean;
  requireTrackingConsent: boolean;
  screenRecordingEnabled: boolean;
  microphoneRecordingEnabled: boolean;
  recordingChunkMinutes: number;
  maxChunkSizeMB: number;
  trackingFrequencySeconds: number;
  maxGpsAccuracyMeters: number;
  recordingRetentionDays: number;
  locationRetentionDays: number;
  showRecordingIndicator: boolean;
  allowRecordingPause: boolean;
  autoStopRecordingOnPunchOut: boolean;
  autoStopTrackingOnPunchOut: boolean;
  privacyPolicyVersion: string;
  privacyMaskingEnabled?: boolean;
  legalHold?: boolean;
  updatedAt: string;
}

export interface WorkSessionConsentDoc {
  _id: string;
  employeeId: string;
  employeeName: string;
  policyVersion: string;
  acceptedAt: string;
  cameraConsent: boolean;
  locationConsent: boolean;
  screenRecordingConsent: boolean;
  microphoneConsent: boolean;
  userAgent: string;
  browser: string;
  deviceType: string;
  sessionId: string;
  ipAddress?: string;
}

export interface RecordingSegmentDoc {
  _id: string;
  organizationId?: string | null;
  workSessionId: string;
  employeeId: string;
  employeeName?: string;
  segmentNumber: number;
  startedAt: string;
  endedAt: string;
  recordedDurationSeconds?: number;
  actualMediaDurationSeconds?: number;
  durationSeconds: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileSizeBytes?: number;
  mimeType: string;
  videoCodec?: string;
  audioCodec?: string;
  hasVideo?: boolean;
  hasAudio?: boolean;
  storageKey?: string;
  uploadStatus: 'QUEUED' | 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  processingStatus?: 'PENDING' | 'VALIDATING' | 'READY' | 'INVALID' | 'FAILED';
  downloadUrl?: string;
  checksum?: string;
  sha256?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkSessionActivityDoc {
  _id: string;
  eventId?: string;
  workSessionId: string;
  employeeId: string;
  eventType: 'SCREEN_ENTER' | 'SCREEN_EXIT' | 'TAB_ACTIVE' | 'TAB_BACKGROUND' | 'USER_ACTIVE' | 'USER_IDLE';
  screen?: string;
  route?: string;
  entityType?: string;
  entityId?: string;
  enteredAt?: string;
  exitedAt?: string;
  durationSeconds?: number;
  activeDurationSeconds?: number;
  idleDurationSeconds?: number;
  dedupeKey?: string;
  timestamp: string;
}


