import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';

// Controllers
import * as authCtrl from '../controllers/authController';
import * as userCtrl from '../controllers/userController';
import * as roleCtrl from '../controllers/roleController';
import * as salesCtrl from '../controllers/salesControllers';
import * as invCtrl from '../controllers/inventoryControllers';
import * as acctCtrl from '../controllers/accountsControllers';
import * as hrCtrl from '../controllers/peopleControllers';
import * as actCtrl from '../controllers/activityController';
import * as mktCtrl from '../controllers/marketingControllers';
import * as sysCtrl from '../controllers/systemControllers';
import * as tradeIndiaCtrl from '../controllers/tradeIndiaController';
import * as intCtrl from '../controllers/integrationController';
import * as whCtrl from '../controllers/webhookController';
import * as trackingCtrl from '../controllers/employeeTrackingController';
import * as orgCtrl from '../controllers/organizationController';
import * as clientAccessCtrl from '../controllers/clientAccessController';
import { requireFeature } from '../middleware/featureGuard';
import rateLimit from 'express-rate-limit';
import employeeRouter from './employeeRoutes';
import { employeeWorkSessionRouter, hrWorkSessionRouter } from './workSessionRoutes';

const router = Router();

// Rate limiter for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address, please try again after 15 minutes.'
  }
});

// ==================== APP BOOTSTRAP & PUBLIC BRANDING ====================
router.get('/app/bootstrap', authenticateToken, orgCtrl.getAppBootstrap);
router.get('/public/branding/:slugOrCode', orgCtrl.getPublicOrgBySlug);
router.get('/public/organization-branding/:slugOrCode', orgCtrl.getPublicOrgBySlug);
router.get('/public/organizations/:slugOrCode/branding', orgCtrl.getPublicOrgBySlug);

// ==================== SUPER ADMIN ORGANIZATIONS (MULTI-TENANT WHITE-LABEL) ====================
router.get('/superadmin/organizations', authenticateToken, requireRole('SUPER_ADMIN'), orgCtrl.getAllOrganizations);
router.get('/superadmin/organizations/:id', authenticateToken, orgCtrl.getOrganizationById);
router.post('/superadmin/organizations', authenticateToken, requireRole('SUPER_ADMIN'), orgCtrl.createOrganization);
router.put('/superadmin/organizations/:id', authenticateToken, orgCtrl.updateOrganization);
router.patch('/superadmin/organizations/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), orgCtrl.toggleOrganizationStatus);
router.put('/superadmin/organizations/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), orgCtrl.toggleOrganizationStatus);
router.post('/superadmin/organizations/:id/upload', authenticateToken, orgCtrl.uploadAsset.single('file'), orgCtrl.uploadOrganizationAsset);
router.post('/superadmin/upload-asset', authenticateToken, requireRole('SUPER_ADMIN'), orgCtrl.uploadAsset.single('file'), orgCtrl.uploadGenericAsset);

// ==================== SUPER ADMIN CLIENT ACCESS & USER MANAGEMENT ====================
router.get('/superadmin/organizations/:orgId/users', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getOrganizationUsers);
router.get('/superadmin/organizations/:orgId/admins', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getOrganizationAdmins);
router.get('/superadmin/organizations/:orgId/employees', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getOrganizationEmployees);
router.post('/superadmin/organizations/:orgId/admins', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.createOrganizationAdmin);
router.post('/superadmin/organizations/:orgId/employees', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.createOrganizationEmployee);
router.put('/superadmin/organizations/:orgId/features', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.updateOrganizationFeatures);
router.put('/superadmin/organizations/:orgId/module-access', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.updateOrganizationFeatures);
router.put('/superadmin/organizations/:orgId/primary-admin', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.setPrimaryAdmin);
router.post('/superadmin/organizations/:orgId/force-logout-all', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.forceLogoutAllOrgUsers);
router.post('/superadmin/organizations/:orgId/force-password-reset-all', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.forcePasswordResetAllOrgUsers);
router.get('/superadmin/organizations/:orgId/activity', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getOrganizationActivityLogs);

// Super Admin User Direct Operations
router.put('/superadmin/users/:id', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.updateUser);
router.patch('/superadmin/users/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.toggleUserStatus);
router.post('/superadmin/users/:id/reset-password', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.resetUserPassword);
router.get('/superadmin/users/:id/permissions', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getUserPermissions);
router.get('/superadmin/users/:id/effective-permissions', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.getUserPermissions);
router.put('/superadmin/users/:id/permissions', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.updateUserPermissions);
router.post('/superadmin/users/:id/force-logout', authenticateToken, requireRole('SUPER_ADMIN'), clientAccessCtrl.forceLogoutUser);

// ==================== DEDICATED EMPLOYEE WORK SESSIONS & RECORDINGS ====================

router.use('/employee/work-session', authenticateToken, requireFeature('hr.workRecording'), employeeWorkSessionRouter);
router.use('/hr/work-sessions', authenticateToken, requireFeature('hr.workRecording'), hrWorkSessionRouter);


// ==================== DEDICATED EMPLOYEE PORTAL API ====================
router.use('/employee', employeeRouter);

// ==================== AUTHENTICATION ====================
router.post('/auth/super-admin/login', authLimiter, authCtrl.superAdminLogin);
router.post('/auth/admin/login', authLimiter, authCtrl.adminLogin);
router.post('/auth/employee/login', authLimiter, authCtrl.employeeLogin);
router.post('/auth/login', authLimiter, authCtrl.login);
router.get('/auth/demo-users', authCtrl.getDemoUsers);
router.get('/auth/me', authenticateToken, authCtrl.getCurrentUser);
router.post('/auth/switch-demo', authCtrl.switchDemoUser);

// ==================== USERS & ADMINS ====================
router.get('/users', authenticateToken, requirePermission('users.view'), userCtrl.getAllUsers);
router.get('/users/:id', authenticateToken, requirePermission('users.view'), userCtrl.getUserById);
router.post('/users', authenticateToken, requirePermission('users.create'), userCtrl.createUser);
router.put('/users/:id', authenticateToken, requirePermission('users.update'), userCtrl.updateUser);
router.put('/users/:id/permissions', authenticateToken, requireRole('SUPER_ADMIN'), userCtrl.updateUserPermissions);
router.patch('/users/:id/status', authenticateToken, requirePermission('users.update'), userCtrl.toggleUserStatus);
router.post('/users/:id/reset-password', authenticateToken, requirePermission('users.update'), userCtrl.resetUserPassword);

// ==================== ROLES & PERMISSIONS ====================
router.get('/roles', authenticateToken, requirePermission('roles.view'), roleCtrl.getAllRoles);
router.post('/roles', authenticateToken, requirePermission('roles.create'), roleCtrl.createRole);
router.put('/roles/:id', authenticateToken, requirePermission('roles.update'), roleCtrl.updateRole);
router.get('/permissions', authenticateToken, roleCtrl.getAllPermissions);

// ==================== SALES - LEADS ====================
router.get('/leads', authenticateToken, requirePermission('leads.view'), salesCtrl.getLeads);
router.get('/sales-reps', authenticateToken, salesCtrl.getSalesReps);
router.post('/leads', authenticateToken, requirePermission('leads.create'), salesCtrl.createLead);
router.patch('/leads/:id/assign', authenticateToken, requirePermission('leads.update'), salesCtrl.assignLead);
router.post('/leads/bulk-assign', authenticateToken, requirePermission('leads.update'), salesCtrl.bulkAssignLeads);
router.post('/leads/:id/convert', authenticateToken, requirePermission('leads.update'), salesCtrl.convertLead);
router.put('/leads/:id', authenticateToken, requirePermission('leads.update'), salesCtrl.updateLead);
router.delete('/leads/:id', authenticateToken, requirePermission('leads.delete'), salesCtrl.deleteLead);

// Lead Calls & Voice Recordings
router.post('/leads/:id/calls', authenticateToken, salesCtrl.logLeadCall);
router.get('/leads/:id/calls', authenticateToken, salesCtrl.getLeadCallLogs);
router.get('/call-logs', authenticateToken, salesCtrl.getAllCallLogs);
router.delete('/call-logs/:id', authenticateToken, salesCtrl.deleteCallLog);

// ==================== SALES - CUSTOMERS ====================
router.get('/customers', authenticateToken, requirePermission('customers.view'), salesCtrl.getCustomers);
router.get('/customers/:id/details', authenticateToken, requirePermission('customers.view'), salesCtrl.getCustomerDetails);
router.post('/customers', authenticateToken, requirePermission('customers.create'), salesCtrl.createCustomer);
router.put('/customers/:id', authenticateToken, requirePermission('customers.update'), salesCtrl.updateCustomer);
router.delete('/customers/:id', authenticateToken, requirePermission('customers.delete'), salesCtrl.deleteCustomer);

// ==================== SALES - QUOTATIONS ====================
router.get('/quotations', authenticateToken, requirePermission('quotations.view'), salesCtrl.getQuotations);
router.post('/quotations', authenticateToken, requirePermission('quotations.create'), salesCtrl.createQuotation);
router.patch('/quotations/:id/approve', authenticateToken, requirePermission('quotations.create'), salesCtrl.approveQuotation);
router.post('/quotations/:id/convert', authenticateToken, requirePermission('quotations.convert'), salesCtrl.convertQuotationToSalesOrder);

// ==================== SALES - ORDERS ====================
router.get('/sales-orders', authenticateToken, requirePermission('sales_orders.view'), salesCtrl.getSalesOrders);
router.post('/sales-orders', authenticateToken, requirePermission('sales_orders.create'), salesCtrl.createSalesOrder);
router.patch('/sales-orders/:id/status', authenticateToken, requirePermission('sales_orders.approve'), salesCtrl.updateSalesOrderStatus);
router.patch('/sales-orders/:id/approve', authenticateToken, requirePermission('sales_orders.approve'), salesCtrl.approveSalesOrder);
router.post('/sales-orders/:id/generate-invoice', authenticateToken, requirePermission('invoices.create'), salesCtrl.generateOrderInvoice);

// ==================== SALES - FOLLOW-UPS ====================
router.get('/follow-ups', authenticateToken, requirePermission('follow_ups.view'), salesCtrl.getFollowUps);
router.post('/follow-ups', authenticateToken, requirePermission('follow_ups.create'), salesCtrl.createFollowUp);
router.patch('/follow-ups/:id/complete', authenticateToken, requirePermission('follow_ups.update'), salesCtrl.completeFollowUp);

// ==================== SALES - REPORTS ====================
router.get('/sales/reports', authenticateToken, requirePermission('sales_reports.view'), salesCtrl.getSalesReportsData);

// ==================== STORE / INVENTORY ====================
router.get('/products', authenticateToken, requirePermission('products.view'), invCtrl.getProducts);
router.post('/products', authenticateToken, requirePermission('products.create'), invCtrl.createProduct);
router.put('/products/:id', authenticateToken, requirePermission('products.update'), invCtrl.updateProduct);
router.delete('/products/:id', authenticateToken, requirePermission('products.delete'), invCtrl.deleteProduct);

router.get('/categories', authenticateToken, requirePermission('categories.view'), invCtrl.getCategories);
router.post('/categories', authenticateToken, requirePermission('categories.create'), invCtrl.createCategory);

router.get('/warehouses', authenticateToken, requirePermission('warehouses.view'), invCtrl.getWarehouses);
router.post('/warehouses', authenticateToken, requirePermission('warehouses.create'), invCtrl.createWarehouse);

router.get('/inventory', authenticateToken, requirePermission('inventory.view'), invCtrl.getInventorySummary);
router.post('/stock-in', authenticateToken, requirePermission('stock_in.create'), invCtrl.performStockIn);
router.post('/stock-out', authenticateToken, requirePermission('stock_out.create'), invCtrl.performStockOut);
router.get('/stock-transactions', authenticateToken, requirePermission('inventory.view'), invCtrl.getStockTransactions);

// ==================== PURCHASES & SUPPLIERS ====================
router.get('/suppliers', authenticateToken, requirePermission('suppliers.view'), invCtrl.getSuppliers);
router.post('/suppliers', authenticateToken, requirePermission('suppliers.create'), invCtrl.createSupplier);
router.put('/suppliers/:id', authenticateToken, requirePermission('suppliers.update'), invCtrl.updateSupplier);

router.get('/purchases', authenticateToken, requirePermission('purchase.view'), invCtrl.getPurchases);
router.post('/purchases', authenticateToken, requirePermission('purchase.create'), invCtrl.createPurchase);
router.patch('/purchases/:id/receive', authenticateToken, requirePermission('purchase.receive'), invCtrl.receivePurchase);

// ==================== ACCOUNTS ====================
router.get('/invoices', authenticateToken, requirePermission('invoices.view'), acctCtrl.getInvoices);
router.get('/invoices/:id', authenticateToken, requirePermission('invoices.view'), acctCtrl.getInvoiceById);
router.post('/invoices', authenticateToken, requirePermission('invoices.create'), acctCtrl.createInvoice);

router.get('/payments', authenticateToken, requirePermission('payments.view'), acctCtrl.getPayments);
router.post('/payments', authenticateToken, requirePermission('payments.create'), acctCtrl.createPayment);

router.get('/expenses', authenticateToken, requirePermission('expenses.view'), acctCtrl.getExpenses);
router.post('/expenses', authenticateToken, requirePermission('expenses.create'), acctCtrl.createExpense);

router.get('/receivables', authenticateToken, requirePermission('receivables.view'), acctCtrl.getReceivables);
router.get('/payables', authenticateToken, requirePermission('payables.view'), acctCtrl.getPayables);

router.get('/credit-notes', authenticateToken, requirePermission('credit_notes.view'), acctCtrl.getCreditNotes);
router.post('/credit-notes', authenticateToken, requirePermission('credit_notes.create'), acctCtrl.createCreditNote);

// ==================== PEOPLE / HR ====================
router.get('/employees', authenticateToken, requirePermission('employees.view'), hrCtrl.getEmployees);
router.post('/employees', authenticateToken, requirePermission('employees.create'), hrCtrl.createEmployee);
router.put('/employees/:id', authenticateToken, requirePermission('employees.update'), hrCtrl.updateEmployee);
router.delete('/employees/:id', authenticateToken, requirePermission('employees.delete'), hrCtrl.deleteEmployee);

// Attendance & Clock-In/Out & Breaks
router.get('/attendance', authenticateToken, requirePermission('attendance.view'), hrCtrl.getAttendance);
router.post('/attendance', authenticateToken, requirePermission('attendance.create'), hrCtrl.logAttendance);
router.post('/attendance/clock-in', authenticateToken, hrCtrl.clockIn);
router.post('/attendance/clock-out', authenticateToken, hrCtrl.clockOut);
router.post('/attendance/break/start', authenticateToken, hrCtrl.startBreak);
router.post('/attendance/break/end', authenticateToken, hrCtrl.endBreak);
router.post('/attendance/break', authenticateToken, hrCtrl.toggleBreak);
router.get('/attendance/today-status', authenticateToken, hrCtrl.getTodayAttendanceStatus);

// Desktop Activity & Screen Time Telemetry
router.post('/activity/sync', authenticateToken, actCtrl.syncActivityBatch);
router.post('/activity/heartbeat', authenticateToken, actCtrl.registerDeviceHeartbeat);
router.get('/activity/today', authenticateToken, actCtrl.getTodayActivity);
router.get('/activity/applications', authenticateToken, actCtrl.getApplicationAnalytics);

// Admin Attendance & Live Desktop Activity Monitoring
router.get('/admin/attendance', authenticateToken, requirePermission('attendance.view'), actCtrl.getAdminAttendanceList);
router.get('/admin/attendance/:employeeId', authenticateToken, requirePermission('attendance.view'), actCtrl.getAdminEmployeeActivityDetail);
router.get('/admin/activity-summary', authenticateToken, requirePermission('attendance.view'), actCtrl.getAdminActivitySummary);
router.get('/admin/device-status', authenticateToken, requirePermission('attendance.view'), actCtrl.getAdminDeviceStatus);
router.get('/admin/reports/attendance', authenticateToken, requirePermission('reports.view'), actCtrl.getAttendanceReports);
router.get('/admin/activity/export', authenticateToken, requirePermission('reports.view'), actCtrl.exportActivityReport);
router.get('/activity/export', authenticateToken, actCtrl.exportActivityReport);

// Attendance Security Settings & Geofencing (Tenant Admin & Super Admin)
router.get('/attendance/settings', authenticateToken, hrCtrl.getAttendanceSettings);
router.put('/attendance/settings', authenticateToken, requirePermission('settings.update'), hrCtrl.updateAttendanceSettings);
router.post('/attendance/settings/locations', authenticateToken, requirePermission('settings.update'), hrCtrl.addAllowedLocation);
router.put('/attendance/settings/locations/:id', authenticateToken, requirePermission('settings.update'), hrCtrl.updateAllowedLocation);
router.delete('/attendance/settings/locations/:id', authenticateToken, requirePermission('settings.update'), hrCtrl.deleteAllowedLocation);

// Aliases for attendance settings
router.get('/attendance-settings', authenticateToken, hrCtrl.getAttendanceSettings);
router.put('/attendance-settings', authenticateToken, requirePermission('settings.update'), hrCtrl.updateAttendanceSettings);
router.post('/attendance-settings/locations', authenticateToken, requirePermission('settings.update'), hrCtrl.addAllowedLocation);
router.put('/attendance-settings/locations/:id', authenticateToken, requirePermission('settings.update'), hrCtrl.updateAllowedLocation);
router.delete('/attendance-settings/locations/:id', authenticateToken, requirePermission('settings.update'), hrCtrl.deleteAllowedLocation);

router.get('/salary', authenticateToken, requirePermission('salary.view'), hrCtrl.getSalaries);
router.post('/salary', authenticateToken, requirePermission('salary.create'), hrCtrl.generateSalary);

router.get('/performance', authenticateToken, requirePermission('performance.view'), hrCtrl.getPerformanceReviews);
router.post('/performance', authenticateToken, requirePermission('performance.create'), hrCtrl.createPerformanceReview);

// Leave Requests & HR Approvals
router.get('/leaves', authenticateToken, hrCtrl.getLeaves);
router.patch('/leaves/:id/status', authenticateToken, hrCtrl.updateLeaveStatus);

// ==================== MARKETING ====================
router.get('/campaigns', authenticateToken, requirePermission('campaigns.view'), mktCtrl.getCampaigns);
router.post('/campaigns', authenticateToken, requirePermission('campaigns.create'), mktCtrl.createCampaign);
router.get('/lead-sources', authenticateToken, requirePermission('lead_sources.view'), mktCtrl.getLeadSources);
router.post('/whatsapp/send', authenticateToken, requirePermission('whatsapp.view'), mktCtrl.sendWhatsAppMessage);

// ==================== ENTERPRISE INBOUND WEBHOOKS (PUBLIC) ====================
router.post('/webhooks/leads/:integrationId', whCtrl.handleLeadWebhook);
router.post('/webhooks/leads', whCtrl.handleLeadWebhook);
router.post('/website-leads', whCtrl.handleLeadWebhook);
router.post('/tradeindia/webhook', whCtrl.handleLeadWebhook);

router.get('/webhooks/whatsapp/:integrationId', whCtrl.handleWhatsAppVerify);
router.get('/webhooks/whatsapp', whCtrl.handleWhatsAppVerify);
router.post('/webhooks/whatsapp/:integrationId', whCtrl.handleWhatsAppWebhook);
router.post('/webhooks/whatsapp', whCtrl.handleWhatsAppWebhook);

router.post('/webhooks/razorpay/:integrationId', whCtrl.handleRazorpayWebhook);
router.post('/webhooks/razorpay', whCtrl.handleRazorpayWebhook);

router.post('/webhooks/stripe/:integrationId', whCtrl.handleStripeWebhook);
router.post('/webhooks/stripe', whCtrl.handleStripeWebhook);

// ==================== SYSTEM, DASHBOARD, REPORTS & AUDIT ====================
router.get('/dashboard', authenticateToken, sysCtrl.getDashboardStats);
router.get('/superadmin/stats', authenticateToken, requireRole('SUPER_ADMIN'), sysCtrl.getSuperAdminStats);
router.get('/reports', authenticateToken, requirePermission('reports.view'), sysCtrl.getReports);
router.get('/audit-logs', authenticateToken, requirePermission('audit_logs.view'), sysCtrl.getAuditLogs);

// ==================== ENTERPRISE CONNECTORS & INTEGRATION ENGINE ====================
router.get('/integrations', authenticateToken, requirePermission('integrations.view'), intCtrl.getIntegrations);
router.get('/integrations/:id', authenticateToken, requirePermission('integrations.view'), intCtrl.getIntegrationById);
router.post('/integrations', authenticateToken, requirePermission('integrations.manage'), intCtrl.createIntegration);
router.put('/integrations/:id', authenticateToken, requirePermission('integrations.manage'), intCtrl.updateIntegration);
router.delete('/integrations/:id', authenticateToken, requirePermission('integrations.manage'), intCtrl.deleteIntegration);

router.post('/integrations/:id/test', authenticateToken, requirePermission('integrations.manage'), intCtrl.testIntegrationConnection);
router.post('/integrations/:id/sync', authenticateToken, requirePermission('integrations.manage'), intCtrl.syncIntegrationNow);
router.post('/integrations/:id/activate', authenticateToken, requirePermission('integrations.manage'), intCtrl.activateIntegration);
router.post('/integrations/:id/pause', authenticateToken, requirePermission('integrations.manage'), intCtrl.pauseIntegration);
router.get('/integrations/:id/logs', authenticateToken, requirePermission('integrations.view'), intCtrl.getIntegrationLogs);
router.post('/integrations/custom-rest/preview', authenticateToken, requirePermission('integrations.manage'), intCtrl.testCustomRestPreview);

// ==================== ADVANCED EMPLOYEE LIVE TRACKING & GEOFENCING ====================
// Employee Location Ingestion & Consent
router.post('/employee-tracking/location', authenticateToken, trackingCtrl.postLocation);
router.post('/employee-tracking/location/batch', authenticateToken, trackingCtrl.postBatchLocations);
router.get('/employee-tracking/my-status', authenticateToken, trackingCtrl.getMyTrackingStatus);
router.post('/employee-tracking/my-consent', authenticateToken, trackingCtrl.postMyConsent);
router.get('/employee-tracking/health', authenticateToken, trackingCtrl.getTrackingHealth);
router.get('/employee-tracking/team/health', authenticateToken, requirePermission('employee_tracking.view_live'), trackingCtrl.getTeamTrackingHealth);

// HR / Admin Live Map & Telemetry
router.get('/employee-tracking/live', authenticateToken, requirePermission('employee_tracking.view_live'), trackingCtrl.getLiveEmployees);
router.get('/employee-tracking/stream', authenticateToken, requirePermission('employee_tracking.view_live'), trackingCtrl.streamLiveTracking);
router.get('/employee-tracking/employee/:id', authenticateToken, requirePermission('employee_tracking.view_live'), trackingCtrl.getEmployeeTrackingDetail);
router.get('/employee-tracking/employee/:id/route', authenticateToken, requirePermission('employee_tracking.view_history'), trackingCtrl.getEmployeeRouteHistory);
router.get('/employee-tracking/employee/:id/timeline', authenticateToken, requirePermission('employee_tracking.view_history'), trackingCtrl.getEmployeeTimeline);
router.get('/employee-tracking/employee/:id/daily-summary', authenticateToken, requirePermission('employee_tracking.view_history'), trackingCtrl.getEmployeeDailySummary);

// Geofence Management & Dynamic Task Geofences
router.get('/employee-tracking/geofences', authenticateToken, requirePermission('employee_tracking.view_live'), trackingCtrl.getGeofences);
router.post('/employee-tracking/geofences', authenticateToken, requirePermission('employee_tracking.manage_geofence'), trackingCtrl.createGeofence);
router.post('/employee-tracking/geofences/task', authenticateToken, trackingCtrl.createTaskGeofenceEndpoint);
router.put('/employee-tracking/geofences/:id', authenticateToken, requirePermission('employee_tracking.manage_geofence'), trackingCtrl.updateGeofence);
router.delete('/employee-tracking/geofences/:id', authenticateToken, requirePermission('employee_tracking.manage_geofence'), trackingCtrl.deleteGeofence);

// Tracking Policy Settings & Reports
router.get('/employee-tracking/settings', authenticateToken, requirePermission('employee_tracking.manage'), trackingCtrl.getTrackingSettings);
router.put('/employee-tracking/settings', authenticateToken, requirePermission('employee_tracking.manage'), trackingCtrl.updateTrackingSettings);
router.get('/employee-tracking/export', authenticateToken, requirePermission('employee_tracking.export'), trackingCtrl.exportTrackingReport);

// Legacy TradeIndia specific routes
router.get('/integrations/tradeindia/status', authenticateToken, tradeIndiaCtrl.getTradeIndiaStatus);
router.post('/integrations/tradeindia/sync', authenticateToken, requirePermission('integrations.manage'), tradeIndiaCtrl.manualTradeIndiaSync);
router.post('/integrations/tradeindia/config', authenticateToken, requirePermission('integrations.manage'), tradeIndiaCtrl.updateTradeIndiaConfig);

export default router;
