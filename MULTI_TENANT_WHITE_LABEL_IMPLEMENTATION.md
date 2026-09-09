# 360CRM Enterprise — Multi-Tenant & White-Label Architecture

## 1. Executive Summary & Core Hierarchy

360CRM has been transformed into an enterprise-grade, single-codebase **Multi-Tenant and White-Label SaaS CRM/ERP platform**. The entire system operates on a single frontend build, a single backend runtime, and a single database instance with strict logical isolation, dynamic CSS theme injection, feature-flag entitlement gating, and automated hierarchical branding inheritance.

### Platform Hierarchy
```
                        SUPER ADMIN
              (Owner of Platform / System Root)
               • organizationId = null (Global)
               • Access to SuperAdminPortal
               • Creates & Manages Client Organizations
               • Configures White-Label Branding & Colors
               • Configures Module & Feature Access Matrix
               • Can Preview Any Client Workspace Live
                                │
                                ▼
                   ORGANIZATION / CLIENT TENANT
                  (e.g., Craft Media Hub, DeliveryPlus, 360)
               • Unique Slug (subdomain / URL routing)
               • Unique Client Code (CMH, DELIV)
               • Custom Theme Colors (Primary, Accent, Sidebar, Header)
               • Custom Logos, Favicons, Login Page Content
               • Dedicated Feature Entitlements & Storage Quotas
                                │
                                ▼
                     CLIENT ADMINISTRATOR
               • Inherits req.user.organizationId automatically
               • Governs client-level Users, Roles & Master Data
               • Cannot view or access other client organizations
               • Onboards Employees without selecting organization
                                │
                                ▼
                     CLIENT EMPLOYEES & STAFF
               • Inherits req.user.organizationId automatically
               • Receives client-specific branding, logos & colors
               • Access restricted to permitted client modules only
```

---

## 2. White-Label Branding & Dynamic CSS Theming

Rather than compiling separate frontends or writing tenant-specific CSS stylesheets, 360CRM leverages **Real-Time Dynamic CSS Custom Properties (Variables)** driven by React's `OrganizationContext`.

### Supported Branding Tokens
Each client organization defines an `OrganizationBranding` profile containing:
- **`companyName`**: Displayed on sidebar headers, document printouts, navigation titles, and browser tabs.
- **`primaryColor`**: Applied via `--brand-primary` to active states, main action buttons, badges, and progress bars.
- **`secondaryColor`**: Applied via `--brand-secondary` to dark container backgrounds and secondary buttons.
- **`accentColor`**: Applied via `--brand-accent` to highlight badges, metric trends, and hover states.
- **`sidebarBackground`**: Applied via `--sidebar-bg` to sidebars and dark navigation drawers.
- **`sidebarTextColor`**: Applied via `--sidebar-text` to sidebar inactive links.
- **`sidebarActiveColor`**: Applied via `--sidebar-active` to the active route item indicator.
- **`headerBackground`**: Applied via `--header-bg` to application topbars.
- **`headerTextColor`**: Applied via `--header-text` to application topbar labels.
- **`surfaceColor`**: Applied via `--surface-bg` to cards and modal surfaces.
- **`borderRadius`**: Applied via `--brand-radius` (e.g. `6px`, `10px`, `12px`, `16px`).
- **`logoUrl`**: Displayed via `<DynamicBrandLogo />`. If absent, generates an SVG monogram emblem with client initials and primary brand gradient.
- **`faviconUrl`**: Dynamically injected into `document.querySelector("link[rel='icon']")`.
- **`loginTitle` & `loginSubtitle`**: Rendered on the white-labeled login screen.

### CSS Injection Flow
Upon user authentication or public branding lookup, `applyBrandingToDOM()` injects properties into `document.documentElement.style`:
```typescript
root.style.setProperty('--brand-primary', branding.primaryColor);
root.style.setProperty('--sidebar-bg', branding.sidebarBackground);
root.style.setProperty('--sidebar-active', branding.sidebarActiveColor || branding.primaryColor);
root.style.setProperty('--header-bg', branding.headerBackground);
document.title = `${branding.companyName} | 360CRM Enterprise`;
```

---

## 3. White-Label Login Routing

Clients can distribute a customized login link to their staff and admins:
```
http://<crm-domain>/?org=<client-slug>
```
Example: `http://localhost:5180/?org=deliveryplus`

### Login Flow:
1. `LoginPage.tsx` inspects `URLSearchParams` for `org` or `client`.
2. If present, it executes an unauthenticated fetch to `/api/public/branding/:slugOrCode`.
3. The page dynamically re-themes itself with that client's colors, logo, and title before the user even enters credentials.
4. When credentials are submitted, the backend verifies the user's assigned `organizationId` matches the requested organization (preventing cross-organization credential spraying).
5. If the organization has status `SUSPENDED`, login is immediately rejected with code `ORGANIZATION_SUSPENDED`.

---

## 4. Multi-Tenant Data Isolation Architecture

All operational collections across the backend database include an indexed `organizationId` field.

### Database Collections Isolated:
- `users`
- `employees`
- `leads`
- `customers`
- `quotations`
- `salesOrders`
- `invoices`
- `payments`
- `expenses`
- `creditNotes`
- `purchases`
- `suppliers`
- `products`
- `inventory`
- `stockTransactions`
- `attendance`
- `workSessions`
- `recordingSegments`
- `activityTimeline`
- `tasks`
- `messages`
- `callLogs`

### Tenant Isolation Rules:
1. **Never Trust Client Body**:
   Any `organizationId` passed in `req.body` or `req.query` by a non-Super-Admin user is **strictly ignored and stripped**. The system unconditionally forces `organizationId = req.user.organizationId`.
2. **Read Filtering via `filterByWorkspace`**:
   All read queries automatically append `{ organizationId: req.user.organizationId }`. Super Admins (`req.user.role === 'SUPER_ADMIN'`) have `organizationId: null` and can inspect all records globally.
3. **Cross-Tenant Prevention via `isItemInWorkspace`**:
   Direct access by ID (e.g. `GET /employees/:id`, `GET /leads/:id`) executes `isItemInWorkspace(item, req)`. If `item.organizationId !== req.user.organizationId`, the request is immediately aborted with HTTP 404 or HTTP 403.

---

## 5. Non-Destructive Data Migration

On backend startup, `runMultiTenantMigration()` in `craftmedia_backend/database/migration.ts` automatically executes once:
1. **Ensures Default Organization**:
   Checks for the existence of `Craft Media Hub` (`_id: 'org_craftmedia'`, `slug: 'craft-media-hub'`, `clientCode: 'CMH'`). If not found, it is seeded with full platform features and warm gold/noir branding.
2. **Backfills Historical Records**:
   Scans every record in `users`, `employees`, `leads`, `customers`, `products`, `invoices`, `workSessions`, etc. Any record lacking an `organizationId` is safely updated with `organizationId: 'org_craftmedia'`.
3. **Preserves Platform Super Admin**:
   Sets `usr_superadmin.organizationId = null`, ensuring the platform owner retains global governance across all tenants.

---

## 6. Automatic Organization Inheritance for Employees

When a Client Admin onboards an employee in the CRM portal:
- **No Organization Selector is displayed**: The Admin is not asked which client organization the employee belongs to.
- **Automatic Binding**: The backend `createEmployee` endpoint calls `attachWorkspaceContext(empData, req)`.
- **Inherited User Account**: The associated login user document is generated with `organizationId = req.user.organizationId`.
- **Automatic Theming**: When the employee logs in, `/app/bootstrap` returns the client's branding; the employee instantly sees the exact company branding configured by the Super Admin.

---

## 7. Granular Feature Guard & Module Entitlements

Module access is governed at two layers:
1. **Organization Entitlement Layer (`requireFeature`)**: Configured by the Super Admin. If an organization has not purchased or enabled a module (e.g. `hr.workRecording = false`), no user in that client can access it, regardless of user-level role.
2. **User Role Permission Layer (`requirePermission`)**: Governs user-level RBAC actions (e.g. `leads.create`, `employees.delete`).

### Supported Feature Matrix:
- `dashboard`
- `crm.leads`
- `crm.customers`
- `crm.followUps`
- `sales.quotations`
- `sales.salesOrders`
- `sales.reports`
- `inventory.products`
- `inventory.categories`
- `inventory.warehouses`
- `inventory.stockInOut`
- `inventory.purchases`
- `inventory.suppliers`
- `accounts.invoices`
- `accounts.payments`
- `accounts.expenses`
- `accounts.creditNotes`
- `accounts.reports`
- `hr.employees`
- `hr.attendance`
- `hr.liveTracking`
- `hr.workRecording`
- `hr.leave`
- `hr.salary`
- `hr.performance`
- `marketing.campaigns`
- `marketing.tradeIndia`
- `marketing.whatsApp`
- `integrations`
- `reports`

---

## 8. Client Suspension & Instant Lockout

The Super Admin can suspend any client organization at any time from the Super Admin Portal.
- **Immediate Rejection**: The `authenticateToken` middleware verifies the organization's status in the database on every authenticated API request.
- If `status === 'SUSPENDED'`, all requests from all users belonging to that organization are instantly blocked with HTTP 403 (`ORGANIZATION_SUSPENDED`).
- Reactivation instantly restores access without data loss.

---

## 9. Super Admin Organization Management Suite

The Super Admin Portal includes a dedicated **"Clients & Organizations"** workspace (`OrganizationManagementView.tsx`):
- **Client Cards & Overview**: Real-time status indicators, brand palette swatches, enabled module tags, and white-label login copy links.
- **7-Step Client Creation Wizard**:
  1. *Organization Identity*: Company name, client code, subdomain slug, industry, contact details.
  2. *Brand Identity*: Brand display name, primary logo URL, favicon URL, custom login title and subtitles.
  3. *Live Theme Builder*: Interactive color pickers (primary, accent, secondary, sidebar, header, radius) with an adjacent **real-time component canvas** displaying a live mini-sidebar, header, KPI cards, and buttons updating instantaneously.
  4. *Feature Matrix*: Categorized toggles with Master Category switches for all platform modules.
  5. *Primary Administrator Setup*: Automatic provisioning of the client's initial Admin account.
  6. *Review & Verification*: Full configuration summary.
  7. *Launch*: Creates the tenant organization and administrator in a single transactional operation.
- **Super Admin Preview Mode**:
  Super Admins can click "Preview Workspace" on any client card. This sets `previewOrg` in `OrganizationContext`, activating that client's CSS variables, branding, and feature matrix while displaying a persistent top banner:
  `[PREVIEW MODE: Simulating client workspace: DeliveryPlus (DELIV)] [Exit Preview]`.

---

## 10. Automated Verification Results

A comprehensive automated test suite (`craftmedia_backend/test_multi_tenant_complete.ts`) was constructed and executed against the live multi-tenant backend server.

### Test Execution Summary:
| Test Step | Description | Result |
|---|---|---|
| **Step 1** | Super Admin Authentication & Global Scope (`organizationId: null`) | **PASSED** (HTTP 200) |
| **Step 2** | Client Organizations Creation & Provisioning (Craft Media & DeliveryPlus) | **PASSED** (HTTP 200) |
| **Step 3** | Public White-Label Branding Endpoints (`/public/branding/:slug`) | **PASSED** (Distinct branding verified) |
| **Step 4** | Client Admin Login & Automatic Branding Inheritance | **PASSED** (HTTP 200) |
| **Step 5** | Automatic Employee Organization Inheritance (No Org Picker) | **PASSED** (organizationId auto-assigned) |
| **Step 6** | Strict Cross-Tenant Data Isolation (Leads & Employees) | **PASSED** (Cross-tenant visibility = 0) |
| **Step 7** | Client-Supplied `organizationId` Tamper Resistance | **PASSED** (Malicious payload overridden) |
| **Step 8** | Backend Feature Guard Enforcement (`workRecording` disabled) | **PASSED** (HTTP 403 `FEATURE_DISABLED`) |
| **Step 9** | Instant Client Suspension Lockout & Reactivation | **PASSED** (HTTP 403 `ORGANIZATION_SUSPENDED`) |
| **Compiler** | Full TypeScript Typecheck (`npx tsc --noEmit`) | **PASSED** (0 errors) |

---

## 11. Conclusion

The 360CRM platform is now fully equipped for commercial SaaS multi-tenant distribution. Super Admins can onboard unlimited client organizations with completely custom white-label appearances and tailored module packages, while maintaining total data security and operational isolation within a single unified codebase.
