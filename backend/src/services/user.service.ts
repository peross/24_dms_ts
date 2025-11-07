import { Transaction } from 'sequelize';
import User from '../models/user.model';
import Role from '../models/role.model';
import UserRole from '../models/user-role.model';
import { sequelize } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password.util';

export interface CreateUserDto {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleNames?: string[];
}

export interface LoginDto {
  emailOrUsername: string; // Can be either email or username
  password: string;
}

export class UserService {
  async createUser(data: CreateUserDto): Promise<User> {
    const transaction = await sequelize.transaction();

    try {
      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({ where: { email: data.email }, transaction });
      if (existingUserByEmail) {
        throw new Error('User with this email already exists');
      }

      // Check if username is provided and if it already exists
      if (data.username) {
        const existingUserByUsername = await User.findOne({ where: { username: data.username }, transaction });
        if (existingUserByUsername) {
          throw new Error('Username is already taken');
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await User.create({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      }, { transaction });

      const roleNames = data.roleNames && data.roleNames.length > 0 ? data.roleNames : ['member'];
      await this.replaceUserRoles(user.userId, roleNames, transaction);

      await transaction.commit();

      const createdUser = await this.findById(user.userId);
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }

      return createdUser;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await User.findOne({ where: { username } });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    // Try to find by email first
    const userByEmail = await User.findOne({ where: { email: emailOrUsername } });
    if (userByEmail) {
      return userByEmail;
    }

    // If not found by email, try username
    const userByUsername = await User.findOne({ where: { username: emailOrUsername } });
    return userByUsername;
  }

  async findById(userId: number): Promise<User | null> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return null;
    }

    // Get roles from user_roles table
    const roles = await this.getUserRoles(userId);
    
    // Add roles as array of strings to match frontend User interface
    (user as any).roles = roles;

    return user;
  }

  /**
   * Get user roles by querying the user_roles join table
   */
  async getUserRoles(userId: number): Promise<string[]> {
    // Query roles through the user_roles join table
    const userRoles = await UserRole.findAll({
      where: { userId },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!userRoles || userRoles.length === 0) {
      console.log(`No roles found for user ${userId}`);
      return [];
    }

    const roles = userRoles
      .map((userRole) => {
        // Handle both direct access and JSON serialization
        const role = (userRole as any).role || (userRole as any).get?.('role');
        return role?.name || role?.dataValues?.name;
      })
      .filter((name): name is string => !!name);

    console.log(`Roles for user ${userId}:`, roles);
    return roles;
  }

  async assignRoles(userId: number, roleNames: string[]): Promise<void> {
    await this.replaceUserRoles(userId, roleNames);
  }

  /**
   * Replace all user roles with new ones
   * First removes all existing roles, then assigns new ones
   */
  async setRoles(userId: number, roleNames: string[]): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.replaceUserRoles(user.userId, roleNames);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await comparePassword(password, user.password);
  }

  async getUserProfile(userId: number): Promise<User | null> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return null;
    }

    // Get roles from user_roles table
    const roles = await this.getUserRoles(userId);
    
    // Convert to JSON and add roles as array of strings
    const userJson = user.toJSON();
    (userJson as any).roles = roles;

    // Return the plain object with roles included
    return userJson as User;
  }

  async updateProfile(userId: number, data: { email?: string; username?: string; firstName?: string; lastName?: string }): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: data.email } });
      if (existingUser) {
        throw new Error('Email is already taken');
      }
    }

    // Check if username is being changed and if it's already taken
    if (data.username !== undefined && data.username !== user.username) {
      // Allow clearing username (set to null/empty)
      if (data.username && data.username.trim() !== '') {
        // Validate username format (alphanumeric and underscore, 3-30 chars)
        if (!/^\w+$/.test(data.username)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
        if (data.username.length < 3 || data.username.length > 30) {
          throw new Error('Username must be between 3 and 30 characters');
        }

        const existingUser = await User.findOne({ where: { username: data.username } });
        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }
    }

    // Update user fields
    if (data.email !== undefined) user.email = data.email;
    if (data.username !== undefined) user.username = data.username && data.username.trim() !== '' ? data.username.trim() : undefined;
    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;

    await user.save();

    // Return updated user without password
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    return updatedUser;
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.verifyPassword(user, currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();
  }

  private async replaceUserRoles(userId: number, roleNames: string[], transaction?: Transaction): Promise<void> {
    const uniqueRoleNames = Array.from(new Set(roleNames));

    const roles = await Role.findAll({
      where: { name: uniqueRoleNames },
      transaction,
    });

    if (roles.length !== uniqueRoleNames.length) {
      throw new Error('One or more roles not found');
    }

    await UserRole.destroy({
      where: { userId },
      transaction,
    });

    if (roles.length === 0) {
      return;
    }

    await UserRole.bulkCreate(
      roles.map((role) => ({
        userId,
        roleId: role.roleId,
      })),
      { transaction }
    );
  }
}

export default new UserService();
