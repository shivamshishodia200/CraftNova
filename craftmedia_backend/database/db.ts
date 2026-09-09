import fs from 'fs';
import path from 'path';
import { getSeedData } from './seedData';
import {
  UserDoc, RoleDoc, PermissionDoc, LeadDoc, CustomerDoc, ProductDoc, CategoryDoc,
  WarehouseDoc, SupplierDoc, PurchaseDoc, QuotationDoc, SalesOrderDoc,
  InvoiceDoc, PaymentDoc, ExpenseDoc, EmployeeDoc, AttendanceDoc,
  SalaryDoc, PerformanceDoc, CampaignDoc, LeadSourceDoc, IntegrationDoc, IntegrationLogDoc,
  AuditLogDoc, FollowUpDoc, StockTransactionDoc, CreditNoteDoc, CallLogDoc,
  LeaveDoc, TaskDoc, MessageDoc, ActivityTimelineDoc, NotificationDoc, AttendanceSettingsDoc,
  ActivitySessionDoc, DeviceDoc,
  LatestLocationDoc, LocationHistoryDoc, GeofenceDoc, GeofenceEventDoc, TrackingPolicyDoc,
  DailyTrackingSummaryDoc, TrackingAlertDoc,
  FieldVisitProofDoc, DocumentAttachmentDoc, VoiceNoteDoc, SafetyEventDoc,
  ManagerFeedbackDoc, TravelExpenseDraftDoc, ShiftHandoverDoc,
  WorkSessionDoc, WorkSessionPolicyDoc, WorkSessionConsentDoc, RecordingSegmentDoc, WorkSessionActivityDoc,
  OrganizationDoc
} from './types';

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err: any) {
    console.error('[DB Storage] Failed to create data directory:', err.message);
  }
}

export class Collection<T extends { _id: string }> {
  private name: string;
  private items: Map<string, T> = new Map();
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(name: string, initialItems: T[] = []) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);

    let loadedFromDisk = false;
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(item => {
            if (item && item._id) {
              this.items.set(item._id, item);
            }
          });
          loadedFromDisk = true;
        }
      } catch (err: any) {
        console.warn(`[DB Storage] Warning reading disk file for ${name}:`, err.message);
      }
    }

    // If disk file does not exist or was empty, initialize with seed items and save to disk
    if (!loadedFromDisk && initialItems.length > 0) {
      initialItems.forEach(item => this.items.set(item._id, JSON.parse(JSON.stringify(item))));
      this.persistToDiskSync();
    }
  }

  private persistToDiskSync(): void {
    try {
      const arr = Array.from(this.items.values());
      fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err: any) {
      console.error(`[DB Storage] Error writing ${this.name}.json to disk:`, err.message);
    }
  }

  private persistToDisk(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.persistToDiskSync();
    }, 50);
  }

  public getAll(): T[] {
    return Array.from(this.items.values()).map(i => JSON.parse(JSON.stringify(i)));
  }

  public findById(id: string): T | null {
    const found = this.items.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public findOne(predicate: (item: T) => boolean): T | null {
    for (const item of this.items.values()) {
      if (predicate(item)) {
        return JSON.parse(JSON.stringify(item));
      }
    }
    return null;
  }

  public find(predicate?: (item: T) => boolean): T[] {
    const list: T[] = [];
    for (const item of this.items.values()) {
      if (!predicate || predicate(item)) {
        list.push(JSON.parse(JSON.stringify(item)));
      }
    }
    return list;
  }

  public insertOne(doc: Omit<T, '_id'> & { _id?: string }): T {
    const id = doc._id || `${this.name.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullDoc = { ...doc, _id: id } as T;
    this.items.set(id, JSON.parse(JSON.stringify(fullDoc)));
    this.persistToDisk();
    return JSON.parse(JSON.stringify(fullDoc));
  }

  public insertMany(docs: (Omit<T, '_id'> & { _id?: string })[]): T[] {
    const inserted: T[] = [];
    for (const doc of docs) {
      const id = doc._id || `${this.name.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fullDoc = { ...doc, _id: id } as T;
      this.items.set(id, JSON.parse(JSON.stringify(fullDoc)));
      inserted.push(JSON.parse(JSON.stringify(fullDoc)));
    }
    this.persistToDisk();
    return inserted;
  }

  public updateById(id: string, updates: Partial<T> | ((prev: T) => T)): T | null {
    const existing = this.items.get(id);
    if (!existing) return null;

    let updated: T;
    if (typeof updates === 'function') {
      updated = updates(JSON.parse(JSON.stringify(existing)));
    } else {
      updated = { ...existing, ...updates, _id: id, updatedAt: new Date().toISOString() } as T;
    }

    this.items.set(id, JSON.parse(JSON.stringify(updated)));
    this.persistToDisk();
    return JSON.parse(JSON.stringify(updated));
  }

  public deleteById(id: string): boolean {
    const result = this.items.delete(id);
    if (result) this.persistToDisk();
    return result;
  }

  public countDocuments(predicate?: (item: T) => boolean): number {
    if (!predicate) return this.items.size;
    let count = 0;
    for (const item of this.items.values()) {
      if (predicate(item)) count++;
    }
    return count;
  }
}

export class Database {
  private static instance: Database;
  public initialized = false;

  public organizations!: Collection<OrganizationDoc>;
  public users!: Collection<UserDoc>;
  public roles!: Collection<RoleDoc>;
  public permissions!: Collection<PermissionDoc>;
  public leads!: Collection<LeadDoc>;
  public customers!: Collection<CustomerDoc>;
  public followUps!: Collection<FollowUpDoc>;
  public campaigns!: Collection<CampaignDoc>;
  public leadSources!: Collection<LeadSourceDoc>;
  public products!: Collection<ProductDoc>;
  public categories!: Collection<CategoryDoc>;
  public warehouses!: Collection<WarehouseDoc>;
  public stockTransactions!: Collection<StockTransactionDoc>;
  public suppliers!: Collection<SupplierDoc>;
  public purchases!: Collection<PurchaseDoc>;
  public quotations!: Collection<QuotationDoc>;
  public salesOrders!: Collection<SalesOrderDoc>;
  public invoices!: Collection<InvoiceDoc>;
  public payments!: Collection<PaymentDoc>;
  public expenses!: Collection<ExpenseDoc>;
  public creditNotes!: Collection<CreditNoteDoc>;
  public employees!: Collection<EmployeeDoc>;
  public attendance!: Collection<AttendanceDoc>;
  public salaries!: Collection<SalaryDoc>;
  public performance!: Collection<PerformanceDoc>;
  public integrations!: Collection<IntegrationDoc>;
  public integrationLogs!: Collection<IntegrationLogDoc>;
  public auditLogs!: Collection<AuditLogDoc>;
  public callLogs!: Collection<CallLogDoc>;
  public leaves!: Collection<LeaveDoc>;
  public tasks!: Collection<TaskDoc>;
  public messages!: Collection<MessageDoc>;
  public activityTimeline!: Collection<ActivityTimelineDoc>;
  public notifications!: Collection<NotificationDoc>;
  public attendanceSettings!: Collection<AttendanceSettingsDoc>;
  public activitySessions!: Collection<ActivitySessionDoc>;
  public devices!: Collection<DeviceDoc>;
  public latestLocations!: Collection<LatestLocationDoc>;
  public locationHistory!: Collection<LocationHistoryDoc>;
  public geofences!: Collection<GeofenceDoc>;
  public geofenceEvents!: Collection<GeofenceEventDoc>;
  public trackingPolicies!: Collection<TrackingPolicyDoc>;
  public dailyTrackingSummaries!: Collection<DailyTrackingSummaryDoc>;
  public trackingAlerts!: Collection<TrackingAlertDoc>;
  public fieldVisitProofs!: Collection<FieldVisitProofDoc>;
  public documentAttachments!: Collection<DocumentAttachmentDoc>;
  public voiceNotes!: Collection<VoiceNoteDoc>;
  public safetyEvents!: Collection<SafetyEventDoc>;
  public managerFeedbacks!: Collection<ManagerFeedbackDoc>;
  public travelExpenseDrafts!: Collection<TravelExpenseDraftDoc>;
  public shiftHandovers!: Collection<ShiftHandoverDoc>;
  public workSessions!: Collection<WorkSessionDoc>;
  public workSessionPolicies!: Collection<WorkSessionPolicyDoc>;
  public workSessionConsents!: Collection<WorkSessionConsentDoc>;
  public recordingSegments!: Collection<RecordingSegmentDoc>;
  public workSessionActivities!: Collection<WorkSessionActivityDoc>;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async init() {
    if (this.initialized) return;

    const seed = await getSeedData();
    this.organizations = new Collection<OrganizationDoc>('organizations', []);
    this.users = new Collection<UserDoc>('users', seed.users);
    this.roles = new Collection<RoleDoc>('roles', seed.roles);
    this.permissions = new Collection<PermissionDoc>('permissions', seed.permissions);
    this.leads = new Collection<LeadDoc>('leads', seed.leads);
    this.customers = new Collection<CustomerDoc>('customers', seed.customers);
    this.followUps = new Collection<FollowUpDoc>('followUps', seed.followUps);
    this.campaigns = new Collection<CampaignDoc>('campaigns', seed.campaigns);
    this.leadSources = new Collection<LeadSourceDoc>('leadSources', seed.leadSources);
    this.products = new Collection<ProductDoc>('products', seed.products);
    this.categories = new Collection<CategoryDoc>('categories', seed.categories);
    this.warehouses = new Collection<WarehouseDoc>('warehouses', seed.warehouses);
    this.stockTransactions = new Collection<StockTransactionDoc>('stockTransactions', seed.stockTransactions);
    this.suppliers = new Collection<SupplierDoc>('suppliers', seed.suppliers);
    this.purchases = new Collection<PurchaseDoc>('purchases', seed.purchases);
    this.quotations = new Collection<QuotationDoc>('quotations', seed.quotations);
    this.salesOrders = new Collection<SalesOrderDoc>('salesOrders', seed.salesOrders);
    this.invoices = new Collection<InvoiceDoc>('invoices', seed.invoices);
    this.payments = new Collection<PaymentDoc>('payments', seed.payments);
    this.expenses = new Collection<ExpenseDoc>('expenses', seed.expenses);
    this.creditNotes = new Collection<CreditNoteDoc>('creditNotes', seed.creditNotes);
    this.employees = new Collection<EmployeeDoc>('employees', seed.employees);
    this.attendance = new Collection<AttendanceDoc>('attendance', seed.attendance);
    this.salaries = new Collection<SalaryDoc>('salaries', seed.salaries);
    this.performance = new Collection<PerformanceDoc>('performance', seed.performance);
    this.integrations = new Collection<IntegrationDoc>('integrations', seed.integrations);
    this.integrationLogs = new Collection<IntegrationLogDoc>('integrationLogs', (seed as any).integrationLogs || []);
    this.auditLogs = new Collection<AuditLogDoc>('auditLogs', seed.auditLogs);
    this.callLogs = new Collection<CallLogDoc>('callLogs', (seed as any).callLogs || []);
    this.leaves = new Collection<LeaveDoc>('leaves', (seed as any).leaves || []);
    this.tasks = new Collection<TaskDoc>('tasks', (seed as any).tasks || []);
    this.messages = new Collection<MessageDoc>('messages', (seed as any).messages || []);
    this.activityTimeline = new Collection<ActivityTimelineDoc>('activityTimeline', (seed as any).activityTimeline || []);
    this.notifications = new Collection<NotificationDoc>('notifications', (seed as any).notifications || []);
    this.attendanceSettings = new Collection<AttendanceSettingsDoc>('attendanceSettings', (seed as any).attendanceSettings || []);
    this.activitySessions = new Collection<ActivitySessionDoc>('activitySessions', (seed as any).activitySessions || []);
    this.devices = new Collection<DeviceDoc>('devices', (seed as any).devices || []);
    this.latestLocations = new Collection<LatestLocationDoc>('latestLocations', (seed as any).latestLocations || []);
    this.locationHistory = new Collection<LocationHistoryDoc>('locationHistory', (seed as any).locationHistory || []);
    this.geofences = new Collection<GeofenceDoc>('geofences', (seed as any).geofences || []);
    this.geofenceEvents = new Collection<GeofenceEventDoc>('geofenceEvents', (seed as any).geofenceEvents || []);
    this.trackingPolicies = new Collection<TrackingPolicyDoc>('trackingPolicies', (seed as any).trackingPolicies || []);
    this.dailyTrackingSummaries = new Collection<DailyTrackingSummaryDoc>('dailyTrackingSummaries', (seed as any).dailyTrackingSummaries || []);
    this.trackingAlerts = new Collection<TrackingAlertDoc>('trackingAlerts', (seed as any).trackingAlerts || []);
    this.fieldVisitProofs = new Collection<FieldVisitProofDoc>('fieldVisitProofs', []);
    this.documentAttachments = new Collection<DocumentAttachmentDoc>('documentAttachments', []);
    this.voiceNotes = new Collection<VoiceNoteDoc>('voiceNotes', []);
    this.safetyEvents = new Collection<SafetyEventDoc>('safetyEvents', []);
    this.managerFeedbacks = new Collection<ManagerFeedbackDoc>('managerFeedbacks', []);
    this.travelExpenseDrafts = new Collection<TravelExpenseDraftDoc>('travelExpenseDrafts', []);
    this.shiftHandovers = new Collection<ShiftHandoverDoc>('shiftHandovers', []);

    this.workSessions = new Collection<WorkSessionDoc>('workSessions', []);
    this.workSessionPolicies = new Collection<WorkSessionPolicyDoc>('workSessionPolicies', []);
    this.workSessionConsents = new Collection<WorkSessionConsentDoc>('workSessionConsents', []);
    this.recordingSegments = new Collection<RecordingSegmentDoc>('recordingSegments', []);
    this.workSessionActivities = new Collection<WorkSessionActivityDoc>('workSessionActivities', []);

    // Ensure default work session policy exists
    if (this.workSessionPolicies.countDocuments() === 0) {
      this.workSessionPolicies.insertOne({
        _id: 'work_session_policy_default',
        requireGeofencePunchIn: true,
        requireSelfiePunchIn: true,
        requireScreenRecording: true,
        requireMicrophoneRecording: false,
        allowPunchInWithoutRecording: false,
        requireTrackingConsent: true,
        screenRecordingEnabled: true,
        microphoneRecordingEnabled: false,
        recordingChunkMinutes: 10,
        maxChunkSizeMB: 50,
        trackingFrequencySeconds: 30,
        maxGpsAccuracyMeters: 100,
        recordingRetentionDays: 15,
        locationRetentionDays: 30,
        showRecordingIndicator: true,
        allowRecordingPause: true,
        autoStopRecordingOnPunchOut: true,
        autoStopTrackingOnPunchOut: true,
        privacyPolicyVersion: '1.0.0',
        privacyMaskingEnabled: true,
        legalHold: false,
        updatedAt: new Date().toISOString()
      });
    }

    this.initialized = true;
    console.log('✅ 360CRM Enterprise Database & Memory Engine Initialized with Shiv Shakti Seed Data');
  }

  public getWorkSessionPolicy(): WorkSessionPolicyDoc {
    let policy = this.workSessionPolicies?.findById('work_session_policy_default');
    if (!policy) {
      policy = this.workSessionPolicies?.findOne(() => true);
    }
    if (!policy) {
      policy = {
        _id: 'work_session_policy_default',
        requireGeofencePunchIn: true,
        requireSelfiePunchIn: true,
        requireScreenRecording: true,
        requireMicrophoneRecording: false,
        allowPunchInWithoutRecording: false,
        requireTrackingConsent: true,
        screenRecordingEnabled: true,
        microphoneRecordingEnabled: false,
        recordingChunkMinutes: 10,
        maxChunkSizeMB: 50,
        trackingFrequencySeconds: 30,
        maxGpsAccuracyMeters: 100,
        recordingRetentionDays: 15,
        locationRetentionDays: 30,
        showRecordingIndicator: true,
        allowRecordingPause: true,
        autoStopRecordingOnPunchOut: true,
        autoStopTrackingOnPunchOut: true,
        privacyPolicyVersion: '1.0.0',
        privacyMaskingEnabled: true,
        legalHold: false,
        updatedAt: new Date().toISOString()
      };
    }
    return policy;
  }

  public getAttendanceSecurityConfig(orgId?: string): AttendanceSettingsDoc {
    if (orgId) {
      const tenantSetting = this.attendanceSettings?.findOne(s => 
        s.organizationId === orgId || 
        s._id === `attendance_config_${orgId}` ||
        s._id === `attendance_security_${orgId}`
      );
      if (tenantSetting) {
        return tenantSetting;
      }

      const org = this.organizations?.findById(orgId);
      if (org && org.settings) {
        const orgLocations = (org.settings as any).officeLocations || [];
        const orgPolicy = (org.settings as any).attendancePolicy || {};
        if (orgLocations.length > 0 || Object.keys(orgPolicy).length > 0) {
          return {
            _id: `attendance_config_${orgId}`,
            organizationId: orgId,
            requireSelfie: orgPolicy.requireSelfie ?? true,
            requireLocation: orgPolicy.requireLocation ?? true,
            requireSelfieClockIn: orgPolicy.requireSelfieClockIn ?? true,
            requireLocationClockIn: orgPolicy.requireLocationClockIn ?? true,
            requireSelfieClockOut: orgPolicy.requireSelfieClockOut ?? false,
            requireLocationClockOut: orgPolicy.requireLocationClockOut ?? false,
            desktopTrackingEnabled: orgPolicy.desktopTrackingEnabled ?? true,
            trackActiveApplications: orgPolicy.trackActiveApplications ?? true,
            trackIdleTime: orgPolicy.trackIdleTime ?? true,
            idleThresholdMinutes: orgPolicy.idleThresholdMinutes ?? 5,
            activityDetectionIntervalSeconds: orgPolicy.activityDetectionIntervalSeconds ?? 5,
            activitySyncIntervalSeconds: orgPolicy.activitySyncIntervalSeconds ?? 30,
            allowOfflineTracking: orgPolicy.allowOfflineTracking ?? true,
            maxGpsAccuracyMeters: orgPolicy.maxGpsAccuracyMeters ?? 250,
            allowedLocations: orgLocations.length > 0 ? orgLocations : [
              {
                id: `loc_${org.slug}_main`,
                name: `${org.name} Office`,
                lat: 28.6139,
                lng: 77.2090,
                radiusMeters: 500,
                maxAccuracyMeters: 100,
                address: org.name,
                enabled: true
              }
            ],
            createdAt: org.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      }
    }

    let settings = this.attendanceSettings?.findById('attendance_security_config');
    if (!settings) {
      settings = this.attendanceSettings?.findOne(() => true) || {
        _id: 'attendance_security_config',
        organizationId: 'org_craftmedia',
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
        maxGpsAccuracyMeters: 250,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    return settings;
  }

  // Atomic Stock In Transaction
  public stockIn(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    referenceType: 'MANUAL' | 'PURCHASE' | 'RETURN';
    referenceId?: string;
    reason?: string;
    supplierId?: string;
    supplierName?: string;
    createdBy: string;
  }): { success: boolean; message: string; transaction?: StockTransactionDoc; product?: ProductDoc } {
    const product = this.products.findById(params.productId);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    const warehouse = this.warehouses.findById(params.warehouseId);
    const warehouseName = warehouse ? warehouse.name : (product.warehouseName || 'Default Warehouse');

    const previousStock = product.currentStock;
    const newStock = previousStock + Number(params.quantity);

    // Update Product Stock atomically
    const updatedProduct = this.products.updateById(params.productId, {
      currentStock: newStock,
      warehouseId: params.warehouseId,
      warehouseName
    });

    // Create Stock Transaction
    const tx = this.stockTransactions.insertOne({
      productId: params.productId,
      productName: product.name,
      warehouseId: params.warehouseId,
      warehouseName,
      type: 'STOCK_IN',
      quantity: Number(params.quantity),
      previousStock,
      newStock,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason || 'Goods received into inventory',
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString()
    });

    return { success: true, message: 'Stock received successfully', transaction: tx, product: updatedProduct || undefined };
  }

  // Atomic Stock Out Transaction with strict stockout validation
  public stockOut(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    referenceType: 'MANUAL' | 'SALES_ORDER' | 'DAMAGE';
    referenceId?: string;
    reason?: string;
    createdBy: string;
  }): { success: boolean; message: string; transaction?: StockTransactionDoc; product?: ProductDoc } {
    const product = this.products.findById(params.productId);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    const reqQty = Number(params.quantity);
    if (reqQty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    if (product.currentStock < reqQty) {
      return {
        success: false,
        message: `Insufficient stock. Requested: ${reqQty}, Available: ${product.currentStock}`
      };
    }

    const warehouse = this.warehouses.findById(params.warehouseId);
    const warehouseName = warehouse ? warehouse.name : (product.warehouseName || 'Default Warehouse');

    const previousStock = product.currentStock;
    const newStock = previousStock - reqQty;

    const updatedProduct = this.products.updateById(params.productId, {
      currentStock: newStock
    });

    const tx = this.stockTransactions.insertOne({
      productId: params.productId,
      productName: product.name,
      warehouseId: params.warehouseId,
      warehouseName,
      type: 'STOCK_OUT',
      quantity: reqQty,
      previousStock,
      newStock,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason || 'Goods dispatched from warehouse',
      createdBy: params.createdBy,
      createdAt: new Date().toISOString()
    });

    return { success: true, message: 'Stock dispatched successfully', transaction: tx, product: updatedProduct || undefined };
  }
}

export const db = Database.getInstance();
