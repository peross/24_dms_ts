import { sequelize } from '../config/database';

/**
 * Migration to add current_version column to files table
 */
export async function addCurrentVersionToFiles(): Promise<void> {
  try {
    console.log('🔄 Adding current_version column to files table...');

    // Try to add current_version column - catch duplicate column errors
    try {
      await sequelize.query(
        "ALTER TABLE files ADD COLUMN current_version INT NOT NULL DEFAULT 1 AFTER permissions"
      );
      console.log('✅ Added current_version column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  current_version column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Files table doesn\'t exist yet, column will be added when table is created');
        return;
      } else {
        throw error;
      }
    }

    console.log('✅ Migration completed!');
  } catch (error: any) {
    // Check if table doesn't exist - that's okay, sync will create it
    if (error.message?.includes("doesn't exist") || 
        error.message?.includes("Unknown table")) {
      console.log('⏭️  Files table doesn\'t exist yet, column will be added when table is created');
      return;
    }
    console.error('❌ Migration failed:', error.message || error);
    throw error;
  }
}

