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
    email: 'superadmin@demo.com',
    password: 'superadmin123',
    firstName: 'Super',
    lastName: 'Admin',
    roleNames: ['super_admin'],
  },
  {
    email: 'admin@demo.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    roleNames: ['admin'],
  },
  {
    email: 'member@demo.com',
    password: 'member123',
    firstName: 'Regular',
    lastName: 'Member',
    roleNames: ['member'],
  },
];

export const seedUsersData = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding users...');

    // Ensure roles exist first
    const memberRole = await Role.findOne({ where: { name: 'member' } });
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });

    if (!memberRole || !adminRole || !superAdminRole) {
      throw new Error('Roles must be seeded before users. Please run role seed first.');
    }

    for (const userData of seedUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { email: userData.email },
      });

      if (existingUser) {
        // Get current roles from user_roles table
        const currentRoles = await UserService.getUserRoles(existingUser.userId);
        const expectedRoles = userData.roleNames.sort();
        const hasCorrectRoles = currentRoles.sort().join(',') === expectedRoles.join(',');

        if (!hasCorrectRoles) {
          // Update roles to match expected ones
          console.log(`🔄 User ${userData.email} exists but has different roles. Updating roles...`);
          console.log(`   Current: [${currentRoles.join(', ')}]`);
          console.log(`   Expected: [${expectedRoles.join(', ')}]`);
          
          await UserService.setRoles(existingUser.userId, userData.roleNames);
          console.log(`✅ Updated user: ${userData.email} with roles: ${userData.roleNames.join(', ')}`);
        } else {
          console.log(`⏭️  User ${userData.email} already exists with correct roles, skipping...`);
        }
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
