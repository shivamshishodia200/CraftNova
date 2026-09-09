# 360CRM Enterprise — Theme Color Audit & Token Mapping Report
## Audit of Hardcoded Client Colors vs Dynamic Theme Tokens

---

### 1. Objective of Audit
To ensure true multi-tenant white-label capability across the entire CRM/ERP suite, all tenant brand components must be driven by runtime CSS custom properties rather than hardcoded tailwind amber/orange classes (`#F59E0B`, `bg-amber-500`, `from-amber-500`, etc.), while strictly preserving functional semantic indicators (Green = Success, Red = Danger, Amber = Warning/Caution).

---

### 2. Color Token Classification Architecture

| Category | Token Source | Behavior Across Tenants | Example Usage |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `var(--brand-primary)` | Inherited dynamically from Organization configuration | Primary buttons, active tabs, brand icons |
| **Brand Primary Soft** | `var(--brand-primary-soft)` | 12% alpha dynamically derived | Pill backgrounds, highlight row backgrounds |
| **Brand Primary Text** | `var(--brand-primary-text)` | WCAG contrast calculated (`#FFFFFF` or `#0F172A`) | Text rendered on top of primary color buttons |
| **Sidebar Active Tab** | `var(--sidebar-active-bg)` | Configured sidebar active or primary color | Active menu item in `AdminSidebar` |
| **Sidebar Active Text** | `var(--sidebar-active-text)` | WCAG contrast calculated against active tab | Text and icon of active navigation item |
| **Semantic Success** | Emerald / Green | Fixed standard semantic color | Active status, Clock-in, Connected indicators |
| **Semantic Danger** | Rose / Red | Fixed standard semantic color | Errors, Delete actions, Disconnected indicators |
| **Semantic Warning** | Amber / Yellow | Fixed standard semantic color | Contrast alerts, Suspension notices, Warning badges |

---

### 3. Component Color Audit Matrix

| Component File | Previous Hardcoded Color / Class | Updated Dynamic CSS Custom Property | Status |
| :--- | :--- | :--- | :--- |
| `craftmedia_admin/components/AdminSidebar.tsx` | `bg-gradient-to-r from-amber-500 to-rose-500` | `backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-text)'` | **Migrated** |
| `craftmedia_admin/components/AdminSidebar.tsx` | `bg-amber-500/20 text-amber-400 border-amber-500/30` | `backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)'` | **Migrated** |
| `craftmedia_admin/components/AdminSidebar.tsx` | `bg-amber-500` notification count badge | `backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)'` | **Migrated** |
| `craftmedia_admin/components/AdminHeader.tsx` | `bg-gradient-to-tr from-amber-500 to-orange-600` | `backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)'` | **Migrated** |
| `craftmedia_admin/components/AdminHeader.tsx` | `bg-amber-500/10 text-amber-400 border-amber-500/20` | `backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)'` | **Migrated** |
| `src/App.tsx` | `border-t-amber-500` in initial page spinner | `border-slate-800 border-t-slate-400` (neutral, flash-free) | **Migrated** |
| `src/components/auth/AdminLogin.tsx` | N/A (New Component) | Dynamic gradient using `branding.secondaryColor` + `var(--brand-primary)` | **Clean** |
| `src/components/auth/EmployeeLogin.tsx` | N/A (New Component) | Dynamic workday card using `var(--brand-primary)` + `var(--brand-primary-text)` | **Clean** |
| `src/components/auth/SuperAdminLogin.tsx` | N/A (New Component) | Enterprise dark slate & navy (`#0B132B`, `#2563EB`) - isolated from tenant theme | **Clean** |

---

### 4. WCAG Contrast Compliance Verification
The color engine automatically checks the relative luminance of `--brand-primary` using the official W3C formula:
$$L = 0.2126 \cdot R_{sRGB} + 0.7152 \cdot G_{sRGB} + 0.0722 \cdot B_{sRGB}$$
$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

- When a dark or saturated primary color (e.g. `#0284C7`, `#6366F1`, `#0F766E`) is configured, text color is `#FFFFFF` (contrast $\ge 4.5:1$).
- When a light or high-luminance color (e.g. `#FACC15`, `#EAB308`, `#A3E635`) is configured, text color automatically shifts to `#0F172A` (dark slate), preventing unreadable white text on yellow buttons.
- In the Super Admin Theme Builder (Step 3), an interactive warning indicator warns the Super Admin if their chosen palette has low contrast before saving.
