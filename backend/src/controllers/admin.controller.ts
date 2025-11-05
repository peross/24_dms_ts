import { Response } from 'express';
import { Op } from 'sequelize';
import UserService from '../services/user.service';
import Role from '../models/role.model';
import UserRole from '../models/user-role.model';
import User from '../models/user.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/password.util';

export class AdminController {
  /**
   * Get all users (for admin)
   */
  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
      });

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          const roles = await UserService.getUserRoles(user.userId);
          return {
            ...user.toJSON(),
            roles,
          };
        })
      );

      res.status(200).json({ users: usersWithRoles });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get users' });
    }
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { email, username, password, firstName, lastName, roleNames } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await UserService.createUser({
        email,
        username,
        password,
        firstName,
        lastName,
        roleNames: roleNames || ['member'],
      });

      // Get roles for the new user
      const roles = await UserService.getUserRoles(user.userId);
      const userWithRoles = {
        ...user.toJSON(),
        roles,
      };

      res.status(201).json({ user: userWithRoles });
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('already taken')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to create user' });
      }
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const { email, username, firstName, lastName, password, roleNames } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update basic fields
      if (email !== undefined) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({ where: { email, userId: { [Op.ne]: userId } } });
        if (existingUser) {
          res.status(409).json({ error: 'Email is already taken' });
          return;
        }
        user.email = email;
      }

      if (username !== undefined) {
        // Check if username is already taken by another user
        if (username) {
          const existingUser = await User.findOne({ where: { username, userId: { [Op.ne]: userId } } });
          if (existingUser) {
            res.status(409).json({ error: 'Username is already taken' });
            return;
          }
        }
        user.username = username || null;
      }

      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;

      if (password !== undefined && password) {
        user.password = await hashPassword(password);
      }

      await user.save();

      // Update roles if provided
      if (roleNames !== undefined) {
        await UserService.setRoles(userId, roleNames);
      }

      // Get updated roles
      const roles = await UserService.getUserRoles(userId);
      const userWithRoles = {
        ...user.toJSON(),
        roles,
      };
      delete (userWithRoles as any).password;

      res.status(200).json({ user: userWithRoles });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update user' });
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Prevent deleting yourself
      if (userId === req.user.userId) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await user.destroy();
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const roles = await Role.findAll({
        order: [['name', 'ASC']],
      });

      res.status(200).json({ roles });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get roles' });
    }
  }

  /**
   * Create a new role
   */
  async createRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, description } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Role name is required' });
        return;
      }

      const role = await Role.create({
        name,
        description,
      });

      res.status(201).json({ role });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({ error: 'Role with this name already exists' });
      } else {
        res.status(400).json({ error: error.message || 'Failed to create role' });
      }
    }
  }

  /**
   * Update role
   */
  async updateRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const roleId = parseInt(req.params.id);
      if (isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      const { name, description } = req.body;

      const role = await Role.findByPk(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      if (name !== undefined) role.name = name;
      if (description !== undefined) role.description = description;

      await role.save();

      res.status(200).json({ role });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({ error: 'Role with this name already exists' });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update role' });
      }
    }
  }

  /**
   * Delete role
   */
  async deleteRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const roleId = parseInt(req.params.id);
      if (isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Check if role is being used by any users
      const userRoleCount = await UserRole.count({ where: { roleId } });
      if (userRoleCount > 0) {
        res.status(400).json({ error: 'Cannot delete role that is assigned to users' });
        return;
      }

      await role.destroy();
      res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete role' });
    }
  }

  /**
   * Get all user-role assignments
   */
  async getUserRoles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userRoles = await UserRole.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['userId', 'email', 'username', 'firstName', 'lastName'],
          },
          {
            model: Role,
            as: 'role',
            attributes: ['roleId', 'name', 'description'],
          },
        ],
        order: [['userId', 'ASC'], ['roleId', 'ASC']],
      });

      res.status(200).json({ userRoles });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get user roles' });
    }
  }
}

export default new AdminController();

