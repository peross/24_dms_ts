import { sequelize } from '../config/database';

/**
 * Migration to add system_folder_type column to folders table
 * and initialize system folders for all existing users
 */
export async function addSystemFolderType(): Promise<void> {
  try {
    console.log('🔄 Adding system_folder_type column to folders table...');

    // Try to add system_folder_type column
    try {
      await sequelize.query(
        "ALTER TABLE folders ADD COLUMN system_folder_type ENUM('GENERAL', 'MY_FOLDERS', 'SHARED_WITH_ME') NULL DEFAULT NULL"
      );
      console.log('✅ Added system_folder_type column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  system_folder_type column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet, column will be added when table is created');
        return;
      } else {
        // Try MySQL syntax if PostgreSQL syntax fails
        try {
          await sequelize.query(
            "ALTER TABLE folders ADD COLUMN system_folder_type VARCHAR(20) NULL DEFAULT NULL"
          );
          console.log('✅ Added system_folder_type column (MySQL syntax)');
        } catch (mysqlError: any) {
          throw error; // Throw original error
        }
      }
    }

    // Initialize system folders for all existing users
    console.log('🔄 Initializing system folders for existing users...');
    const SystemFolderService = (await import('../services/system-folder.service')).default;
    const { QueryTypes } = await import('sequelize');
    
    // Get all user IDs
    const users = await sequelize.query<{ user_id: number }>(
      'SELECT user_id FROM users',
      { type: QueryTypes.SELECT }
    );

    // Initialize system folders for each user
    for (const user of users) {
      try {
        await SystemFolderService.initializeSystemFolders(user.user_id);
        console.log(`✅ Initialized system folders for user ${user.user_id}`);
      } catch (error: any) {
        console.error(`⚠️  Failed to initialize system folders for user ${user.user_id}:`, error.message);
      }
    }

    console.log('✅ Migration completed!');
  } catch (error: any) {
    // Check if table doesn't exist - that's okay, sync will create it
    if (error.message?.includes("doesn't exist") || 
        error.message?.includes("Unknown table")) {
      console.log('⏭️  Table doesn\'t exist yet, column will be added when table is created');
      return;
    }
    console.error('❌ Migration failed:', error.message || error);
    throw error;
  }
}
