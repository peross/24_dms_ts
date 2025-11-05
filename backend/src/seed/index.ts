import { connectDatabase, sequelize } from '../config/database';
import { setupAssociations } from '../models';
import { seedRolesData } from './role.seed';
import { seedUsersData } from './user.seed';
import dotenv from 'dotenv';

dotenv.config();

const runSeeds = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database seeding...');

    // Connect to database
    await connectDatabase();

    // Setup model associations
    setupAssociations();

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized.');

    // Run seeders in order
    await seedRolesData();
    await seedUsersData();

    console.log('🎉 All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

runSeeds();
