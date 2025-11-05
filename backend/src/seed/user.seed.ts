import User from '../models/user.model';
import Role from '../models/role.model';
import UserService from '../services/user.service';

export interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleNames: string[];
}

export const seedUsers: SeedUser[] = [
  {
    email: 'admin@demo.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    roleNames: ['admin'],
  },
  {
    email: 'user@demo.com',
    password: 'user123',
    firstName: 'Regular',
    lastName: 'User',
    roleNames: ['user'],
  },
];

export const seedUsersData = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding users...');

    // Ensure roles exist first
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const userRole = await Role.findOne({ where: { name: 'user' } });

    if (!adminRole || !userRole) {
      throw new Error('Roles must be seeded before users. Please run role seed first.');
    }

    for (const userData of seedUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user with roles
      await UserService.createUser({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roleNames: userData.roleNames,
      });

      console.log(`✅ Created user: ${userData.email} with roles: ${userData.roleNames.join(', ')}`);
    }

    console.log('✅ Users seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};
