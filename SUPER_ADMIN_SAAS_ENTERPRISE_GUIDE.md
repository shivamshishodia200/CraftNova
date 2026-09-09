# CraftMedia CRM — Enterprise Multi-Tenant White-Label SaaS Architecture Guide

## 1. Overview & Business Model

**CraftMedia CRM** is an enterprise-grade, multi-tenant SaaS CRM and Business ERP engineered with complete tenant data isolation, dynamic white-label branding inheritance, role-based access control (RBAC), multi-branch geofencing, and automated telemetry.

```
ROOT SUPER ADMIN (Global Omni-Tenant Authority)
│
├── Organization: DeliveryPlus (Logistics & Transport)
│   ├── Admin: DeliveryPlus Admin (Full Tenant Authority)
│   ├── Operations Executive
│   ├── Drivers & Logistics Reps
│   └── Branding: #F59E0B (Amber), DeliveryPlus Logo, Custom Sidebar
│
├── Organization: Shiv Shakti Enterprises (Retail & Wholesale)
│   ├── Admin: Shiv Shakti Admin
│   ├── Store & Warehouse Managers
│   ├── Sales Executives
│   └── Branding: #7C3AED (Purple), Custom Header, Custom Favicon
│
└── Organization: Craft Media Hub (Default Workspace)
    └── Admins, HR, Sales, Accounts
```

---

## 2. Key Architecture Principles

### 2.1 Multi-Tenant Data Isolation & Anti-IDOR Enforcement
- Every tenant resource (`users`, `employees`, `leads`, `customers`, `quotations`, `salesOrders`, `invoices`, `payments`, `products`, `purchases`, `callLogs`, `attendance`, `auditLogs`) contains an `organizationId` tag.
- All CRUD mutation endpoints (`PUT`, `DELETE`, `PATCH`) and individual item fetch endpoints (`GET /:id`, `GET /:id/details`) invoke `assertTenantOwnership`:
  ```typescript
  if (!assertTenantOwnership(entity, req, res, 'ResourceName')) return;
  ```
- If a user from *DeliveryPlus* attempts to view, edit, or delete any resource belonging to *Shiv Shakti*, the request is rejected immediately with `403 Forbidden`.
- **Super Admin** retains global omni-tenant visibility (`req.user?.role === 'SUPER_ADMIN'`) allowing cross-organization oversight, support, and configuration.

### 2.2 Dynamic White-Label Branding Inheritance
- Branding cascades hierarchically: `Organization Master Branding -> Client Admin -> Client Employee`.
- Public branding configuration endpoints:
  - `GET /api/public/branding/:slugOrCode`
  - `GET /api/public/organization-branding/:slugOrCode`
  - `GET /api/public/organizations/:slugOrCode/branding`
- Frontend dynamically sets CSS variables (`--tenant-primary-color`, `--tenant-sidebar-bg`, `--tenant-logo`, etc.) based on the organization bootstrap payload.

### 2.3 Tenant-Partitioned Multi-Branch Geofencing
- Office branch geofencing coordinates and security policies are stored per tenant under `attendance_security_${orgId}`.
- Employee clock-ins are validated in real time using Haversine distance calculations against the employee's assigned organization branches.
- Live selfie photos are required and verified against security policies.

### 2.4 Security & Rate Limiting
- **Brute-Force Guard**: `express-rate-limit` active on all login routes (`/auth/login`, `/auth/super-admin/login`, `/auth/admin/login`, `/auth/employee/login`).
- **HTTP Security Headers**: `helmet` configured for cross-origin security.
- **Tenant Lifecycle**: Suspended organizations (`status === 'SUSPENDED'`) automatically reject non-Super-Admin API traffic with `403 Forbidden`.

### 2.5 Real Telemetry & Database Persistence
- Live Node.js process metrics (`process.uptime()`, `process.memoryUsage()`, heap MB, platform) reported on `/api/superadmin/stats`.
- MongoDB Mongoose schemas with compound indexes (`{ organizationId: 1, email: 1 }`, etc.) located in `craftmedia_backend/database/models/index.ts`.
- Automated database migration utility in `craftmedia_backend/database/mongoMigration.ts`.

---

## 3. Automated Test Suite

A dedicated automated security test runner is available in `craftmedia_backend/test_cross_tenant_suite.ts`.

To execute the test suite:
```bash
cd craftmedia_backend
npm run test:security
```

### Test Coverage (18 Assertions):
1. **Public Branding & App Bootstrap**:
   - `DeliveryPlus` public slug lookup (`200 OK`)
   - `Shiv Shakti` public slug lookup (`200 OK`)
   - Scoped workspace bootstrap (`200 OK`)
2. **Cross-Tenant Data Isolation (Anti-IDOR)**:
   - Tenant-scoped query isolation (`GET /api/leads`)
   - Cross-tenant lead modification attack (`403 Forbidden`)
   - Cross-tenant lead deletion attack (`403 Forbidden`)
   - Cross-tenant customer details inspection attack (`403 Forbidden`)
   - Cross-tenant customer edit attack (`403 Forbidden`)
   - Cross-tenant product modification attack (`403 Forbidden`)
   - Cross-tenant invoice view attack (`403 Forbidden`)
   - Cross-tenant employee salary edit attack (`403 Forbidden`)
3. **Super Admin Omnipresence**:
   - Global organization directory access (`200 OK`)
   - Real-time telemetry reporting (`200 OK`)
   - Global cross-tenant customer inspect (`200 OK`)
4. **Tenant-Scoped Geofencing & Attendance**:
   - Authorized branch clock-in (`200/201 OK`)
   - Out-of-radius geofence rejection (`403 Forbidden`)
5. **Organization Suspension**:
   - Suspended organization blocking (`403 Forbidden`)
6. **Audit Trail Partitioning**:
   - Tenant-filtered audit logs (`200 OK`)
