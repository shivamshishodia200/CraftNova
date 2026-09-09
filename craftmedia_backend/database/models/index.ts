import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// 1. ORGANIZATION MODEL
// ==========================================
export const OrganizationSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  clientCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'TRIAL', 'INACTIVE'], default: 'ACTIVE' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  branding: {
    companyName: { type: String, default: '360CRM Client' },
    logoUrl: { type: String, default: '' },
    logoDarkUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#F59E0B' },
    secondaryColor: { type: String, default: '#111827' },
    accentColor: { type: String, default: '#EA580C' },
    backgroundColor: { type: String, default: '#F8FAFC' },
    surfaceColor: { type: String, default: '#FFFFFF' },
    sidebarBackground: { type: String, default: '#080D1A' },
    sidebarTextColor: { type: String, default: '#94A3B8' },
    sidebarActiveColor: { type: String, default: '#F59E0B' },
    headerBackground: { type: String, default: '#FFFFFF' },
    headerTextColor: { type: String, default: '#0F172A' },
    loginTitle: { type: String, default: 'Welcome to Enterprise Workspace' },
    loginSubtitle: { type: String, default: 'Unified platform for CRM, Operations & Telemetry' },
    footerText: { type: String, default: '360CRM Multi-Tenant Architecture' },
    borderRadius: { type: String, default: '12px' },
    themeMode: { type: String, default: 'LIGHT' },
    brandingVersion: { type: Number, default: 1 }
  },
  features: { type: Schema.Types.Mixed, default: {} },
  subscription: {
    plan: { type: String, default: 'STANDARD' },
    status: { type: String, default: 'ACTIVE' },
    maxEmployees: { type: Number, default: 50 },
    maxAdmins: { type: Number, default: 5 },
    storageLimitGB: { type: Number, default: 20 }
  },
  settings: { type: Schema.Types.Mixed, default: {} },
  adminCount: { type: Number, default: 1 },
  employeeCount: { type: Number, default: 0 },
  storageUsedBytes: { type: Number, default: 0 },
  createdBy: { type: String, default: 'system' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

// ==========================================
// 2. USER MODEL
// ==========================================
export const UserSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, index: true, default: null },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, required: true },
  roleId: { type: String, default: 'role_admin' },
  organization: { type: String, default: 'Craft Media Hub' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  avatar: { type: String, default: 'US' },
  customPermissions: { type: [String], default: [] },
  permissionMode: { type: String, enum: ['ROLE', 'REPLACE'], default: 'ROLE' },
  showLoginCredentials: { type: Boolean, default: true },
  showOnLogin: { type: Boolean, default: true },
  lastLogin: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

UserSchema.index({ organizationId: 1, email: 1 });

// ==========================================
// 3. EMPLOYEE MODEL
// ==========================================
export const EmployeeSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  department: { type: String, default: 'Sales' },
  designation: { type: String, default: 'Staff' },
  joiningDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  salary: { type: Number, default: 35000 },
  status: { type: String, enum: ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'], default: 'ACTIVE' },
  userId: { type: String, index: true },
  featureAccess: { type: Schema.Types.Mixed, default: {} },
  customPermissions: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

EmployeeSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, email: 1 });

// ==========================================
// 4. LEAD MODEL
// ==========================================
export const LeadSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  leadCode: { type: String, required: true },
  name: { type: String, required: true },
  companyName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, required: true },
  source: { type: String, default: 'Manual' },
  status: { type: String, default: 'NEW' },
  priority: { type: String, default: 'MEDIUM' },
  leadScore: { type: Number, default: 30 },
  assignedTo: { type: String, default: 'Sales Rep' },
  assignedToId: { type: String, index: true },
  estimatedValue: { type: Number, default: 0 },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  notes: { type: String, default: '' },
  tags: { type: [String], default: [] },
  convertedCustomerId: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

LeadSchema.index({ organizationId: 1, createdAt: -1 });
LeadSchema.index({ organizationId: 1, status: 1 });

// ==========================================
// 5. CUSTOMER MODEL
// ==========================================
export const CustomerSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  customerCode: { type: String },
  name: { type: String, required: true },
  companyName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, required: true },
  gstNumber: { type: String, default: '' },
  creditLimit: { type: Number, default: 500000 },
  paymentTerms: { type: String, default: 'Net 30' },
  address: { type: Schema.Types.Mixed, default: {} },
  assignedTo: { type: String, default: 'Admin' },
  totalOrdersCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

CustomerSchema.index({ organizationId: 1, phone: 1 });

// ==========================================
// 6. ATTENDANCE MODEL
// ==========================================
export const AttendanceSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true, index: true },
  checkIn: { type: String, default: '' },
  checkOut: { type: String, default: '' },
  status: { type: String, default: 'PRESENT' },
  remarks: { type: String, default: '' },
  selfieCheckIn: { type: String, default: '' },
  selfieCheckOut: { type: String, default: '' },
  locationCheckIn: { type: Schema.Types.Mixed },
  locationCheckOut: { type: Schema.Types.Mixed },
  clockInVerification: { type: Schema.Types.Mixed },
  clockOutVerification: { type: Schema.Types.Mixed },
  breaks: { type: [Schema.Types.Mixed], default: [] },
  workHours: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

AttendanceSchema.index({ organizationId: 1, employeeId: 1, date: 1 });

// ==========================================
// 7. AUDIT LOG MODEL
// ==========================================
export const AuditLogSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'USER' },
  action: { type: String, required: true },
  module: { type: String, required: true },
  description: { type: String, required: true },
  recordId: { type: String },
  oldData: { type: Schema.Types.Mixed },
  newData: { type: Schema.Types.Mixed },
  ipAddress: { type: String, default: '127.0.0.1' },
  userAgent: { type: String, default: '' },
  timestamp: { type: String, default: () => new Date().toISOString(), index: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });

// ==========================================
// 8. PRODUCT & INVOICE SCHEMAS
// ==========================================
export const ProductSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  category: { type: String, default: 'General' },
  categoryId: { type: String, default: 'cat_general' },
  unit: { type: String, default: 'Pcs' },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 18 },
  minStockLevel: { type: Number, default: 10 },
  currentStock: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { type: String, default: 'ACTIVE' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

ProductSchema.index({ organizationId: 1, sku: 1 });

export const InvoiceSchema = new Schema({
  _id: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  salesOrderId: { type: String },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  items: { type: [Schema.Types.Mixed], default: [] },
  subTotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  status: { type: String, default: 'ISSUED' },
  date: { type: String, default: () => new Date().toISOString() },
  dueDate: { type: String },
  paymentTerms: { type: String, default: 'Net 15' },
  notes: { type: String, default: '' },
  createdBy: { type: String, default: 'Admin' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { _id: false, timestamps: true });

InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 });

export function getMongoModels(conn: mongoose.Connection) {
  return {
    Organization: conn.model('Organization', OrganizationSchema),
    User: conn.model('User', UserSchema),
    Employee: conn.model('Employee', EmployeeSchema),
    Lead: conn.model('Lead', LeadSchema),
    Customer: conn.model('Customer', CustomerSchema),
    Attendance: conn.model('Attendance', AttendanceSchema),
    AuditLog: conn.model('AuditLog', AuditLogSchema),
    Product: conn.model('Product', ProductSchema),
    Invoice: conn.model('Invoice', InvoiceSchema)
  };
}
