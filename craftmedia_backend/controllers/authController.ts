import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

export async function superAdminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedInput = email.toLowerCase().trim();
    const user = db.users.findOne(u => u.email.toLowerCase() === normalizedInput);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact system administration.`
      });
    }

    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // STRICT SECURITY: Must be SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'ROLE_MISMATCH',
        message: 'Access denied. Only Platform Super Administrators are authorized for this portal.'
      });
    }

    db.users.updateById(user._id, { lastLogin: new Date().toISOString() });

    const authenticatedUser = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: 'SUPER_ADMIN',
      roleId: user.roleId,
      permissions: ['*'],
      organizationId: null,
      organization: '360CRM Platform Global',
      avatar: user.avatar,
      isSuperAdmin: true
    };

    const token = generateToken(authenticatedUser);
    const authReq = req as AuthenticatedRequest;
    authReq.user = authenticatedUser;
    recordAuditLog(authReq, 'LOGIN', 'Authentication', `Super Admin ${user.name} logged into Platform Portal`);

    return res.json({
      success: true,
      message: 'Super Admin login successful',
      data: {
        token,
        user: authenticatedUser,
        portal: 'SUPER_ADMIN'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const slugOrCode = String(req.body.organizationSlug || req.params.organizationSlug || '').toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin email and password are required.'
      });
    }

    const normalizedInput = email.toLowerCase().trim();
    const user = db.users.findOne(u => u.email.toLowerCase() === normalizedInput);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Admin account does not exist.'
      });
    }

    // Resolve Organization
    let org = null;
    if (slugOrCode) {
      org = db.organizations.findOne(
        o => o.slug.toLowerCase() === slugOrCode ||
             o.clientCode.toLowerCase() === slugOrCode ||
             o._id.toLowerCase() === slugOrCode
      );

      if (!org) {
        return res.status(404).json({
          success: false,
          code: 'ORGANIZATION_NOT_FOUND',
          message: `Organization '${slugOrCode}' not found.`
        });
      }
    } else {
      // Auto-resolve organization from user profile
      if (user.organizationId) {
        org = db.organizations.findById(user.organizationId);
      }
      if (!org) {
        org = db.organizations.findOne(o => o.slug === 'craftmedia') || db.organizations.getAll()[0];
      }
    }

    if (org && org.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_SUSPENDED',
        message: 'Your organization workspace has been suspended. Please contact platform administration.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`
      });
    }

    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Role check: Must be ADMIN or SUPER_ADMIN
    if (user.role !== 'ADMIN' && !isSuperAdmin) {
      if (user.role === 'EMPLOYEE' || user.role === 'HR_EMPLOYEE') {
        return res.status(403).json({
          success: false,
          code: 'ROLE_MISMATCH',
          message: 'This account is registered as an Employee. Please switch to the Employee Portal to log in.'
        });
      }
      return res.status(403).json({
        success: false,
        code: 'ROLE_MISMATCH',
        message: 'Access denied. This portal is restricted to Organization Administrators only.'
      });
    }

    // STRICT TENANT ISOLATION: For regular admins, must belong to THIS organization
    if (!isSuperAdmin && user.organizationId !== org._id) {
      const userOrg = db.organizations.findById(user.organizationId || '')?.name || 'another organization';
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_MISMATCH',
        message: `Unauthorized. This admin account belongs to ${userOrg}, not ${org.name}.`
      });
    }

    db.users.updateById(user._id, { lastLogin: new Date().toISOString() });

    const roleDoc = db.roles.findById(user.roleId) || db.roles.findOne(r => r.code === user.role);
    const rolePerms = user.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
    const customPerms = user.customPermissions || [];
    const permissions = isSuperAdmin ? ['*'] : Array.from(new Set([...rolePerms, ...customPerms]));

    const authenticatedUser = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
      roleId: user.roleId,
      permissions,
      organizationId: org._id,
      organization: org.name,
      avatar: user.avatar,
      isSuperAdmin
    };

    const token = generateToken(authenticatedUser);
    const authReq = req as AuthenticatedRequest;
    authReq.user = authenticatedUser;
    recordAuditLog(authReq, 'LOGIN', 'Authentication', `${isSuperAdmin ? 'Super Admin' : 'Admin'} ${user.name} logged into ${org.name} Workspace`);

    return res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: authenticatedUser,
        organization: {
          id: org._id,
          name: org.name,
          slug: org.slug,
          clientCode: org.clientCode
        },
        portal: 'ADMIN'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function employeeLogin(req: Request, res: Response) {
  try {
    const inputIdentifier = String(req.body.identifier || req.body.email || req.body.employeeId || '').trim();
    const password = req.body.password;
    const slugOrCode = String(req.body.organizationSlug || req.params.organizationSlug || '').toLowerCase().trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID/Email and password are required.'
      });
    }

    const normalizedInput = inputIdentifier.toLowerCase();

    // Check by employeeId in db.employees first if applicable
    const empDoc = db.employees.findOne(
      e => e.employeeId?.toLowerCase() === normalizedInput ||
           (e as any).employeeCode?.toLowerCase() === normalizedInput ||
           e.email?.toLowerCase() === normalizedInput ||
           e.userId === inputIdentifier
    );

    // Find in db.users
    const user = db.users.findOne(u => {
      const uEmail = u.email.toLowerCase();
      return uEmail === normalizedInput ||
             (empDoc && u._id === empDoc.userId) ||
             (empDoc && uEmail === empDoc.email.toLowerCase()) ||
             u._id === inputIdentifier;
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Employee user account not found.'
      });
    }

    // Resolve Organization
    let org = null;
    if (slugOrCode) {
      org = db.organizations.findOne(
        o => o.slug.toLowerCase() === slugOrCode ||
             o.clientCode.toLowerCase() === slugOrCode ||
             o._id.toLowerCase() === slugOrCode
      );

      if (!org) {
        return res.status(404).json({
          success: false,
          code: 'ORGANIZATION_NOT_FOUND',
          message: `Organization '${slugOrCode}' not found.`
        });
      }
    } else {
      if (user.organizationId) {
        org = db.organizations.findById(user.organizationId);
      } else if (empDoc && empDoc.organizationId) {
        org = db.organizations.findById(empDoc.organizationId);
      }
      if (!org) {
        org = db.organizations.findOne(o => o.slug === 'craftmedia') || db.organizations.getAll()[0];
      }
    }

    if (org && org.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_SUSPENDED',
        message: 'Your company workspace has been suspended. Please contact your administrator.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact HR administrator.`
      });
    }

    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee credentials or password.'
      });
    }

    // STRICT SECURITY: Must be EMPLOYEE role
    const employeeRoles = ['EMPLOYEE', 'HR_EMPLOYEE', 'SALES_EMPLOYEE', 'STORE_EMPLOYEE', 'ACCOUNTANT'];
    if (!employeeRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_MISMATCH',
        message: 'Access denied. This portal is restricted to Employees only. Admins should use the Admin Portal.'
      });
    }

    // STRICT TENANT ISOLATION: Must belong to THIS organization
    if (user.organizationId !== org._id) {
      const userOrg = db.organizations.findById(user.organizationId || '')?.name || 'another company';
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_MISMATCH',
        message: `Unauthorized. Employee belongs to ${userOrg}, not ${org.name}.`
      });
    }

    db.users.updateById(user._id, { lastLogin: new Date().toISOString() });

    const roleDoc = db.roles.findById(user.roleId) || db.roles.findOne(r => r.code === user.role);
    const rolePerms = user.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
    const customPerms = user.customPermissions || [];
    const permissions = Array.from(new Set([...rolePerms, ...customPerms]));

    const authenticatedUser = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleId: user.roleId,
      permissions,
      organizationId: org._id,
      organization: org.name,
      avatar: user.avatar
    };

    const token = generateToken(authenticatedUser);
    const authReq = req as AuthenticatedRequest;
    authReq.user = authenticatedUser;
    recordAuditLog(authReq, 'LOGIN', 'Authentication', `Employee ${user.name} logged into ${org.name} Workstation`);

    return res.json({
      success: true,
      message: 'Employee login successful',
      data: {
        token,
        user: authenticatedUser,
        organization: {
          id: org._id,
          name: org.name,
          slug: org.slug,
          clientCode: org.clientCode
        },
        portal: 'EMPLOYEE',
        employee: empDoc || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password, expectedPortal, organizationSlug } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // If expectedPortal specified, delegate to dedicated controller
    if (expectedPortal === 'SUPER_ADMIN') {
      return superAdminLogin(req, res);
    } else if (expectedPortal === 'ADMIN') {
      return adminLogin(req, res);
    } else if (expectedPortal === 'EMPLOYEE') {
      return employeeLogin(req, res);
    }

    const normalizedInput = email.toLowerCase().trim();
    const aliasInput = normalizedInput.includes('@craftmediahub.com')
      ? normalizedInput.replace('@craftmediahub.com', '@360crm.com')
      : normalizedInput.replace('@360crm.com', '@craftmediahub.com');

    const user = db.users.findOne(u => {
      const uEmail = u.email.toLowerCase();
      return uEmail === normalizedInput || uEmail === aliasInput;
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`
      });
    }

    // Check password
    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Update last login
    db.users.updateById(user._id, {
      lastLogin: new Date().toISOString()
    });

    // Check organization status for non-superadmins
    const userOrgId = user.role === 'SUPER_ADMIN' ? null : (user.organizationId || 'org_craftmedia');
    if (user.role !== 'SUPER_ADMIN' && userOrgId) {
      const org = db.organizations.findById(userOrgId);
      if (org && org.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          code: 'ORGANIZATION_SUSPENDED',
          message: 'Your organization workspace is suspended. Please contact platform administration.'
        });
      }
    }

    // Compute effective permissions
    const roleDoc = db.roles.findById(user.roleId) || db.roles.findOne(r => r.code === user.role);
    const rolePerms = user.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
    const customPerms = user.customPermissions || [];
    const permissions = Array.from(new Set([...rolePerms, ...customPerms]));

    const authenticatedUser = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleId: user.roleId,
      permissions,
      organizationId: userOrgId,
      organization: user.organization,
      avatar: user.avatar
    };

    const token = generateToken(authenticatedUser);

    const authReq = req as AuthenticatedRequest;
    authReq.user = authenticatedUser;
    recordAuditLog(authReq, 'LOGIN', 'Authentication', `User ${user.name} (${user.role}) logged in successfully`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: authenticatedUser
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function getDemoUsers(req: Request, res: Response) {
  try {
    const users = db.users.getAll()
      .filter(user => user.status === 'ACTIVE' && user.showOnLogin !== false)
      .map(({ _id, name, email, role, avatar }) => ({ _id, name, email, role, avatar }));

    return res.json({ success: true, data: users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = db.users.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const roleDoc = db.roles.findById(user.roleId) || db.roles.findOne(r => r.code === user.role);
    const rolePerms = user.permissionMode === 'REPLACE' ? [] : (roleDoc?.permissions || []);
    const customPerms = user.customPermissions || [];
    const permissions = Array.from(new Set([...rolePerms, ...customPerms]));

    const userOrgId = user.role === 'SUPER_ADMIN' ? null : (user.organizationId || 'org_craftmedia');

    return res.json({
      success: true,
      data: {
        userId: user._id,
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        roleId: user.roleId,
        permissions,
        organizationId: userOrgId,
        organization: user.organization,
        avatar: user.avatar,
        status: user.status,
        lastLogin: user.lastLogin
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function switchDemoUser(req: Request, res: Response) {
  return res.status(403).json({
    success: false,
    code: 'FEATURE_DISABLED',
    message: 'Demo switching is permanently disabled in production mode. Please use official login portals.'
  });
}
