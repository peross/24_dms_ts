import Role from '../models/role.model';

export interface SeedRole {
  name: string;
  description: string;
}

export const seedRoles: SeedRole[] = [
  {
    name: 'member',
    description: 'Regular member with basic access',
  },
  {
    name: 'admin',
    description: 'Administrator with elevated access',
  },
  {
    name: 'super_admin',
    description: 'Super administrator with full system access',
  },
];

export const seedRolesData = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding roles...');

    for (const roleData of seedRoles) {
      // Check if role already exists
      const existingRole = await Role.findOne({ where: { name: roleData.name } });

      if (existingRole) {
        console.log(`⏭️  Role ${roleData.name} already exists, skipping...`);
        continue;
      }

      // Create role
      await Role.create({
        name: roleData.name,
        description: roleData.description,
      });

      console.log(`✅ Created role: ${roleData.name}`);
    }

    console.log('✅ Roles seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
};

