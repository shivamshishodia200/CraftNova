import { Response } from 'express';
import { db } from '../database/db';
import { ALL_PERMISSIONS } from '../database/permissionsList';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

export async function getAllRoles(req: AuthenticatedRequest, res: Response) {
  try {
    const roles = db.roles.getAll();
    return res.json({ success: true, data: roles });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, code, description, permissions } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Role name and role code are required.'
      });
    }

    const existing = db.roles.findOne(r => r.code === code.toUpperCase());
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A role with code '${code}' already exists.`
      });
    }

    const newRole = db.roles.insertOne({
      name,
      code: code.toUpperCase(),
      description: description || '',
      isSystem: false,
      permissions: Array.isArray(permissions) ? permissions : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'Roles', `Created custom role '${name}' (${code})`, newRole._id, undefined, newRole);

    return res.json({
      success: true,
      message: 'Role created successfully',
      data: newRole
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = db.roles.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (permissions !== undefined && Array.isArray(permissions)) {
      updates.permissions = permissions;
    }

    const updated = db.roles.updateById(id, updates);

    recordAuditLog(req, 'UPDATE', 'Roles', `Updated role '${role.name}'`, id, role, updated);

    return res.json({
      success: true,
      message: 'Role updated successfully',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const grouped = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((groups, permission) => {
      const category = permission.category || 'Other';
      groups[category] = groups[category] || [];
      groups[category].push(permission);
      return groups;
    }, {});

    return res.json({
      success: true,
      data: {
        all: ALL_PERMISSIONS,
        grouped
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
