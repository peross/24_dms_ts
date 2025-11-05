import User from '../models/user.model';
import Role from '../models/role.model';
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
    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ where: { email: data.email } });
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    // Check if username is provided and if it already exists
    if (data.username) {
      const existingUserByUsername = await User.findOne({ where: { username: data.username } });
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
    });

    // Assign roles if provided
    if (data.roleNames && data.roleNames.length > 0) {
      await this.assignRoles(user.userId, data.roleNames);
    }

    // Remove password from response
    const userJson = user.toJSON();
    delete (userJson as any).password;

    return userJson as User;
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
    return await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });

    if (!user || !(user as any).roles) {
      return [];
    }

    return ((user as any).roles as Role[]).map((role) => role.name);
  }

  async assignRoles(userId: number, roleNames: string[]): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const roles = await Role.findAll({
      where: { name: roleNames },
    });

    if (roles.length !== roleNames.length) {
      throw new Error('One or more roles not found');
    }

    await (user as any).setRoles(roles);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await comparePassword(password, user.password);
  }

  async getUserProfile(userId: number): Promise<User | null> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });
    return user;
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
        if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
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
}

export default new UserService();
