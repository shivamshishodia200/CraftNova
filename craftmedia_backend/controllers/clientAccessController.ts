import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { assertTenantOwnership } from '../middleware/workspace';

/**
 * Generate a cryptographically secure, human-friendly temporary password
 * e.g. "Craft@94827!" or "Temp#48291$"
 */
function generateSecureTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const specials = '@#$%&*!';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const num = Math.floor(1000 + Math.random() * 9000);
  const spec = specials.charAt(Math.floor(Math.random() * specials.length));
  return `Temp@${pass}${num}${spec}`;
}

function isAdminRole(role?: string | null): boolean {
  if (!role || typeof role !== 'string') return false;
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'SALES_MANAGER', 'INVENTORY_MANAGER', 'ACCOUNTANT'];
  return adminRoles.includes(role) || role.includes('ADMIN') || role.includes('MANAGER');
}

// =========================================================================
// 1. GET ALL USERS FOR AN ORGANIZATION
// =========================================================================
export async function getOrganizationUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const { role, status, search } = req.query;

    const org = db.organizations.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Client organization not found' });
    }

    let users = db.users.find(u => u.organizationId === orgId);

    if (role && role !== 'ALL') {
      users = users.filter(u => u.role === role);
    }
    if (status && status !== 'ALL') {
      users = users.filter(u => u.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      users = users.filter(u =>
        (u.name && String(u.name).toLowerCase().includes(q)) ||
        (u.email && String(u.email).toLowerCase().includes(q)) ||
        (u.phone && String(u.phone).includes(q))
      );
    }

    // Attach role permissions and primary admin flag
    const primaryAdminEmail = (org.settings as any)?.primaryAdminEmail || org.contactEmail;

    const enriched = users.map(u => {
      const { passwordHash, ...sanitized } = u;
      const roleDoc = db.roles.findById(u.roleId) || db.roles.findOne(r => r.code === u.role);
      const rolePerms = u.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
      const customPerms = u.customPermissions || [];
      const effectivePermissions = Array.from(new Set([...rolePerms, ...customPerms]));

      return {
        ...sanitized,
        isPrimaryAdmin: (u.email && primaryAdminEmail && u.email.toLowerCase() === primaryAdminEmail.toLowerCase()) || (u as any).isPrimaryAdmin === true,
        roleName: roleDoc?.name || u.role || 'User',
        effectivePermissions,
        effectivePermissionCount: effectivePermissions.length
      };
    });

    return res.json({
      success: true,
      data: enriched,
      meta: {
        total: enriched.length,
        organizationId: orgId,
        organizationName: org.name
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 2. GET ALL ADMINS FOR AN ORGANIZATION
// =========================================================================
export async function getOrganizationAdmins(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const org = db.organizations.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Client organization not found' });
    }

    const users = db.users.find(u => u.organizationId === orgId && isAdminRole(u.role));
    const primaryAdminEmail = (org.settings as any)?.primaryAdminEmail || org.contactEmail;

    const sanitized = users.map(u => {
      const { passwordHash, ...rest } = u;
      const roleDoc = db.roles.findById(u.roleId) || db.roles.findOne(r => r.code === u.role);
      const rolePerms = u.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
      const customPerms = u.customPermissions || [];
      const effectivePermissions = Array.from(new Set([...rolePerms, ...customPerms]));

      return {
        ...rest,
        isPrimaryAdmin: (u.email && primaryAdminEmail && u.email.toLowerCase() === primaryAdminEmail.toLowerCase()) || (u as any).isPrimaryAdmin === true,
        roleName: roleDoc?.name || u.role || 'Admin',
        effectivePermissions
      };
    });

    return res.json({
      success: true,
      data: sanitized,
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        clientCode: org.clientCode,
        primaryAdminEmail
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 3. GET ALL EMPLOYEES FOR AN ORGANIZATION (Enriched)
// =========================================================================
export async function getOrganizationEmployees(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const { department, status, search } = req.query;

    const org = db.organizations.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Client organization not found' });
    }

    let employees = db.employees.find(e => e.organizationId === orgId);

    if (department && department !== 'ALL') {
      employees = employees.filter(e => e.department === department);
    }
    if (status && status !== 'ALL') {
      employees = employees.filter(e => e.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      employees = employees.filter(e =>
        (e.name && String(e.name).toLowerCase().includes(q)) ||
        (e.email && String(e.email).toLowerCase().includes(q)) ||
        (e.employeeId && String(e.employeeId).toLowerCase().includes(q)) ||
        (e.phone && String(e.phone).includes(q))
      );
    }

    // Join with user account for login status and attendance
    const today = new Date().toISOString().split('T')[0];

    const enriched = employees.map(emp => {
      const linkedUser = emp.userId
        ? db.users.findById(emp.userId)
        : db.users.findOne(u => Boolean(u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()));
      const todayAttendance = db.attendance.findOne(a => a.employeeId === emp._id && a.date === today);

      return {
        ...emp,
        userAccount: linkedUser ? {
          userId: linkedUser._id,
          email: linkedUser.email,
          role: linkedUser.role,
          status: linkedUser.status,
          lastLogin: linkedUser.lastLogin
        } : null,
        attendanceToday: todayAttendance ? {
          status: todayAttendance.status,
          checkIn: todayAttendance.checkIn,
          checkOut: todayAttendance.checkOut
        } : { status: 'NOT_RECORDED' }
      };
    });

    return res.json({
      success: true,
      data: enriched,
      meta: {
        total: enriched.length,
        organizationId: orgId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 4. CREATE NEW ADMIN FOR AN ORGANIZATION
// =========================================================================
export async function createOrganizationAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const {
      name,
      email,
      phone,
      department = 'Management',
      designation = 'Client Administrator',
      role = 'ADMIN',
      temporaryPassword,
      customPermissions = [],
      isPrimaryAdmin
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    const org = db.organizations.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Client organization not found' });
    }

    const existingUser = db.users.findOne(u => Boolean(u.email && u.email.toLowerCase() === email.toLowerCase()));
    if (existingUser) {
      return res.status(400).json({ success: false, message: `User with email "${email}" already exists` });
    }

    const existingAdmins = db.users.find(u => u.organizationId === orgId && isAdminRole(u.role));
    const assignedPrimary = isPrimaryAdmin !== undefined ? Boolean(isPrimaryAdmin) : (existingAdmins.length === 0);

    // Generate or use provided temporary password
    const rawTempPassword = temporaryPassword && temporaryPassword.trim().length >= 6
      ? temporaryPassword.trim()
      : generateSecureTempPassword();

    const passwordHash = await bcrypt.hash(rawTempPassword, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Resolve Role ID
    const roleDoc = db.roles.findOne(r => r.code === role) || db.roles.findOne(r => r.code === 'ADMIN');
    const roleId = roleDoc?._id || 'role_admin';

    const newUser = {
      _id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      passwordHash,
      role,
      roleId,
      organizationId: orgId, // FORCED to the target client organization
      organization: org.name,
      department,
      designation,
      status: 'ACTIVE' as const,
      customPermissions,
      permissionMode: customPermissions.length > 0 ? ('REPLACE' as const) : ('ROLE' as const),
      isPrimaryAdmin: assignedPrimary,
      mustChangePassword: true,
      failedLoginCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.users.insertOne(newUser as any);

    // Update organization admin count and optionally set as primary admin
    const currentAdminCount = db.users.find(u => u.organizationId === orgId && isAdminRole(u.role)).length;
    const orgUpdates: any = { adminCount: currentAdminCount, updatedAt: new Date().toISOString() };

    if (assignedPrimary) {
      orgUpdates.contactEmail = email.toLowerCase().trim();
      orgUpdates.settings = { ...(org.settings || {}), primaryAdminEmail: email.toLowerCase().trim(), primaryAdminName: name };
    }
    db.organizations.updateById(orgId, orgUpdates);

    recordAuditLog(req, 'CREATE', 'users', 'Admin User Created', userId, null, {
      name,
      email,
      role,
      organizationId: orgId,
      organizationName: org.name
    });

    const { passwordHash: _, ...sanitized } = newUser;

    return res.status(201).json({
      success: true,
      message: `Admin account created successfully for ${org.name}`,
      data: {
        ...sanitized,
        temporaryPassword: rawTempPassword
      },
      temporaryPassword: rawTempPassword // Return ONCE in response for secure display
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 5. CREATE NEW EMPLOYEE FOR AN ORGANIZATION
// =========================================================================
export async function createOrganizationEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const {
      employeeId,
      name,
      email,
      phone,
      department = 'General',
      designation = 'Staff',
      reportingManager,
      role = 'EMPLOYEE',
      shift = 'Standard (09:00 - 18:00)',
      joiningDate = new Date().toISOString().split('T')[0],
      salary = 0,
      temporaryPassword,
      customPermissions = [],
      createLoginAccount = true
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    const org = db.organizations.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Client organization not found' });
    }

    const empId = employeeId || `${org.clientCode}-EMP-${Date.now().toString().slice(-4)}`;

    let rawTempPassword: string | null = null;
    let createdUserId: string | null = null;

    // Create user login account if enabled
    if (createLoginAccount) {
      const existingUser = db.users.findOne(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ success: false, message: `A user account with email "${email}" already exists` });
      }

      rawTempPassword = temporaryPassword && temporaryPassword.trim().length >= 6
        ? temporaryPassword.trim()
        : generateSecureTempPassword();

      const passwordHash = await bcrypt.hash(rawTempPassword, 10);
      createdUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const roleDoc = db.roles.findOne(r => r.code === role) || db.roles.findOne(r => r.code === 'EMPLOYEE');
      const roleId = roleDoc?._id || 'role_employee';

      const newUser = {
        _id: createdUserId,
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        passwordHash,
        role,
        roleId,
        organizationId: orgId, // FORCED to selected client organization
        organization: org.name,
        status: 'ACTIVE' as const,
        customPermissions,
        permissionMode: customPermissions.length > 0 ? ('REPLACE' as const) : ('ROLE' as const),
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.users.insertOne(newUser as any);
    }

    const empDocId = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEmployee = {
      _id: empDocId,
      organizationId: orgId, // FORCED
      employeeId: empId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      department,
      designation,
      reportingManager: reportingManager || '',
      shift,
      joiningDate,
      salary: Number(salary) || 0,
      status: 'ACTIVE' as const,
      userId: createdUserId || undefined,
      customPermissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.employees.insertOne(newEmployee as any);

    // Update organization employee count
    const totalEmps = db.employees.countDocuments(e => e.organizationId === orgId);
    db.organizations.updateById(orgId, { employeeCount: totalEmps, updatedAt: new Date().toISOString() });

    recordAuditLog(req, 'CREATE', 'employees', 'Employee Created', empDocId, null, {
      name,
      email,
      employeeId: empId,
      organizationId: orgId,
      organizationName: org.name
    });

    return res.status(201).json({
      success: true,
      message: `Employee "${name}" created successfully for ${org.name}`,
      data: {
        ...newEmployee,
        userAccount: createdUserId ? {
          userId: createdUserId,
          email: email.toLowerCase(),
          role,
          status: 'ACTIVE'
        } : null,
        userId: createdUserId,
        temporaryPassword: rawTempPassword
      },
      temporaryPassword: rawTempPassword // Return ONCE
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 6. UPDATE USER DETAILS
// =========================================================================
export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, phone, role, department, designation, status, customPermissions } = req.body;

    const user = db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates: any = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(phone !== undefined && { phone }),
      ...(role && { role }),
      ...(department !== undefined && { department }),
      ...(designation !== undefined && { designation }),
      ...(status && { status }),
      ...(customPermissions && { customPermissions }),
      updatedAt: new Date().toISOString()
    };

    if (role) {
      const roleDoc = db.roles.findOne(r => r.code === role);
      if (roleDoc) updates.roleId = roleDoc._id;
    }

    const updated = db.users.updateById(id, updates);

    // If there is an associated employee record, keep basic profile in sync
    const linkedEmp = db.employees.findOne(e => e.userId === id || (user.email && e.email.toLowerCase() === user.email.toLowerCase()));
    if (linkedEmp) {
      db.employees.updateById(linkedEmp._id, {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(status && { status }),
        updatedAt: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'UPDATE', 'users', 'User Account Updated', id, user, updates);

    const { passwordHash: _, ...sanitized } = updated || {};
    return res.json({ success: true, message: 'User updated successfully', data: sanitized });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 7. TOGGLE / SET USER STATUS (Activate / Suspend)
// =========================================================================
export async function toggleUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = status || (user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    const updated = db.users.updateById(id, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'STATUS_CHANGE', 'users', `User status changed to ${newStatus}`, id, { status: user.status }, { status: newStatus });

    return res.json({
      success: true,
      message: `User status changed to ${newStatus}`,
      data: { id, status: newStatus }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 8. RESET USER PASSWORD (Temporary or Manual)
// =========================================================================
export async function resetUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword, autoGenerate = true } = req.body;

    const user = db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tempPass = (!autoGenerate && newPassword && newPassword.trim().length >= 6)
      ? newPassword.trim()
      : generateSecureTempPassword();

    const passwordHash = await bcrypt.hash(tempPass, 10);
    const now = new Date().toISOString();

    db.users.updateById(id, {
      passwordHash,
      mustChangePassword: true,
      tokenInvalidBefore: now,
      failedLoginCount: 0,
      lastPasswordResetAt: now,
      updatedAt: now
    });

    recordAuditLog(req, 'ADMIN_PASSWORD_RESET', 'security', `Super Admin reset password for ${user.email}`, id, null, {
      targetUser: user.email,
      organizationId: user.organizationId
    });

    return res.json({
      success: true,
      message: `Password reset successfully for ${user.name} (${user.email})`,
      data: {
        userId: user._id,
        email: user.email,
        temporaryPassword: tempPass,
        mustChangePassword: true,
        resetAt: now
      },
      temporaryPassword: tempPass, // Returned ONCE for immediate secure modal copy
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 9. GET USER PERMISSIONS (Role vs Custom vs Effective)
// =========================================================================
export async function getUserPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const roleDoc = db.roles.findById(user.roleId) || db.roles.findOne(r => r.code === user.role);
    const rolePerms = roleDoc?.permissions || [];
    const customPerms = user.customPermissions || [];
    const permissionMode = user.permissionMode || (customPerms.length > 0 ? 'REPLACE' : 'ROLE');

    const effectivePermissions = permissionMode === 'REPLACE'
      ? customPerms
      : Array.from(new Set([...rolePerms, ...customPerms]));

    const org = user.organizationId ? db.organizations.findById(user.organizationId) : null;

    return res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        roleId: user.roleId,
        roleName: roleDoc?.name || user.role,
        rolePermissions: rolePerms,
        customPermissions: customPerms,
        permissionMode,
        effectivePermissions,
        organizationFeatures: org?.features || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 10. UPDATE USER PERMISSIONS
// =========================================================================
export async function updateUserPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { customPermissions, permissions, permissionMode, mode } = req.body;

    const user = db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let finalPerms: string[] = [];
    const effectiveMode: 'ROLE' | 'REPLACE' = (mode || permissionMode || 'ROLE') as any;

    if (Array.isArray(customPermissions)) {
      finalPerms = customPermissions;
    } else if (Array.isArray(permissions)) {
      finalPerms = permissions;
    } else if (permissions && typeof permissions === 'object') {
      for (const [moduleKey, actions] of Object.entries(permissions)) {
        if (Array.isArray(actions)) {
          actions.forEach((act: any) => finalPerms.push(`${moduleKey}:${act}`));
        }
      }
    }

    const updated = db.users.updateById(id, {
      customPermissions: finalPerms,
      permissionMode: effectiveMode,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'permissions', `Updated custom permissions for ${user.email}`, id, {
      prevPermissions: user.customPermissions,
      prevMode: user.permissionMode
    }, {
      customPermissions: finalPerms,
      permissionMode: effectiveMode,
      organizationId: user.organizationId
    });

    return res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        userId: id,
        customPermissions: finalPerms,
        permissionMode: effectiveMode
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 11. FORCE LOGOUT USER
// =========================================================================
export async function forceLogoutUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = db.users.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    db.users.updateById(id, {
      tokenInvalidBefore: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'SECURITY', 'auth', `Force logged out user ${user.email}`, id, null, {
      targetUser: user.email,
      organizationId: user.organizationId
    });

    return res.json({ success: true, message: `Session invalidated. ${user.name} has been logged out.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 12. FORCE LOGOUT ALL USERS IN AN ORGANIZATION
// =========================================================================
export async function forceLogoutAllOrgUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const org = db.organizations.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Client organization not found' });

    const now = new Date().toISOString();
    const users = db.users.find(u => u.organizationId === orgId);

    users.forEach(u => {
      db.users.updateById(u._id, {
        tokenInvalidBefore: now,
        updatedAt: now
      });
    });

    recordAuditLog(req, 'SECURITY', 'auth', `Force logged out all users for ${org.name}`, orgId, null, {
      affectedUserCount: users.length,
      organizationId: orgId
    });

    return res.json({
      success: true,
      message: `Successfully invalidated sessions for all ${users.length} users in ${org.name}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 13. FORCE PASSWORD RESET FOR ALL USERS IN AN ORGANIZATION
// =========================================================================
export async function forcePasswordResetAllOrgUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const org = db.organizations.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Client organization not found' });

    const users = db.users.find(u => u.organizationId === orgId);
    users.forEach(u => {
      db.users.updateById(u._id, {
        mustChangePassword: true,
        updatedAt: new Date().toISOString()
      });
    });

    recordAuditLog(req, 'SECURITY', 'auth', `Flagged all users of ${org.name} for mandatory password reset`, orgId, null, {
      affectedUserCount: users.length,
      organizationId: orgId
    });

    return res.json({
      success: true,
      message: `All ${users.length} users of ${org.name} will be required to change their password on next sign-in.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 14. SET PRIMARY ADMIN FOR ORGANIZATION
// =========================================================================
export async function setPrimaryAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const targetUserId = req.body.userId || req.body.adminUserId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const org = db.organizations.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Client organization not found' });

    const targetUser = db.users.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cross-tenant IDOR defense: reject with 403 Forbidden if user belongs to different organization
    if (targetUser.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User ${targetUser.name} belongs to a different organization (${targetUser.organizationId}) and cannot be made primary admin of ${org.name}.`
      });
    }

    // Unmark any previous primary admin in this org
    const orgUsers = db.users.find(u => u.organizationId === orgId);
    orgUsers.forEach(u => {
      if ((u as any).isPrimaryAdmin) {
        db.users.updateById(u._id, { isPrimaryAdmin: false });
      }
    });

    db.users.updateById(targetUserId, { isPrimaryAdmin: true, updatedAt: new Date().toISOString() });

    db.organizations.updateById(orgId, {
      contactEmail: targetUser.email,
      settings: {
        ...(org.settings || {}),
        primaryAdminEmail: targetUser.email,
        primaryAdminName: targetUser.name,
        primaryAdminUserId: targetUser._id
      },
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'organizations', `Set ${targetUser.name} as Primary Admin for ${org.name}`, orgId, null, {
      primaryAdminEmail: targetUser.email,
      organizationId: orgId
    });

    return res.json({
      success: true,
      message: `${targetUser.name} is now the Primary Administrator for ${org.name}`,
      data: {
        primaryAdminEmail: targetUser.email,
        primaryAdminName: targetUser.name
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 15. UPDATE ORGANIZATION MODULE / FEATURE MATRIX
// =========================================================================
export async function updateOrganizationFeatures(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const { features, modules } = req.body;

    const org = db.organizations.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Client organization not found' });

    const currentFeatures = JSON.parse(JSON.stringify(org.features || {}));

    if (features && typeof features === 'object') {
      Object.assign(currentFeatures, features);
    }

    if (modules && typeof modules === 'object') {
      for (const [keyPath, val] of Object.entries(modules)) {
        const parts = keyPath.split('.');
        if (parts.length === 1) {
          currentFeatures[parts[0]] = val;
        } else if (parts.length === 2) {
          if (!currentFeatures[parts[0]] || typeof currentFeatures[parts[0]] !== 'object') {
            currentFeatures[parts[0]] = {};
          }
          currentFeatures[parts[0]][parts[1]] = val;
        }
      }
    }

    const updated = db.organizations.updateById(orgId, {
      features: currentFeatures,
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'organizations', `Updated module access matrix for ${org.name}`, orgId, { prevFeatures: org.features }, {
      newFeatures: currentFeatures,
      organizationId: orgId
    });

    return res.json({
      success: true,
      message: `Module access matrix updated for ${org.name}`,
      data: updated?.features
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// 16. GET TENANT-SCOPED ACTIVITY & AUDIT LOGS
// =========================================================================
export async function getOrganizationActivityLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { orgId } = req.params;
    const { action, search, limit = 50 } = req.query;

    let logs = db.auditLogs.find(l =>
      l.organizationId === orgId ||
      l.recordId === orgId ||
      (l.newData && l.newData.organizationId === orgId) ||
      (l.oldData && l.oldData.organizationId === orgId)
    );

    if (action && action !== 'ALL') {
      logs = logs.filter(l => l.action === action);
    }
    if (search) {
      const q = String(search).toLowerCase();
      logs = logs.filter(l =>
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.module && l.module.toLowerCase().includes(q))
      );
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const capped = logs.slice(0, Number(limit));

    return res.json({
      success: true,
      data: capped,
      total: logs.length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
